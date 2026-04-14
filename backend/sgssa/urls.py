from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/racks/', include('apps.racks.urls')),
    path('api/servers/', include('apps.servers.urls')),
    path('api/software/', include('apps.software.urls')),
    path('api/webapps/', include('apps.webapps.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/', include('apps.dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
