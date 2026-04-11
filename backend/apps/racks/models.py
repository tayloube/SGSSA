from django.db import models

class Rack(models.Model):
    nom = models.CharField(max_length=100)
    datacenter = models.CharField(max_length=100)
    localisation = models.CharField(max_length=255, blank=True)
    total_unites_u = models.PositiveIntegerField(default=42)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def serveurs_count(self):
        return self.serveurs.count()

    @property
    def usage_percent(self):
        count = self.serveurs_count
        used_u = count * 2 # Estimation
        if self.total_unites_u == 0: return 0
        return min(100, round((used_u / self.total_unites_u) * 100, 1))

    class Meta:
        ordering = ['datacenter', 'nom']
