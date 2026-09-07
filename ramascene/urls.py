from django.urls import path, re_path
import ramascene.views as views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('', views.home, name='home'),  # ✅ Changed from 'ramascene/' to ''
    path('ajaxhandling/', views.ajaxHandling, name='ajaxhandling'),
]
