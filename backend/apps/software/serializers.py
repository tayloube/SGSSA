from rest_framework import serializers
from .models import Software

class SoftwareSerializer(serializers.ModelSerializer):
    serveur_nom = serializers.CharField(source='serveur.nom', read_only=True)
    class Meta:
        model = Software
        fields = '__all__'
