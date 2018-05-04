from ramascene.consumers import RamasceneConsumer
from channels.routing import URLRouter, ProtocolTypeRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

channel_routing = ProtocolTypeRouter({

"websocket": AuthMiddlewareStack(
    URLRouter([
        path('ramascene/', RamasceneConsumer),

        ]),
    ),
})