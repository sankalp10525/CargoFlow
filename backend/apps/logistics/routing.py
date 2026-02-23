"""WebSocket URL routing for logistics consumers."""
from django.urls import re_path

from apps.logistics import consumers

websocket_urlpatterns = [
    # Ops: subscribe to all route updates for their tenant
    re_path(r"^ws/ops/routes/$", consumers.OpsRouteConsumer.as_asgi()),
    # Driver: bidirectional location + order updates
    re_path(r"^ws/driver/route/(?P<route_id>[0-9a-f-]+)/$", consumers.DriverRouteConsumer.as_asgi()),
    # Customer: live tracking updates
    re_path(r"^ws/tracking/(?P<tracking_token>[a-zA-Z0-9_-]+)/$", consumers.TrackingConsumer.as_asgi()),
]
