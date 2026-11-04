from django.urls import path
import ramascene.views as views
from ramascene import api

urlpatterns = [
    path('ramascene/', views.home, name='home'),
    path('api/catalog/', api.CatalogView.as_view(), name='catalog'),
    path('api/jobs/', api.JobListView.as_view(), name='job-list'),
    path('api/jobs/<int:job_id>/', api.JobDetailView.as_view(), name='job-detail'),
]
