# MCD — Modèle Conceptuel de Données
## SGSSA — DDI-MTNIMA

---

## Entités et Attributs

### UTILISATEUR
- `id_utilisateur` (PK)
- `nom`
- `prenom`
- `email`
- `mot_de_passe` (hashé)
- `role` (Admin / Superviseur / Technicien / Lecteur)
- `est_actif`
- `date_creation`
- `derniere_connexion`

### RACK
- `id_rack` (PK)
- `nom`
- `datacenter`
- `localisation`
- `total_unites_u`
- `description`

### SERVEUR
- `id_serveur` (PK)
- `nom`
- `adresse_ip`
- `systeme_exploitation`
- `type` (Physique / Virtuel / Cloud)
- `statut` (Actif / Inactif / Maintenance)
- `cpu_coeurs`
- `ram_go`
- `stockage_go`
- `date_acquisition`
- `description`

### METRIQUE_SERVEUR
- `id_metrique` (PK)
- `utilisation_cpu` (%)
- `utilisation_ram` (%)
- `utilisation_disque` (%)
- `uptime_secondes`
- `horodatage`

### LOGICIEL
- `id_logiciel` (PK)
- `nom`
- `version`
- `type_licence` (Libre / Commercial / OEM)
- `editeur`
- `date_installation`
- `date_expiration_licence`

### APPLICATION_WEB
- `id_application` (PK)
- `nom`
- `url`
- `port`
- `technologie` (PHP / Python / Node.js / Java / .NET)
- `statut` (En ligne / Hors ligne / Maintenance)
- `description`
- `date_deploiement`

### CERTIFICAT_SSL
- `id_certificat` (PK)
- `domaine`
- `emetteur`
- `algorithme`
- `date_emission`
- `date_expiration`
- `statut` (Valide / Expiré / Révoqué)
- `chemin_fichier`

### JOURNAL_EVENEMENT
- `id_journal` (PK)
- `action`
- `details`
- `adresse_ip_client`
- `horodatage`

---

## Associations et Cardinalités

```
UTILISATEUR ──(1,n)── EFFECTUE ──(0,n)── JOURNAL_EVENEMENT

RACK ──(1,1)── CONTIENT ──(0,n)── SERVEUR

SERVEUR ──(1,1)── GENERE ──(0,n)── METRIQUE_SERVEUR

SERVEUR ──(1,1)── HEBERGE_LOGICIEL ──(0,n)── LOGICIEL

SERVEUR ──(1,1)── HEBERGE_APP ──(0,n)── APPLICATION_WEB

APPLICATION_WEB ──(0,1)── SECURISE_PAR ──(0,1)── CERTIFICAT_SSL
```

---

## Règles de Gestion

1. Un serveur appartient à un et un seul rack
2. Un rack peut contenir plusieurs serveurs (0 à N)
3. Un serveur peut héberger plusieurs logiciels
4. Un serveur peut héberger plusieurs applications web
5. Une application web peut avoir au plus un certificat SSL actif
6. Un certificat SSL est associé à au plus une application web
7. Chaque action utilisateur est journalisée (création, modification, suppression)
8. Un utilisateur a un seul rôle à la fois
