from rest_framework import serializers
from .models import WebApplication

class WebApplicationSerializer(serializers.ModelSerializer):
    serveur_nom = serializers.CharField(source='serveur.nom', read_only=True)
    class Meta:
        model = WebApplication
        fields = '__all__'
