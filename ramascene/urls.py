from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from ramascene import api

urlpatterns = [
    path('api/catalog/', api.CatalogView.as_view(), name='catalog'),
    path('api/jobs/', api.JobListView.as_view(), name='job-list'),
    path('api/jobs/<int:job_id>/', api.JobDetailView.as_view(), name='job-detail'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='api-docs'),
]
