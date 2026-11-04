"""
ASGI entrypoint. The application is served over plain HTTP; there are no websockets.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE",
                      "ramasceneMasterProject.config.production")
application = get_asgi_application()
