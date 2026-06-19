from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import SSLCertificate
from .serializers import SSLCertificateSerializer

class SSLCertificateViewSet(viewsets.ModelViewSet):
    queryset = SSLCertificate.objects.select_related('webapp').all()
    serializer_class = SSLCertificateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        cert = serializer.save()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SSL',
                action='CREATE',
                details=f"Certificat SSL pour '{cert.nom_domaine}' ajouté (Application: {cert.webapp.nom if cert.webapp else 'N/A'})."
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        cert = serializer.save()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SSL',
                action='UPDATE',
                details=f"Certificat SSL pour '{cert.nom_domaine}' mis à jour."
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        domain = instance.nom_domaine
        instance.delete()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SSL',
                action='DELETE',
                details=f"Certificat SSL pour '{domain}' supprimé."
            )
        except Exception:
            pass
