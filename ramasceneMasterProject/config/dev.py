from .base import *


SECRET_KEY = '__SECRET__'

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1']

CELERY_BROKER_URL = 'amqp://localhost'

#path to datasets directory
DATASET_DIR = os.environ['DATASETS_DIR']
#name of numpy objects for timeseries
DATASET_VERSION = os.environ['DATASETS_VERSION']

#logging locally for debugging sqllite
LOGGING = {
    'version': 1,
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
        }
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        }
    }
}

#logging for Django
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': './logs/debug.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'ramascene': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}