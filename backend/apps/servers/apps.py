from django.apps import AppConfig

class ServersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.servers'

    def ready(self):
        import os
        # Éviter de lancer le thread deux fois avec l'auto-reloader de Django
        if os.environ.get('RUN_MAIN') == 'true':
            import threading
            import time
            from .views import check_server_heartbeats
            
            def monitor_pulse():
                print("HEARTBEAT - SGSSA Pulse Monitor demarre (Intervalle: 3s)")
                while True:
                    try:
                        check_server_heartbeats()
                    except Exception as e:
                        print(f"[!] Erreur Pulse Monitor: {e}")
                    time.sleep(3)
            
            thread = threading.Thread(target=monitor_pulse, daemon=True)
            thread.start()
