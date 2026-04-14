import os
import time
import json
import requests
import psutil
import socket

# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────
# Remplacez par l'IP de votre Windows (ex: 10.0.2.2 dans VirtualBox)
BACKEND_BASE_URL = "http://10.0.2.2:8000" 
SERVER_ID = 2  # L'ID du serveur dans le Dashboard (Corrigé: Ubuntu VM est l'ID 2)
INTERVAL = 10  # Secondes entre chaque rapport

def get_cpu_temp():
    """Tente de récupérer la température du CPU."""
    try:
        temps = psutil.sensors_temperatures()
        if 'coretemp' in temps:
            return temps['coretemp'][0].current
        if 'cpu_thermal' in temps:
            return temps['cpu_thermal'][0].current
    except Exception:
        pass
    
    # Fallback Linux sysfs
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return int(f.read()) / 1000.0
    except:
        return None

def capture_and_upload_image():
    """Tente de capturer une image et de l'envoyer au backend."""
    photo_path = "/tmp/sgssa_cam.jpg"
    try:
        # Vérifier si un périphérique caméra existe
        if not os.path.exists("/dev/video0"):
            print("[!] Aucune caméra détectée sur /dev/video0. Capture annulée.")
            return

        # Utilisation de fswebcam (léger et standard sous Linux)
        res = os.system(f"fswebcam -r 640x480 --no-banner {photo_path}")
        if res == 0 and os.path.exists(photo_path):
            url = f"{BACKEND_BASE_URL}/api/servers/{SERVER_ID}/upload_snapshot/"
            with open(photo_path, 'rb') as img:
                files = {'image': ('cam.jpg', img, 'image/jpeg')}
                r = requests.post(url, files=files, timeout=10)
                print(f"[*] Snapshot envoyé: {r.status_code}")
    except Exception as e:
        print(f"[!] Erreur Caméra: {e}")

def main():
    print(f"🚀 SGSSA Agent démarré pour le Serveur #{SERVER_ID}")
    print(f"📡 Backend: {BACKEND_BASE_URL}")
    
    cam_counter = 0

    while True:
        try:
            # 1. Collecte des métriques
            metrics = {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "ram_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                "cpu_temp": get_cpu_temp()
            }
            
            # 2. Envoi au Backend
            url = f"{BACKEND_BASE_URL}/api/servers/{SERVER_ID}/report_metrics/"
            resp = requests.post(url, json=metrics, timeout=5)
            print(f"[+] Rapport envoyé ({resp.status_code}): CPU {metrics['cpu_usage']}% | RAM {metrics['ram_usage']}%")
            
            # 3. Capture Caméra (toutes les 5 minutes / 30 cycles)
            if cam_counter % 30 == 0:
                capture_and_upload_image()
            
            cam_counter += 1
            
        except Exception as e:
            print(f"[!] Erreur: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
