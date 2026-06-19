from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Server, ServerMetric, ServerSnapshot
from .serializers import ServerSerializer, ServerMetricSerializer, ServerSnapshotSerializer
from apps.dashboard.models import EventLog

from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncHour
from django.db.models import Avg

channel_layer = get_channel_layer()

def check_server_heartbeats():
    """Vérifie les serveurs 'actifs' et les marque 'inactifs' s'il n'y a pas eu de métriques récentes."""
    now = timezone.now()
    timeout = now - timedelta(seconds=15)
    
    # Trouver les serveurs qui n'ont pas envoyé de métriques depuis 2 mins
    stale_servers = Server.objects.filter(statut='actif').exclude(metrics__timestamp__gte=timeout).distinct()
    
    for server in stale_servers:
        server.statut = 'inactif'
        server.save()
        
        # Enregistrer l'activité dans le journal des événements
        try:
            EventLog.objects.create(
                user=None,
                category='SERVER',
                action='TIMEOUT',
                details=f"Le serveur '{server.nom}' est devenu inactif (pas de heartbeat reçu)."
            )
        except Exception:
            pass

        # Diffuser le changement de statut en temps réel
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'dashboard_stats',
                {
                    'type': 'stats_update',
                    'data': {
                        'type': 'status',
                        'server_id': server.id,
                        'statut': 'inactif',
                        'nom': server.nom
                    }
                }
            )

class ServerViewSet(viewsets.ModelViewSet):
    queryset = Server.objects.all()
    serializer_class = ServerSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        server = serializer.save()
        try:
            EventLog.objects.create(
                user=self.request.user,
                category='SERVER',
                action='CREATE',
                details=f"Serveur '{server.nom}' ({server.adresse_ip}) ajouté par {self.request.user.nom_complet}."
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        server = serializer.save()
        try:
            EventLog.objects.create(
                user=self.request.user,
                category='SERVER',
                action='UPDATE',
                details=f"Serveur '{server.nom}' mis à jour par {self.request.user.nom_complet} (Statut: {server.statut})."
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        nom = instance.nom
        ip = instance.adresse_ip
        instance.delete()
        try:
            EventLog.objects.create(
                user=self.request.user,
                category='SERVER',
                action='DELETE',
                details=f"Serveur '{nom}' ({ip}) supprimé par {self.request.user.nom_complet}."
            )
        except Exception:
            pass

    def list(self, request, *args, **kwargs):
        check_server_heartbeats() # Proactif: vérifier les timeouts à chaque chargement de liste
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        statut = self.request.query_params.get('statut')
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(adresse_ip__icontains=search)
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    @action(detail=True, methods=['get'])
    def metrics_history(self, request, pk=None):
        server = self.get_object()
        metrics = server.metrics.all()[:50]
        serializer = ServerMetricSerializer(metrics, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history_24h(self, request, pk=None):
        server = self.get_object()
        last_24h = timezone.now() - timedelta(hours=24)
        
        # Aggrégation par heure pour éviter de renvoyer trop de points
        history = server.metrics.filter(
            timestamp__gte=last_24h
        ).annotate(
            hour=TruncHour('timestamp')
        ).values('hour').annotate(
            cpu=Avg('cpu_usage'),
            ram=Avg('ram_usage'),
            disk=Avg('disk_usage')
        ).order_by('hour')

        # Formattage pour le frontend
        data = [{
            'time': item['hour'].strftime('%H:%M'),
            'cpu': round(item['cpu'], 1),
            'ram': round(item['ram'], 1),
            'disk': round(item['disk'], 1)
        } for item in history]
        
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def report_metrics(self, request, pk=None):
        """Action pour que l'agent distant rapporte ses métriques."""
        server = self.get_object()
        serializer = ServerMetricSerializer(data={
            'server': server.id,
            'cpu_usage': request.data.get('cpu_usage', 0),
            'ram_usage': request.data.get('ram_usage', 0),
            'disk_usage': request.data.get('disk_usage', 0),
            'cpu_temp': request.data.get('cpu_temp'),
        })
        if serializer.is_valid():
            metric = serializer.save()
            
            # Si le serveur était inactif, on le repasse en actif
            if server.statut != 'actif':
                server.statut = 'actif'
                server.save()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'dashboard_stats',
                        {
                            'type': 'stats_update',
                            'data': {
                                'type': 'status',
                                'server_id': server.id,
                                'statut': 'actif',
                                'nom': server.nom
                            }
                        }
                    )

            # 🔴 Diffusion WebSocket en temps réel à tous les clients connectés
            if channel_layer:
                try:
                    # Envoi des métriques standard
                    async_to_sync(channel_layer.group_send)(
                        'dashboard_stats',
                        {
                            'type': 'stats_update',
                            'data': {
                                'type': 'metric',
                                'server_id': server.id,
                                'server_nom': server.nom,
                                'cpu': metric.cpu_usage,
                                'ram': metric.ram_usage,
                                'disk': metric.disk_usage,
                                'temp': metric.cpu_temp,
                            }
                        }
                    )

                    # Vérification des seuils critiques (90%+)
                    threshold = 90
                    alerts = []
                    if metric.cpu_usage > threshold: alerts.append(f"CPU: {metric.cpu_usage}%")
                    if metric.ram_usage > threshold: alerts.append(f"RAM: {metric.ram_usage}%")
                    if metric.disk_usage > threshold: alerts.append(f"Disque: {metric.disk_usage}%")

                    if alerts:
                        async_to_sync(channel_layer.group_send)(
                            'dashboard_stats',
                            {
                                'type': 'stats_update',
                                'data': {
                                    'type': 'critical_alert',
                                    'server_id': server.id,
                                    'server_nom': server.nom,
                                    'message': f"Saturation détectée sur {server.nom} ({', '.join(alerts)})",
                                    'niveau': 'critical'
                                }
                            }
                        )
                except Exception:
                    pass  # Ne pas bloquer si Redis est indisponible

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def upload_snapshot(self, request, pk=None):
        """Action pour que l'agent télécharge une image de caméra."""
        server = self.get_object()

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'Aucune image fournie'}, status=status.HTTP_400_BAD_REQUEST)

        # Créer le nouveau snapshot
        snapshot = ServerSnapshot.objects.create(server=server, image=image_file)

        # Conserver l'historique d'une heure (avec un minimum de 12 captures)
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)

        # Récupérer les IDs des 12 captures les plus récentes (dont celle qu'on vient d'enregistrer)
        recent_ids = list(server.snapshots.order_by('-timestamp').values_list('id', flat=True)[:12])

        # Supprimer les captures qui ne sont pas dans les 12 plus récentes ET qui ont plus d'une heure
        to_delete = server.snapshots.exclude(id__in=recent_ids).filter(timestamp__lt=one_hour_ago)
        
        # Suppression physique des images pour ne pas remplir le disque inutilement
        for snap in to_delete:
            if snap.image:
                try:
                    snap.image.delete(save=False)
                except Exception:
                    pass
            snap.delete()

        serializer = ServerSnapshotSerializer(snapshot)

        # Enregistrer l'activité dans le journal des événements
        try:
            EventLog.objects.create(
                user=None,  # Capture automatique par l'agent
                category='SERVER',
                action='CAPTURE',
                details=f"Nouvelle capture de surveillance enregistrée pour {server.nom} ({server.snapshots.count()} capture(s) conservée(s))"
            )
        except Exception:
            pass

        # Diffuser l'URL du nouveau snapshot en temps réel
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    'dashboard_stats',
                    {
                        'type': 'stats_update',
                        'data': {
                            'type': 'snapshot',
                            'server_id': server.id,
                            'server_nom': server.nom,
                            'image_url': serializer.data['image'],
                            'timestamp': snapshot.timestamp.isoformat(),
                            'count': server.snapshots.count(),
                        }
                    }
                )
            except Exception:
                pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)
