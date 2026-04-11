from django.db import models
from apps.servers.models import Server

class Software(models.Model):
    LICENCE_CHOICES = (
        ('gratuite', 'Gratuite'),
        ('open-source', 'Open-source'),
        ('commerciale', 'Commerciale'),
        ('entreprise', 'Entreprise'),
    )
    nom = models.CharField(max_length=150)
    version = models.CharField(max_length=50)
    editeur = models.CharField(max_length=100, blank=True)
    type_licence = models.CharField(max_length=50, choices=LICENCE_CHOICES, default='commerciale')
    cle_licence = models.CharField(max_length=255, blank=True, null=True)
    date_installation = models.DateField(blank=True, null=True)
    serveur = models.ForeignKey(Server, related_name='logiciels', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
