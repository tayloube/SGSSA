from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SSLCertificateViewSet

router = DefaultRouter()
router.register('', SSLCertificateViewSet, basename='certificates')

urlpatterns = [
    path('', include(router.urls)),
]
