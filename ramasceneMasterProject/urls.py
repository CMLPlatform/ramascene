"""URL routing. Django serves the API; the single-page app is served by nginx."""
from django.urls import include, path

urlpatterns = [
    path('', include('ramascene.urls')),
]
