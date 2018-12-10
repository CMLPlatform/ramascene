from .base import *

STATIC_ROOT = os.path.join(BASE_DIR, 'static')

DEBUG = False

ALLOWED_HOSTS = ['127.0.0.1','cml.liacs.nl', os.environ["HOST"]]

SECRET_KEY = os.environ['SECRET_KEY']

# allow cors
MIDDLEWARE += ['corsheaders.middleware.CorsMiddleware', ]

# allow cors
INSTALLED_APPS += [
    'corsheaders',
]

# CORS config
CORS_ORIGIN_ALLOW_ALL = True

# path to datasets directory
DATASET_DIR = os.environ['DATASETS_DIR']
# name of numpy objects for timeseries
DATASET_VERSION = os.environ['DATASETS_VERSION']

# Celery settings
CELERY_BROKER_URL = os.environ['BROKER_URL']
