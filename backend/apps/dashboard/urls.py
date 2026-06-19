from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardStatsView, EventLogViewSet

router = DefaultRouter()
router.register(r'activities', EventLogViewSet, basename='activity')

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
