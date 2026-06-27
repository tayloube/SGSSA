# SGSSA — Système de Gestion et de Supervision des Serveurs et Applications

![Static Badge](https://img.shields.io/badge/Status-Project_Ready-brightgreen)
![Django](https://img.shields.io/badge/Backend-Django_4.x-092e20)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-000000)

**SGSSA** est une solution complète de monitoring et d'administration d'infrastructure IT, développée pour la DDI-MTNIMA par **Ahmed Taleb Tolba**. Elle permet de centraliser la surveillance des serveurs physiques et virtuels, des applications web et du matériel réseau.

## 🚀 Fonctionnalités Clés

-   **Dashboard Temps Réel** : Visualisation instantanée de l'état de santé du parc informatique.
-   **Monitoring Avancé** : Suivi du CPU, RAM, Température et Disque via des agents distants.
-   **Surveillance Visuelle** : Flux de captures d'écran toutes les 5 minutes pour chaque serveur.
-   **Gestion des Ressources** : Inventaire des Racks, des Logiciels installés et des Certificats SSL.
-   **Alertes Instantanées** : Détection de perte de connexion en moins de 15 secondes via WebSockets.
-   **Audit & Sécurité** : Authentification JWT, gestion fine des rôles et logs d'événements.

## 🛠️ Stack Technique

### Backend
- **Framework** : Django, Django REST Framework
- **Asynchrone** : Django Channels & Daphne
- **Communication** : WebSockets (Real-time updates)
- **Base de données** : SQLite (Developpement) / PostgreSQL (Production ready)
- **Cache/Socket Layer** : Redis

### Frontend
- **Framework** : Next.js 14 (App Router)
- **Style** : Tailwind CSS & Lucide Icons
- **Graphs** : Recharts
- **Notifications** : React Hot Toast

### Agent Distant
- **Langage** : Python 3.x
- **Librairies** : `psutil`, `requests`

## 📦 Installation

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Agent (sur le serveur distant)
```bash
pip install psutil requests
# Modifier SERVER_ID et BACKEND_URL dans sgssa_agent.py
python sgssa_agent.py
```

## 📊 Documentation
Le rapport complet de projet est disponible ici : [docs/PFE Ahmed Taleb Tolba.docx](docs/PFE Ahmed Taleb Tolba.docx)

---
**Développé par Ahmed Taleb Tolba**
