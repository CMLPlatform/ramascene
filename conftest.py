import pytest
from ramasceneMasterProject import config
import os


@pytest.fixture()
def django_db_setup():
    config.base.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(config.dev.BASE_DIR, 'db.sqlite3'),
    }
