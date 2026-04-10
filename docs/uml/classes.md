# UML — Diagramme de Classes
## SGSSA — DDI-MTNIMA

---

## Diagramme de Classes (Notation textuelle)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SGSSA — Classes                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│  <<AbstractUser>>    │         │    EventLog           │
│  User                │         │──────────────────────│
│──────────────────────│         │ + id: int             │
│ + id: int            │────────>│ + action: str         │
│ + username: str      │  écrit  │ + details: str        │
│ + email: str         │         │ + ip_client: str      │
│ + nom: str           │         │ + horodatage: datetime│
│ + prenom: str        │         └──────────────────────┘
│ + role: RoleEnum     │
│ + est_actif: bool    │
│ + date_creation: dt  │
│──────────────────────│
│ + get_full_name()    │
│ + has_permission()   │
└──────────────────────┘

      RoleEnum
   ┌──────────────┐
   │ ADMIN        │
   │ SUPERVISEUR  │
   │ TECHNICIEN   │
   │ LECTEUR      │
   └──────────────┘

┌──────────────────────┐         ┌──────────────────────────────┐
│   Rack               │         │   Server                     │
│──────────────────────│  1    * │──────────────────────────────│
│ + id: int            │<────────│ + id: int                    │
│ + nom: str           │contient │ + nom: str                   │
│ + datacenter: str    │         │ + adresse_ip: str            │
│ + localisation: str  │         │ + systeme_exploitation: str  │
│ + total_unites_u: int│         │ + type: TypeEnum             │
│ + description: str   │         │ + statut: StatutEnum         │
│──────────────────────│         │ + cpu_coeurs: int            │
│ + get_usage_percent()│         │ + ram_go: int                │
│ + get_servers_count()│         │ + stockage_go: int           │
└──────────────────────┘         │ + date_acquisition: date     │
                                 │ + rack: Rack                 │
                                 │──────────────────────────────│
                                 │ + is_online(): bool          │
                                 │ + get_latest_metric()        │
                                 │ + get_apps_count(): int      │
                                 └──────────────────────────────┘
                                            │           │
                         ┌──────────────────┘           └─────────────────┐
                         │ 1..*                                        1..* │
                         ▼                                                  ▼
          ┌────────────────────────┐              ┌──────────────────────────┐
          │  ServerMetric          │              │  Software                │
          │────────────────────────│              │──────────────────────────│
          │ + id: int              │              │ + id: int                │
          │ + serveur: Server      │              │ + nom: str               │
          │ + cpu_usage: float     │              │ + version: str           │
          │ + ram_usage: float     │              │ + type_licence: str      │
          │ + disk_usage: float    │              │ + editeur: str           │
          │ + uptime_sec: bigint   │              │ + date_installation: date│
          │ + horodatage: datetime │              │ + date_expiration: date  │
          │────────────────────────│              │ + serveur: Server        │
          │ + is_critical(): bool  │              │──────────────────────────│
          └────────────────────────┘              │ + is_licence_expired()   │
                                                  └──────────────────────────┘

┌──────────────────────────────┐         ┌──────────────────────────────┐
│  WebApplication              │  0..1   │  SSLCertificate              │
│──────────────────────────────│<────────│──────────────────────────────│
│ + id: int                    │sécurisé │ + id: int                    │
│ + nom: str                   │   par   │ + domaine: str               │
│ + url: str                   │         │ + emetteur: str              │
│ + port: int                  │         │ + algorithme: str            │
│ + technologie: str           │         │ + date_emission: date        │
│ + statut: StatutEnum         │         │ + date_expiration: date      │
│ + date_deploiement: date     │         │ + statut: CertStatutEnum     │
│ + serveur: Server            │         │ + application: WebApplication│
│──────────────────────────────│         │──────────────────────────────│
│ + is_online(): bool          │         │ + days_until_expiry(): int   │
│ + get_cert_status(): str     │         │ + is_expired(): bool         │
└──────────────────────────────┘         │ + get_alert_level(): str     │
                                         └──────────────────────────────┘

TypeEnum: physique | virtuel | cloud
StatutEnum (Server/App): actif/en_ligne | inactif/hors_ligne | maintenance
CertStatutEnum: valide | expire | revoque
```

---

## Relations (Résumé)

| Classe | Relation | Classe | Cardinalité |
|--------|----------|--------|-------------|
| Rack | contient | Server | 1 → 0..* |
| Server | génère | ServerMetric | 1 → 0..* |
| Server | héberge | Software | 1 → 0..* |
| Server | héberge | WebApplication | 1 → 0..* |
| WebApplication | sécurisée par | SSLCertificate | 1 → 0..1 |
| User | écrit | EventLog | 1 → 0..* |

---

## Responsabilités des Classes

| Classe | Responsabilité principale |
|--------|--------------------------|
| `User` | Authentification, autorisation basée sur les rôles |
| `Rack` | Organisation physique des serveurs |
| `Server` | Représentation d'un serveur (physique ou virtuel) |
| `ServerMetric` | Stockage des métriques de performance en temps réel |
| `Software` | Inventaire des logiciels installés sur un serveur |
| `WebApplication` | Gestion des applications web hébergées |
| `SSLCertificate` | Suivi des certificats SSL et alertes d'expiration |
| `EventLog` | Journalisation des actions utilisateurs (audit) |
