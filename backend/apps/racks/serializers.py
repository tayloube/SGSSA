from rest_framework import serializers
from .models import Rack

class RackSerializer(serializers.ModelSerializer):
    serveurs_count = serializers.ReadOnlyField()
    usage_percent = serializers.ReadOnlyField()
    class Meta:
        model = Rack
        fields = '__all__'
