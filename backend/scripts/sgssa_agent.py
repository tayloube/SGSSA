import os
import sys
import time
import requests
import psutil
import argparse
import platform

def get_cpu_temp():
    """Tente de récupérer la température du CPU de manière cross-platform."""
    try:
        temps = psutil.sensors_temperatures()
        if not temps: return None
        for name, entries in temps.items():
            if name in ['coretemp', 'cpu_thermal'] and entries:
                return entries[0].current
    except Exception:
        pass
    
    # Fallback Linux sysfs
    try:
        if os.path.exists("/sys/class/thermal/thermal_zone0/temp"):
            with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
                return int(f.read()) / 1000.0
    except:
        pass
    return None

def capture_and_upload_image(backend_url, server_id):
    """Tente de capturer une image de la webcam et de l'envoyer au backend."""
    photo_path = "sgssa_cam_temp.jpg"
    try:
        import cv2
        # Essayer d'ouvrir la caméra par défaut (index 0)
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW if platform.system() == "Windows" else cv2.CAP_ANY)
        
        if not cap.isOpened():
            print("[!] Aucune caméra détectée par OpenCV, ou accès refusé.")
            return

        # Capturer une seule frame
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(photo_path, frame)
        cap.release()

        # Uploader l'image au serveur si elle a été créée
        if os.path.exists(photo_path):
            url = f"{backend_url}/api/servers/{server_id}/upload_snapshot/"
            with open(photo_path, 'rb') as img:
                files = {'image': ('cam.jpg', img, 'image/jpeg')}
                r = requests.post(url, files=files, timeout=10)
                print(f"[*] Snapshot envoyé: {r.status_code}")
            os.remove(photo_path)
    except ImportError:
        print("[!] La bibliothèque 'opencv-python' (cv2) n'est pas installée. Mettez le script à jour avec : pip install opencv-python")
    except Exception as e:
        print(f"[!] Erreur lors de la capture Caméra: {e}")

def main():
    # Définition des paramètres de ligne de commande
    parser = argparse.ArgumentParser(description="Agent de supervision distant SGSSA")
    parser.add_argument("--id", type=int, required=True, help="ID unique du serveur (trouvable dans le Dashboard web)")
    parser.add_argument("--url", type=str, default="http://127.0.0.1:8000", help="URL complète du backend SGSSA (ex: http://192.168.1.10:8000)")
    parser.add_argument("--interval", type=int, default=10, help="Intervalle d'envoi des métriques en secondes (défaut: 10)")
    
    args = parser.parse_args()

    print(f"[*] SGSSA Agent démarré (Serveur ID: #{args.id})")
    print(f"[*] OS Détecté: {platform.system()} {platform.release()}")
    print(f"[*] Backend visé: {args.url}")
    print(f"[*] Intervalle de rapport: {args.interval}s")
    print(f"Appuyez sur Ctrl+C pour arrêter le monitoring.")
    print("-" * 50)
    
    cam_counter = 0

    while True:
        try:
            # 1. Sélectionner le disque racine pertinent selon le système d'exploitation
            disk_path = "C:\\" if platform.system() == "Windows" else "/"
            
            # 2. Collecte des métriques hardware
            metrics = {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "ram_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage(disk_path).percent,
                "cpu_temp": get_cpu_temp()
            }
            
            # 3. Envoi via HTTP POST au Backend
            url_metrics = f"{args.url}/api/servers/{args.id}/report_metrics/"
            resp = requests.post(url_metrics, json=metrics, timeout=5)
            print(f"[+] Rapport envoyé ({resp.status_code}): CPU {metrics['cpu_usage']}% | RAM {metrics['ram_usage']}% | Disque {metrics['disk_usage']}%")
            
            # 4. Capture Caméra Périodique (une fois sur 30 cycles ~ toutes les 5 mins avec interval=10)
            if cam_counter % 30 == 0:
                capture_and_upload_image(args.url, args.id)
            
            cam_counter += 1
            
        except requests.exceptions.ConnectionError:
            print(f"[!] Échec de connexion. Le serveur web SGSSA est-il bien lancé sur {args.url} ?")
        except Exception as e:
            print(f"[!] Erreur critique durant le cycle: {e}")
            
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
