from django.db import models
from apps.racks.models import Rack

class Server(models.Model):
    TYPE_CHOICES = (
        ('physique', 'Physique'),
        ('virtuel', 'Virtuel'),
    )
    STATUT_CHOICES = (
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
        ('maintenance', 'En Maintenance'),
        ('alerte', 'En Alerte'),
    )
    nom = models.CharField(max_length=150)
    adresse_ip = models.GenericIPAddressField()
    adresse_ip_secondaire = models.GenericIPAddressField(blank=True, null=True)
    systeme_exploitation = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='virtuel')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    cpu_coeurs = models.IntegerField()
    cpu_modele = models.CharField(max_length=150, blank=True)
    ram_go = models.IntegerField()
    stockage_go = models.IntegerField()
    date_acquisition = models.DateField(blank=True, null=True)
    description = models.TextField(blank=True)
    rack = models.ForeignKey(Rack, related_name='serveurs', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

class ServerMetric(models.Model):
    server = models.ForeignKey(Server, related_name='metrics', on_delete=models.CASCADE)
    cpu_usage = models.FloatField()
    ram_usage = models.FloatField()
    disk_usage = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
