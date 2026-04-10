# MPD — Modèle Physique de Données
## SGSSA — DDI-MTNIMA
### SGBD cible : PostgreSQL 15+

---

## Optimisations Physiques

### Index créés

```sql
-- Performance des requêtes fréquentes
CREATE INDEX idx_serveurs_statut ON serveurs(statut);
CREATE INDEX idx_serveurs_rack_id ON serveurs(rack_id);
CREATE INDEX idx_metriques_serveur_id ON metriques_serveurs(serveur_id);
CREATE INDEX idx_metriques_horodatage ON metriques_serveurs(horodatage DESC);
CREATE INDEX idx_logiciels_serveur_id ON logiciels(serveur_id);
CREATE INDEX idx_apps_serveur_id ON applications_web(serveur_id);
CREATE INDEX idx_certs_expiration ON certificats_ssl(date_expiration);
CREATE INDEX idx_journaux_utilisateur ON journaux_evenements(utilisateur_id);
CREATE INDEX idx_journaux_horodatage ON journaux_evenements(horodatage DESC);
```

### Partitionnement

La table `metriques_serveurs` sera partitionnée par mois pour optimiser les requêtes historiques :

```sql
CREATE TABLE metriques_serveurs (
  ...
) PARTITION BY RANGE (horodatage);

CREATE TABLE metriques_2024_01 PARTITION OF metriques_serveurs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- (partitions créées automatiquement via trigger ou pg_partman)
```

### Contraintes d'intégrité supplémentaires

```sql
-- Unicité adresse IP par serveur
ALTER TABLE serveurs ADD CONSTRAINT uq_serveur_ip UNIQUE (adresse_ip);

-- Un seul certificat par application
ALTER TABLE certificats_ssl ADD CONSTRAINT uq_cert_app UNIQUE (application_id);

-- Email utilisateur unique
ALTER TABLE utilisateurs ADD CONSTRAINT uq_utilisateur_email UNIQUE (email);
```

### Vues Matérialisées

```sql
-- Vue tableau de bord (rafraîchie toutes les 5 minutes)
CREATE MATERIALIZED VIEW vue_dashboard AS
SELECT
  (SELECT COUNT(*) FROM serveurs WHERE statut = 'actif') AS serveurs_actifs,
  (SELECT COUNT(*) FROM serveurs WHERE statut = 'inactif') AS serveurs_inactifs,
  (SELECT COUNT(*) FROM applications_web WHERE statut = 'en_ligne') AS apps_en_ligne,
  (SELECT COUNT(*) FROM certificats_ssl WHERE date_expiration <= NOW() + INTERVAL '30 days') AS certs_expirant_bientot,
  (SELECT COUNT(*) FROM certificats_ssl WHERE date_expiration <= NOW()) AS certs_expires,
  (SELECT COUNT(*) FROM logiciels) AS total_logiciels,
  NOW() AS derniere_maj;

CREATE UNIQUE INDEX ON vue_dashboard(derniere_maj);
```

---

## Taille Estimée

| Table | Lignes estimées | Taille estimée |
|-------|----------------|----------------|
| utilisateurs | 50 | < 1 MB |
| racks | 20 | < 1 MB |
| serveurs | 200 | < 5 MB |
| metriques_serveurs | 10 millions/an | ~2 GB/an |
| logiciels | 2 000 | < 5 MB |
| applications_web | 500 | < 2 MB |
| certificats_ssl | 500 | < 1 MB |
| journaux_evenements | 500 000/an | ~100 MB/an |
