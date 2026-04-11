from rest_framework import serializers
from .models import SSLCertificate

class SSLCertificateSerializer(serializers.ModelSerializer):
    webapp_nom = serializers.CharField(source='webapp.nom', read_only=True)
    jours_restants = serializers.ReadOnlyField()
    statut = serializers.ReadOnlyField()
    class Meta:
        model = SSLCertificate
        fields = '__all__'
