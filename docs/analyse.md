# SGSSA — Analyse Fonctionnelle
## Système de Gestion et de Supervision des Serveurs et Applications
### DDI-MTNIMA — Direction du Développement et de l'Interopérabilité

---

## 1. Contexte du Projet

La Direction du Développement et de l'Interopérabilité (DDI), relevant du Ministère de la Transformation Numérique, de l'Innovation et de la Modernisation de l'Administration (MTNIMA) en Mauritanie, est responsable du pilotage technique des systèmes d'information de l'État. Elle gère un parc informatique composé de nombreux serveurs physiques et virtuels, hébergeant des applications web critiques et des services numériques gouvernementaux.

Face à la croissance du parc serveur et à la multiplication des applications hébergées, la DDI se trouve confrontée à des défis majeurs : absence d'outil centralisé de supervision, difficulté à suivre les certificats SSL et leurs dates d'expiration, manque de visibilité sur les logiciels installés, et complexité de la gestion des accès utilisateurs.

Le projet SGSSA vise à concevoir et développer une plateforme web sécurisée, moderne et ergonomique permettant à la DDI de piloter l'ensemble de son infrastructure informatique depuis une interface unique.

---

## 2. Acteurs / Utilisateurs

| Acteur | Rôle | Permissions |
|--------|------|-------------|
| **Administrateur Système** | Gestion complète du système | CRUD complet sur toutes les ressources, gestion des utilisateurs |
| **Superviseur** | Surveillance et rapports | Lecture + modification des statuts, génération de rapports |
| **Technicien** | Gestion opérationnelle | CRUD sur serveurs, logiciels, applications ; lecture sur certificats |
| **Lecteur** | Consultation uniquement | Lecture seule sur toutes les ressources |

---

## 3. Données d'Entrée et de Sortie

### Données d'Entrée

| Entité | Données saisies |
|--------|----------------|
| Authentification | Login, mot de passe |
| Serveur | Nom, adresse IP, OS, type (physique/VM), RAM, CPU, stockage, rack |
| Rack | Nom, datacenter, localisation, nombre d'unités U |
| Logiciel | Nom, version, licence, date d'installation, serveur hôte |
| Application Web | Nom, URL, port, technologie, serveur hôte |
| Certificat SSL | Domaine, émetteur (CA), date d'émission, date d'expiration |
| Utilisateur | Nom, prénom, email, rôle, statut actif |

### Données de Sortie

| Sortie | Description |
|--------|-------------|
| Tableau de bord | Statistiques globales : nombre de serveurs actifs/inactifs, applications, certificats expirant |
| Rapports serveurs | État, métriques CPU/RAM/Disk en temps réel |
| Alertes | Certificats SSL expirant dans 30/7/1 jours |
| Inventaire | Liste paginée, filtrée et exportable des ressources |
| Journaux | Historique des actions utilisateurs (audit log) |

---

## 4. Scénarios d'Utilisation

### Scénario 1 — Surveillance d'un Serveur Critique

**Acteur** : Superviseur  
**Précondition** : Le superviseur est authentifié dans le système  
**Déclencheur** : Une alerte apparaît sur le tableau de bord indiquant qu'un serveur a un taux d'utilisation CPU > 90%

**Déroulement** :
1. Le superviseur accède au tableau de bord et visualise les indicateurs d'alerte
2. Il clique sur la carte du serveur concerné pour accéder à sa fiche détaillée
3. Le système affiche en temps réel les métriques : CPU, RAM, Disk, statut de service
4. Le superviseur consulte l'historique des métriques (graphe sur 24h)
5. Il identifie l'application web responsable de la surcharge
6. Il crée un ticket de suivi via la fiche de l'application concernée
7. Il notifie le technicien responsable

**Résultat** : Le superviseur a identifié et documenté l'incident

---

### Scénario 2 — Renouvellement d'un Certificat SSL Expirant

**Acteur** : Administrateur Système  
**Précondition** : L'administrateur est authentifié  
**Déclencheur** : Le système génère une alerte : certificat SSL du portail e-services expirant dans 7 jours

**Déroulement** :
1. L'administrateur reçoit l'alerte sur le tableau de bord dans la section "Certificats SSL"
2. Il clique sur le certificat pour voir les détails (domaine, émetteur, dates)
3. Il génère un nouveau certificat SSL auprès de l'autorité de certification
4. Il met à jour les informations du certificat dans SGSSA (nouvelle date d'expiration, nouveau fichier)
5. Le système enregistre la modification avec horodatage et identité de l'auteur
6. L'alerte disparaît du tableau de bord

**Résultat** : Le certificat est renouvelé, tracé et le risque d'interruption de service est écarté
