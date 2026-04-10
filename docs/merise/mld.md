# MLD — Modèle Logique de Données
## SGSSA — DDI-MTNIMA

---

## Tables Relationnelles

### utilisateurs
```
utilisateurs (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe  VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','superviseur','technicien','lecteur')),
  est_actif     BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP
)
```

### racks
```
racks (
  id             SERIAL PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL,
  datacenter     VARCHAR(100) NOT NULL,
  localisation   VARCHAR(255),
  total_unites_u INTEGER NOT NULL DEFAULT 42,
  description    TEXT
)
```

### serveurs
```
serveurs (
  id                  SERIAL PRIMARY KEY,
  nom                 VARCHAR(100) NOT NULL,
  adresse_ip          VARCHAR(45) UNIQUE NOT NULL,
  systeme_exploitation VARCHAR(100),
  type                VARCHAR(20) CHECK (type IN ('physique','virtuel','cloud')),
  statut              VARCHAR(20) CHECK (statut IN ('actif','inactif','maintenance')),
  cpu_coeurs          INTEGER,
  ram_go              INTEGER,
  stockage_go         INTEGER,
  date_acquisition    DATE,
  description         TEXT,
  rack_id             INTEGER REFERENCES racks(id) ON DELETE SET NULL
)
```

### metriques_serveurs
```
metriques_serveurs (
  id                SERIAL PRIMARY KEY,
  serveur_id        INTEGER NOT NULL REFERENCES serveurs(id) ON DELETE CASCADE,
  utilisation_cpu   FLOAT CHECK (utilisation_cpu BETWEEN 0 AND 100),
  utilisation_ram   FLOAT CHECK (utilisation_ram BETWEEN 0 AND 100),
  utilisation_disque FLOAT CHECK (utilisation_disque BETWEEN 0 AND 100),
  uptime_secondes   BIGINT,
  horodatage        TIMESTAMP DEFAULT NOW()
)
```

### logiciels
```
logiciels (
  id                      SERIAL PRIMARY KEY,
  nom                     VARCHAR(200) NOT NULL,
  version                 VARCHAR(50),
  type_licence            VARCHAR(20) CHECK (type_licence IN ('libre','commercial','oem')),
  editeur                 VARCHAR(100),
  date_installation       DATE,
  date_expiration_licence DATE,
  serveur_id              INTEGER NOT NULL REFERENCES serveurs(id) ON DELETE CASCADE
)
```

### applications_web
```
applications_web (
  id              SERIAL PRIMARY KEY,
  nom             VARCHAR(200) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  port            INTEGER,
  technologie     VARCHAR(50),
  statut          VARCHAR(20) CHECK (statut IN ('en_ligne','hors_ligne','maintenance')),
  description     TEXT,
  date_deploiement DATE,
  serveur_id      INTEGER NOT NULL REFERENCES serveurs(id) ON DELETE CASCADE
)
```

### certificats_ssl
```
certificats_ssl (
  id             SERIAL PRIMARY KEY,
  domaine        VARCHAR(255) NOT NULL,
  emetteur       VARCHAR(255),
  algorithme     VARCHAR(50),
  date_emission  DATE NOT NULL,
  date_expiration DATE NOT NULL,
  statut         VARCHAR(20) CHECK (statut IN ('valide','expire','revoque')),
  chemin_fichier VARCHAR(500),
  application_id INTEGER UNIQUE REFERENCES applications_web(id) ON DELETE SET NULL
)
```

### journaux_evenements
```
journaux_evenements (
  id               SERIAL PRIMARY KEY,
  utilisateur_id   INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action           VARCHAR(100) NOT NULL,
  details          TEXT,
  adresse_ip_client VARCHAR(45),
  horodatage       TIMESTAMP DEFAULT NOW()
)
```

---

## Clés Étrangères (Résumé)

| Table | Clé Étrangère | Référence |
|-------|--------------|-----------|
| serveurs | rack_id | racks(id) |
| metriques_serveurs | serveur_id | serveurs(id) |
| logiciels | serveur_id | serveurs(id) |
| applications_web | serveur_id | serveurs(id) |
| certificats_ssl | application_id | applications_web(id) |
| journaux_evenements | utilisateur_id | utilisateurs(id) |
