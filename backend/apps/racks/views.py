from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncHour
from django.db.models import Avg
from .models import Rack
from .serializers import RackSerializer
from apps.servers.models import ServerMetric

class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.all()
    serializer_class = RackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(datacenter__icontains=search) | qs.filter(localisation__icontains=search)
        return qs

    @action(detail=True, methods=['get'])
    def history_24h(self, request, pk=None):
        rack = self.get_object()
        last_24h = timezone.now() - timedelta(hours=24)
        
        # Aggrégation par heure pour tous les serveurs du rack
        history = ServerMetric.objects.filter(
            server__rack=rack,
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
