"""
ASGI entrypoint. Configures Django and then runs the application
defined in the ASGI_APPLICATION setting.
"""

import os
import django
from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ramasceneMasterProject.settings")
django.setup()

# Import the routing from routing.py
from ramasceneMasterProject.routing import channel_routing

application = channel_routing