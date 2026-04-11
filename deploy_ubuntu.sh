#!/bin/bash

# ==============================================================================
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE SGSSA — UBUNTU SERVER
# ==============================================================================

set -e

echo "🚀 Démarrage du déploiement SGSSA..."

# 1. Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Installation de Docker (si absent)
if ! [ -x "$(command -v docker)" ]; then
    echo "🐳 Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installé."
else
    echo "✅ Docker est déjà installé."
fi

# 3. Vérification de Docker Compose
if ! docker compose version > /dev/null 2>&1; then
    echo "🛠️ Installation de Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 4. Configuration de l'environnement
echo "⚙️ Configuration de l'environnement..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    # Génération de secrets aléatoires
    SECRET=$(openssl rand -base64 32)
    DB_PASS=$(openssl rand -base64 24)
    sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET|" backend/.env
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASS|" backend/.env
    echo "✅ Fichier .env créé avec des secrets sécurisés."
fi

# 5. Lancement des conteneurs
echo "🚢 Lancement des services avec Docker Compose..."
sudo docker compose up -d --build

echo ""
echo "=================================================================="
echo "✨ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "=================================================================="
echo "Accès au système :"
echo "  - Interface Web : http://$(hostname -I | awk '{print $1}')"
echo "  - Backend API   : http://$(hostname -I | awk '{print $1}')/api/"
echo "=================================================================="
echo "Note: Si Docker ne répond pas immédiatement, essayez de vous"
echo "reconnecter à votre session SSH pour activer les permissions."
