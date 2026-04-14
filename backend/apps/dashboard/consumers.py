import json
from channels.generic.websocket import AsyncWebsocketConsumer

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # On pourrait vérifier le token JWT ici si besoin
        self.group_name = 'dashboard_stats'
        
        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Quitter le groupe
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # On ne s'attend pas à recevoir de données du client pour le moment
        pass

    async def stats_update(self, event):
        """Reçu quand une nouvelle métrique arrive via le channel layer."""
        # Envoyer les données au WebSocket
        await self.send(text_data=json.dumps(event['data']))
