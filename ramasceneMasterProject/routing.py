from ramascene.consumers import RamasceneConsumer
from channels.routing import URLRouter, ProtocolTypeRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from django.core.asgi import get_asgi_application  # Add this

# Get the Django ASGI application for HTTP requests
django_application = get_asgi_application()

channel_routing = ProtocolTypeRouter({
    # HTTP routing - handle all HTTP requests with Django
    "http": django_application,

    # WebSocket routing - handle WebSocket connections
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ramascene/', RamasceneConsumer),
        ]),
    ),
})