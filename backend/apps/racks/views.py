from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Rack
from .serializers import RackSerializer

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
