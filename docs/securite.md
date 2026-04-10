# Sécurité et Bonnes Pratiques — SGSSA
## DDI-MTNIMA | Étape 10

---

## Identification des Failles Potentielles et Solutions Mises en Place

---

### Faille 1 — Injection SQL

**Description de la faille :**
Les injections SQL surviennent lorsque des données utilisateur non validées sont concaténées directement dans des requêtes SQL. Exemple d'attaque :
```sql
-- Requête vulnérable (non utilisée dans SGSSA)
SELECT * FROM serveurs WHERE nom = '" + nom_saisi + "'
-- Un attaquant peut saisir : ' OR '1'='1 pour exfiltrer des données
```

**Solution implémentée :**
- ✅ **Utilisation exclusive de l'ORM Django** : Aucune requête SQL brute n'est construite par concaténation.
- ✅ **Paramétrage automatique** : L'ORM Django utilise des requêtes préparées (parameterized queries) via psycopg2.
- ✅ **Exemples dans le code** :
```python
# CORRECT — ORM Django (paramétré automatiquement)
Server.objects.filter(nom=nom_saisi, statut='actif')
# Générée en SQL : SELECT ... WHERE nom = %s AND statut = %s

# JAMAIS FAIT — concaténation dangereuse
cursor.execute(f"SELECT * FROM serveurs WHERE nom = '{nom_saisi}'")
```
- ✅ **django-filter** utilisé pour filtres complexes — paramétré automatiquement.
- ✅ **Validation des entrées** via DRF serializers avant tout accès à la BDD.

**Vérification :**
```bash
python manage.py shell -c "
from django.db import connection
# Tenter une injection dans le filtre ORM
from apps.servers.models import Server
Server.objects.filter(nom=\"' OR '1'='1\")
# Résultat: requête vide, pas d'injection possible
"
```

---

### Faille 2 — Authentification et Contrôle d'Accès (RBAC)

**Description de la faille :**
Sans contrôle d'accès strict, un utilisateur de faible privilège peut accéder à des ressources sensibles (lecture de mots de passe, suppression de serveurs, gestion d'utilisateurs).

**Solution implémentée :**
- ✅ **Authentification JWT systématique** : Toutes les routes API exigent un token JWT valide.
- ✅ **Système RBAC à 4 niveaux** : Lecteur < Technicien < Superviseur < Admin
- ✅ **Permissions dédiées** (`apps/authentication/permissions.py`) :
```python
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'

class IsTechnicienOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True  # Tous les authentifiés peuvent lire
        return request.user.role in ['admin', 'superviseur', 'technicien']
```
- ✅ **Blacklist des tokens** : À la déconnexion, le refresh token est invalidé via `rest_framework_simplejwt.token_blacklist`.
- ✅ **HTTPS forcé** en production (`SECURE_SSL_REDIRECT = True`).
- ✅ **Durée de vie courte** des access tokens (60 minutes).

---

### Faille 3 — Cross-Site Scripting (XSS) / CSRF

**Description :**
Les attaques XSS injectent du code JavaScript malicieux dans l'interface. CSRF exploite des requêtes non autorisées.

**Solutions :**
- ✅ **Headers sécurité HTTP** configurés :
```python
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
```
- ✅ **React/Next.js** échappe automatiquement toutes les sorties HTML (pas de `dangerouslySetInnerHTML`).
- ✅ **API-only** : Pas de rendu de templates Django côté serveur, pas de risque CSRF traditionnel.
- ✅ **CORS strict** : Seules les origines listées dans `CORS_ALLOWED_ORIGINS` sont acceptées.

---

### Faille 4 — Exposition de Données Sensibles

**Description :**
Mots de passe en clair, tokens dans les logs, données sensibles exposées dans les réponses API.

**Solutions :**
- ✅ **Hachage des mots de passe** : Django utilise PBKDF2-SHA256 (paramètre par défaut).
- ✅ **Champs `write_only`** dans les serializers JWT : Les mots de passe ne reviennent jamais dans les réponses.
- ✅ **Variables d'environnement** : Toutes les clés secrètes dans `.env` (jamais dans le code).
- ✅ **`DEBUG=False`** en production (pas de tracebacks exposés).
- ✅ **Tokens non loggés** : Les loggers SGSSA évitent d'enregistrer les tokens JWT.

---

## Journalisation des Événements (Audit Log)

### Événements journalisés

| Action | Déclencheur | Données enregistrées |
|--------|-------------|---------------------|
| `LOGIN` | Connexion réussie | Email, IP, timestamp |
| `LOGOUT` | Déconnexion | Email, IP |
| `CHANGE_PASSWORD` | Modification mot de passe | Email, IP |
| `CREATE_SERVER` | Ajout d'un serveur | Admin, nom, IP |
| `UPDATE_SERVER` | Modification serveur | Admin, nom |
| `DELETE_SERVER` | Suppression serveur | Admin, nom |
| `CREATE_CERT` | Nouveau certificat | Admin, domaine |
| `UPDATE_CERT` | Renouvellement SSL | Admin, domaine |
| `CREATE_USER` | Création compte | Admin, email |
| `ACTIVATE/DEACTIVATE` | Statut compte | Admin, email cible |

### Implémentation

```python
# apps/dashboard/utils.py
def log_event(user, action, details='', request=None):
    """Enregistre un événement dans le journal d'audit."""
    EventLog.objects.create(
        utilisateur=user,
        action=action,
        details=details,
        adresse_ip_client=get_client_ip(request),
    )
```

### Logs systèmes (fichiers)

```
backend/logs/
├── sgssa.log        # Logs applicatifs généraux
└── security.log     # Événements de sécurité
```

Format de log :
```
[2025-03-15 14:23:11] INFO sgssa.security [AUDIT] LOGIN: Connexion depuis 196.200.1.15
[2025-03-15 14:31:05] WARNING sgssa.security WebSocket auth failed: Token expired
```

---

## Checklist Sécurité

- [x] Pas de concaténation SQL — ORM Django exclusif
- [x] Toutes les routes protégées par JWT
- [x] RBAC à 4 niveaux implémenté
- [x] Mots de passe hachés (PBKDF2-SHA256)
- [x] Tokens blacklistés à la déconnexion
- [x] Headers sécurité HTTP (HSTS, XSS, CSRF)
- [x] CORS strict
- [x] Rate limiting API (10 req/min anonyme, 200/min authentifié)
- [x] Secrets dans `.env` (hors dépôt Git)
- [x] Logging complet des actions sensibles
- [x] HTTPS forcé en production
- [x] `DEBUG=False` en production
