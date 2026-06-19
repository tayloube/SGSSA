from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Software
from .serializers import SoftwareSerializer

class SoftwareViewSet(viewsets.ModelViewSet):
    queryset = Software.objects.select_related('serveur').all()
    serializer_class = SoftwareSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        software = serializer.save()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SOFTWARE',
                action='CREATE',
                details=f"Logiciel '{software.nom}' (v{software.version}) ajouté sur le serveur {software.serveur.nom}."
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        software = serializer.save()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SOFTWARE',
                action='UPDATE',
                details=f"Logiciel '{software.nom}' (v{software.version}) mis à jour sur le serveur {software.serveur.nom}."
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        nom = instance.nom
        version = instance.version
        serveur_nom = instance.serveur.nom
        instance.delete()
        try:
            from apps.dashboard.models import EventLog
            EventLog.objects.create(
                user=self.request.user,
                category='SOFTWARE',
                action='DELETE',
                details=f"Logiciel '{nom}' (v{version}) supprimé du serveur {serveur_nom}."
            )
        except Exception:
            pass

    def get_queryset(self):
        qs = super().get_queryset()
        serveur_id = self.request.query_params.get('serveur')
        search = self.request.query_params.get('search')
        if serveur_id:
            qs = qs.filter(serveur_id=serveur_id)
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(editeur__icontains=search)
        return qs
