from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import SSLCertificate
from .serializers import SSLCertificateSerializer

class SSLCertificateViewSet(viewsets.ModelViewSet):
    queryset = SSLCertificate.objects.select_related('webapp').all()
    serializer_class = SSLCertificateSerializer
    permission_classes = [IsAuthenticated]
