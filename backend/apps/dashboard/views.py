from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.racks.models import Rack
from apps.servers.models import Server, ServerMetric
from apps.servers.views import check_server_heartbeats
from apps.software.models import Software
from apps.webapps.models import WebApplication
from apps.certificates.models import SSLCertificate
from .models import EventLog
from django.utils import timezone
from django.db.models import Avg
from django.db.models.functions import TruncHour

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        check_server_heartbeats() # Proactif: vérifier les timeouts à chaque chargement du dashboard
        now = timezone.now()

        # Stats Serveurs
        total_servers = Server.objects.count()
        actifs = Server.objects.filter(statut='actif').count()
        inactifs = Server.objects.filter(statut='inactif').count()
        maintenance = Server.objects.filter(statut='maintenance').count()

        # Stats Apps
        total_apps = WebApplication.objects.count()
        en_ligne = WebApplication.objects.filter(statut='en_ligne').count()
        hors_ligne = WebApplication.objects.filter(statut='hors_ligne').count()
        apps_maintenance = WebApplication.objects.filter(statut='maintenance').count()

        # Stats Certificats (via les dates uniquement)
        total_certs = SSLCertificate.objects.count()
        today = now.date()
        in_30_days = (now + timezone.timedelta(days=30)).date()
        expires = SSLCertificate.objects.filter(date_expiration__lt=today).count()
        critiques = SSLCertificate.objects.filter(date_expiration__gte=today, date_expiration__lte=in_30_days).count()
        valides = max(0, total_certs - critiques - expires)

        # Événements récents
        events_data = []
        for e in EventLog.objects.order_by('-created_at')[:10]:
            events_data.append({
                'id': e.id,
                'action': e.action,
                'details': e.details or '',
                'utilisateur': e.user.nom_complet if e.user else 'Système',
                'horodatage': e.created_at.isoformat(),
            })

        # Métriques moyennes (5 dernières minutes)
        avg_cpu, avg_ram, avg_disk = 0, 0, 0
        if total_servers > 0:
            five_mins_ago = now - timezone.timedelta(minutes=5)
            agg = ServerMetric.objects.filter(timestamp__gte=five_mins_ago).aggregate(
                Avg('cpu_usage'), Avg('ram_usage'), Avg('disk_usage')
            )
            avg_cpu = round(agg.get('cpu_usage__avg') or 0, 1)
            avg_ram = round(agg.get('ram_usage__avg') or 0, 1)
            avg_disk = round(agg.get('disk_usage__avg') or 0, 1)

        # Historique Global (24h)
        last_24h = now - timezone.timedelta(hours=24)
        history_query = ServerMetric.objects.filter(
            timestamp__gte=last_24h
        ).annotate(
            hour=TruncHour('timestamp')
        ).values('hour').annotate(
            cpu=Avg('cpu_usage'),
            ram=Avg('ram_usage'),
            disk=Avg('disk_usage')
        ).order_by('hour')

        history_data = [{
            'time': item['hour'].strftime('%H:%M'),
            'cpu': round(item['cpu'], 1),
            'ram': round(item['ram'], 1),
            'disk': round(item['disk'], 1)
        } for item in history_query]

        return Response({
            'serveurs': {
                'total': total_servers,
                'actifs': actifs,
                'inactifs': inactifs,
                'maintenance': maintenance,
                'metriques_moy': {'cpu': avg_cpu, 'ram': avg_ram, 'disk': avg_disk},
            },
            'applications': {
                'total': total_apps,
                'en_ligne': en_ligne,
                'hors_ligne': hors_ligne,
                'maintenance': apps_maintenance,
            },
            'certificats': {
                'total': total_certs,
                'valides': valides,
                'attention': critiques,
                'critiques': critiques,
                'expires': expires,
            },
            'racks': {'total': Rack.objects.count()},
            'logiciels': {'total': Software.objects.count()},
            'alertes': [],
            'evenements_recents': events_data,
            'historique_24h': history_data,
            'timestamp': now.isoformat(),
        })
