from django.db import models
from apps.servers.models import Server

class WebApplication(models.Model):
    STATUT_CHOICES = (
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
        ('erreur', 'Erreur'),
    )
    nom = models.CharField(max_length=150)
    url = models.URLField()
    port = models.IntegerField(default=80)
    technologie = models.CharField(max_length=100)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    serveur = models.ForeignKey(Server, related_name='webapps', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
