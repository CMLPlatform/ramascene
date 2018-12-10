from django.contrib import admin
from .models import Job, Country, Product, Indicator, ModellingProduct

# Register your models here.
admin.site.register(Job)
admin.site.register(Country)
admin.site.register(Product)
admin.site.register(Indicator)
admin.site.register(ModellingProduct)
