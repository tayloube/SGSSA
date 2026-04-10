# UML — Diagrammes de Séquence
## SGSSA — DDI-MTNIMA

---

## Scénario 1 — Authentification JWT (Login)

```
Utilisateur       Frontend (Next.js)      Backend (DRF)          Base de données
    │                    │                      │                        │
    │  Saisit email      │                      │                        │
    │  + mot de passe    │                      │                        │
    │───────────────────>│                      │                        │
    │                    │  POST /api/auth/login/│                        │
    │                    │  {email, password}   │                        │
    │                    │─────────────────────>│                        │
    │                    │                      │  SELECT * FROM         │
    │                    │                      │  utilisateurs          │
    │                    │                      │  WHERE email=...       │
    │                    │                      │───────────────────────>│
    │                    │                      │                        │
    │                    │                      │   Retourne user        │
    │                    │                      │<───────────────────────│
    │                    │                      │                        │
    │                    │                      │  Vérifie mot de passe  │
    │                    │                      │  check_password()      │
    │                    │                      │─────────────┐          │
    │                    │                      │             │          │
    │                    │                      │<────────────┘          │
    │                    │                      │                        │
    │                    │                      │  INSERT journal_events │
    │                    │                      │  (action: LOGIN)       │
    │                    │                      │───────────────────────>│
    │                    │                      │                        │
    │                    │  200 OK              │                        │
    │                    │  {access_token,      │                        │
    │                    │   refresh_token,     │                        │
    │                    │   user_info}         │                        │
    │                    │<─────────────────────│                        │
    │                    │                      │                        │
    │  Stocke tokens     │                      │                        │
    │  (localStorage)    │                      │                        │
    │                    │                      │                        │
    │  Redirige vers     │                      │                        │
    │  Dashboard         │                      │                        │
    │<───────────────────│                      │                        │

[Cas d'erreur: mot de passe incorrect]
    │                    │  401 Unauthorized    │                        │
    │                    │  {error: "Invalid    │                        │
    │                    │   credentials"}      │                        │
    │                    │<─────────────────────│                        │
    │  Affiche message   │                      │                        │
    │  d'erreur          │                      │                        │
    │<───────────────────│                      │                        │
```

---

## Scénario 2 — Renouvellement Certificat SSL (avec autorisation)

```
Admin             Frontend (Next.js)      Backend (DRF)          Base de données
  │                    │                      │                        │
  │  Clique            │                      │                        │
  │  "Modifier cert"   │                      │                        │
  │───────────────────>│                      │                        │
  │                    │  PUT /api/certs/{id}/│                        │
  │                    │  Authorization:      │                        │
  │                    │  Bearer <JWT>        │                        │
  │                    │─────────────────────>│                        │
  │                    │                      │  Vérifie JWT token     │
  │                    │                      │─────────────┐          │
  │                    │                      │             │          │
  │                    │                      │<────────────┘          │
  │                    │                      │                        │
  │                    │                      │  Vérifie rôle=ADMIN    │
  │                    │                      │─────────────┐          │
  │                    │                      │             │          │
  │                    │                      │<────────────┘          │
  │                    │                      │                        │
  │                    │                      │  UPDATE certificats_ssl│
  │                    │                      │  SET date_expiration,  │
  │                    │                      │      statut='valide'   │
  │                    │                      │───────────────────────>│
  │                    │                      │                        │
  │                    │                      │  INSERT journal_events │
  │                    │                      │  (action: UPDATE_CERT) │
  │                    │                      │───────────────────────>│
  │                    │                      │                        │
  │                    │  200 OK              │                        │
  │                    │  {certificat mis     │                        │
  │                    │   à jour}            │                        │
  │                    │<─────────────────────│                        │
  │  Toast "Certificat │                      │                        │
  │  mis à jour"       │                      │                        │
  │<───────────────────│                      │                        │

[Cas d'erreur: rôle insuffisant]
  │                    │  403 Forbidden       │                        │
  │                    │  {error: "Permission │                        │
  │                    │   insuffisante"}     │                        │
  │                    │<─────────────────────│                        │
```

---

## Scénario 3 — Streaming Métriques Temps Réel (WebSocket)

```
Superviseur       Frontend (Next.js)      Backend (Channels)     Simulation/Agent
    │                    │                      │                        │
    │  Ouvre page        │                      │                        │
    │  Serveur /id       │                      │                        │
    │───────────────────>│                      │                        │
    │                    │  WS: ws://api/ws/    │                        │
    │                    │  servers/{id}/       │                        │
    │                    │─────────────────────>│                        │
    │                    │                      │  Authentifie token     │
    │                    │                      │  dans handshake        │
    │                    │                      │─────────────┐          │
    │                    │                      │             │          │
    │                    │                      │<────────────┘          │
    │                    │                      │                        │
    │                    │  ✓ Connexion établie │                        │
    │                    │<─────────────────────│                        │
    │                    │                      │                        │
    │                    │                      │  Toutes les 10s:       │
    │                    │                      │  Génère métriques      │
    │                    │                      │<───────────────────────│
    │                    │                      │  {cpu, ram, disk,      │
    │                    │                      │   uptime}              │
    │                    │                      │                        │
    │                    │  Push metrics:       │                        │
    │                    │  {cpu: 45.2,         │                        │
    │                    │   ram: 67.8,         │                        │
    │                    │   disk: 23.1}        │                        │
    │                    │<─────────────────────│                        │
    │  Graphes mis       │                      │                        │
    │  à jour            │                      │                        │
    │<───────────────────│                      │                        │
    │    ...             │      ...             │          ...           │
    │  (répété toutes    │                      │                        │
    │   les 10 secondes) │                      │                        │
```
