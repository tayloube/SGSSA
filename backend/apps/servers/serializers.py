from rest_framework import serializers
from .models import Server, ServerMetric

class ServerMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServerMetric
        fields = '__all__'

class ServerSerializer(serializers.ModelSerializer):
    rack_nom = serializers.CharField(source='rack.nom', read_only=True)
    metrics = serializers.SerializerMethodField()
    class Meta:
        model = Server
        fields = '__all__'

    def get_metrics(self, obj):
        latest = obj.metrics.first()
        if latest:
            return ServerMetricSerializer(latest).data
        return None
