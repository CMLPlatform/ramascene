from django.db import models

# Create your models here.
from django.db import models
from django.utils import timezone

"""
Interface with database. Used by querymanagement.py, tasks.py and consumers.py functions
"""


class Job(models.Model):
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(default=timezone.now)
    completed = models.DateTimeField(null=True, blank=True)
    celery_id = models.CharField(max_length=255, null=True, blank=True)
    class Meta:
        ordering = ('created',)
    def __str__(self):
        return str(self.pk)



class Country(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=200)
    global_id = models.IntegerField()
    parent_id = models.IntegerField()
    local_id = models.IntegerField()
    level = models.IntegerField()
    identifier = models.CharField(max_length=200)
    leaf_children_global = models.TextField(max_length=1000)
    leaf_children_local = models.TextField(max_length=1000)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=200)
    global_id = models.IntegerField()
    parent_id = models.IntegerField()
    local_id = models.IntegerField()
    level = models.IntegerField()
    identifier = models.CharField(max_length=200)
    leaf_children_global = models.TextField(max_length=1000)
    leaf_children_local = models.TextField(max_length=1000)

    def __str__(self):
        return self.name

class Indicator(models.Model):
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=200)
    global_id = models.IntegerField()
    parent_id = models.IntegerField()
    local_id = models.IntegerField()
    level = models.IntegerField()

    def __str__(self):
        return self.name





