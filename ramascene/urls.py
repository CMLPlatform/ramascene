from django.urls import path, re_path
import ramascene.views as views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    # re_path(r'^$', views.ExioVisuals, name='ExioVisuals'),
    path('ramascene/', views.home, name='home'),
    path('ajaxhandling/', views.ajaxHandling, name='ajaxhandling'),

]
