import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ramasceneMasterProject.settings')

app = Celery('ramasceneMasterProject')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


app.conf.task_routes = ([
    ('calc_default.tasks', {'queue': 'calc'}),
    ('modelling.tasks', {'queue': 'modelling'})
],)
