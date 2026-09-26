"""Minimal Django bootstrap for the offline test suite.

The engine (analyze.py / modelling.py) needs the ORM only to expand and label
selections, so the tests run against the checked-in db.sqlite3: no migrations,
no Celery, no broker, no channels layer. The deployment settings
(ramasceneMasterProject.config) are deliberately not imported, they pull in
celery, channels and webpack_loader.

The integration-marked tests used to take their database from a
django_db_setup fixture here; they now need a real pytest-django run, see
docs/regression-harness.md.
"""
import os

import django
from django.conf import settings

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if not settings.configured:
    settings.configure(
        INSTALLED_APPS=[
            'django.contrib.contenttypes',
            'django.contrib.auth',
            'ramascene',
        ],
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
            },
        },
        # EXIOBASE matrices. DATASETS_DIR/DATASETS_VERSION are the names the
        # deployment settings use (see sample-dev-env.sh), the singular
        # spellings are accepted too. See docs/regression-harness.md.
        DATASET_DIR=(os.environ.get('DATASETS_DIR') or os.environ.get('DATASET_DIR')
                     or os.path.join(BASE_DIR, 'dataset')),
        DATASET_VERSION=(os.environ.get('DATASETS_VERSION')
                         or os.environ.get('DATASET_VERSION') or 'v3'),
        USE_TZ=True,
    )
    django.setup()
