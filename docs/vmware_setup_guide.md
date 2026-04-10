# Guide de Configuration SGSSA sur VMware Workstation Player 17

Ce guide vous aide à créer votre serveur Ubuntu et à déployer le projet SGSSA.

## 1. Téléchargement d'Ubuntu
Si vous ne l'avez pas déjà :
- Téléchargez **Ubuntu Server 22.04 LTS (ISO)** sur [ubuntu.com](https://ubuntu.com/download/server).

## 2. Création de la machine virtuelle dans VMware
1. Ouvrez **VMware Workstation Player 17**.
2. Cliquez sur **"Create a New Virtual Machine"**.
3. Sélectionnez **"Installer disc image file (iso)"** et parcourez pour trouver votre fichier ISO Ubuntu.
4. **Information Personnalisée** :
   - Full Name: `Admin SGSSA`
   - User name: `sgssa`
   - Password: `votre_mot_de_passe`
5. **Hardware recommandé** :
   - RAM: **4 GB** (minimum 2 GB).
   - CPU: **2 Cores**.
   - Disk: **20 GB**.
6. **Network Adapter** : Assurez-vous qu'il est en mode **"Bridged"** ou **"NAT"**.

## 3. Installation d'Ubuntu
Suivez les étapes par défaut à l'écran. Une fois l'installation terminée, la VM redémarrera.

## 4. Déploiement du Projet
Une fois que vous avez accès au terminal de votre serveur Ubuntu :

### A. Transférer le projet
Le plus simple est d'utiliser Git (si votre repo est en ligne) ou WinSCP pour copier le dossier `SGSSA` de Windows vers Ubuntu.

### B. Lancer le script automatique
Dans le terminal Ubuntu, naviguez dans le dossier du projet et lancez :

```bash
# Rendre le script exécutable
chmod +x deploy_ubuntu.sh

# Lancer le déploiement
./deploy_ubuntu.sh
```

## 5. Accès au Tableau de Bord
Le script affichera l'adresse IP de votre serveur. Sur votre navigateur Windows, entrez simplement cette adresse IP :
- Exemple : `http://192.168.1.50`

---
**Note** : Pour vous connecter à l'interface, utilisez les identifiants configurés dans le projet :
- **Email** : `admin@ddi.gov.mr`
- **Mot de passe** : `Admin@12345`
