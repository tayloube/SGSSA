from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import WebApplication
from .serializers import WebApplicationSerializer

class WebApplicationViewSet(viewsets.ModelViewSet):
    queryset = WebApplication.objects.select_related('serveur').all()
    serializer_class = WebApplicationSerializer
    permission_classes = [IsAuthenticated]
