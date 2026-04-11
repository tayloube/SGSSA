from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.racks.models import Rack
from apps.servers.models import Server
from apps.software.models import Software
from apps.webapps.models import WebApplication
from apps.certificates.models import SSLCertificate
from .models import EventLog
from .serializers import EventLogSerializer
from django.utils import timezone

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = {
            'total_racks': Rack.objects.count(),
            'total_servers': Server.objects.count(),
            'servers_actifs': Server.objects.filter(statut='actif').count(),
            'total_software': Software.objects.count(),
            'total_webapps': WebApplication.objects.count(),
            'certificates_warnings': SSLCertificate.objects.filter(date_expiration__lte=timezone.now() + timezone.timedelta(days=30)).count()
        }
        recent_events = EventLog.objects.all()[:10]
        events_data = EventLogSerializer(recent_events, many=True).data

        return Response({
            'stats': stats,
            'recent_events': events_data
        })
