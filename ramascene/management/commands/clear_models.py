from django.core.management.base import BaseCommand
from ramascene.models import Job
from django_celery_results import models

"""
Clear database command
"""

class Command(BaseCommand):
    def handle(self, *args, **options):
        print("***removing jobs out of DB***")
        Job.objects.all().delete()
        print("***removing results out of DB***")
        models.TaskResult.objects.all().delete()