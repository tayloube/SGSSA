from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Server, ServerMetric
from .serializers import ServerSerializer, ServerMetricSerializer

class ServerViewSet(viewsets.ModelViewSet):
    queryset = Server.objects.all()
    serializer_class = ServerSerializer
    permission_classes = [IsAuthenticated]

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
