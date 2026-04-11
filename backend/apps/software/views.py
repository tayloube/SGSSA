from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Software
from .serializers import SoftwareSerializer

class SoftwareViewSet(viewsets.ModelViewSet):
    queryset = Software.objects.select_related('serveur').all()
    serializer_class = SoftwareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        serveur_id = self.request.query_params.get('serveur')
        search = self.request.query_params.get('search')
        if serveur_id:
            qs = qs.filter(serveur_id=serveur_id)
        if search:
            qs = qs.filter(nom__icontains=search) | qs.filter(editeur__icontains=search)
        return qs
