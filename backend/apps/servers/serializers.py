from rest_framework import serializers
from .models import Server, ServerMetric, ServerSnapshot

class ServerMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServerMetric
        fields = '__all__'

class ServerSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServerSnapshot
        fields = ['id', 'image', 'timestamp']

class ServerSerializer(serializers.ModelSerializer):
    rack_nom = serializers.CharField(source='rack.nom', read_only=True)
    derniere_metrique = serializers.SerializerMethodField()
    dernier_snapshot = serializers.SerializerMethodField()
    snapshots = serializers.SerializerMethodField()
    
    class Meta:
        model = Server
        fields = '__all__'

    def get_derniere_metrique(self, obj):
        latest = obj.metrics.first()
        if latest:
            return ServerMetricSerializer(latest).data
        return None

    def get_dernier_snapshot(self, obj):
        latest = obj.snapshots.first()
        if latest:
            return ServerSnapshotSerializer(latest).data
        return None

    def get_snapshots(self, obj):
        # Expose toutes les captures associées au serveur (triées par défaut du plus récent au plus ancien)
        return ServerSnapshotSerializer(obj.snapshots.all(), many=True).data
