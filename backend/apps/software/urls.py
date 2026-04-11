from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SoftwareViewSet

router = DefaultRouter()
router.register('', SoftwareViewSet, basename='software')

urlpatterns = [
    path('', include(router.urls)),
]
