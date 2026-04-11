from rest_framework import serializers
from .models import EventLog

class EventLogSerializer(serializers.ModelSerializer):
    user_nom = serializers.CharField(source='user.nom_complet', read_only=True, default='Système')
    class Meta:
        model = EventLog
        fields = '__all__'
