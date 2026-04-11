from django.db import models
from apps.webapps.models import WebApplication
from django.utils import timezone

class SSLCertificate(models.Model):
    domaine = models.CharField(max_length=255)
    emetteur = models.CharField(max_length=150)
    date_emission = models.DateField()
    date_expiration = models.DateField()
    webapp = models.ForeignKey(WebApplication, related_name='certificats', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def jours_restants(self):
        delta = self.date_expiration - timezone.now().date()
        return delta.days
    
    @property
    def statut(self):
        jours = self.jours_restants
        if jours < 0: return 'expiré'
        if jours <= 30: return 'proche'
        return 'valide'

    class Meta:
        ordering = ['date_expiration']
