from django.db import models
from django.conf import settings

class EventLog(models.Model):
    CATEGORY_CHOICES = [
        ('SERVER', 'Serveur'),
        ('SSL', 'Certificat SSL'),
        ('SOFTWARE', 'Logiciel'),
        ('LOGIN', 'Connexion'),
        ('OTHER', 'Autre'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='OTHER')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

