from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebApplicationViewSet

router = DefaultRouter()
router.register('', WebApplicationViewSet, basename='webapps')

urlpatterns = [
    path('', include(router.urls)),
]
