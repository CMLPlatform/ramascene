from django.urls import path
import ramascene.views as views

urlpatterns = [
    path('ramascene/', views.home, name='home'),
    path('ajaxhandling/', views.ajaxHandling, name='ajaxhandling'),
]
