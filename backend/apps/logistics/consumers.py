"""Django Channels consumers for real-time logistics updates."""
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.logistics.models import Order, Route

logger = logging.getLogger(__name__)


def _user_from_scope(scope):
    return scope.get("user")


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Subscribe to all route/order events for tenant
# ─────────────────────────────────────────────────────────────────────────────

class OpsRouteConsumer(AsyncJsonWebsocketConsumer):
    """
    Authenticated ops user subscribes to their tenant's events.

    Group name: ``ops_tenant_{tenant_id}``
    """

    async def connect(self):
        user = _user_from_scope(self.scope)
        if not user or not user.is_authenticated or not user.is_ops:
            await self.close(code=4001)
            return

        self.tenant_id = str(user.tenant_id)
        self.group_name = f"ops_tenant_{self.tenant_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type": "connected", "group": self.group_name})

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # handlers matching channel layer message types
    async def order_updated(self, event):
        await self.send_json(event)

    async def route_updated(self, event):
        await self.send_json(event)

    async def driver_location(self, event):
        await self.send_json(event)


# ─────────────────────────────────────────────────────────────────────────────
# DRIVER — Bidirectional: sends location, receives route updates
# ─────────────────────────────────────────────────────────────────────────────

class DriverRouteConsumer(AsyncJsonWebsocketConsumer):
    """
    Authenticated driver connects to their assigned route.

    Group names:
      - ``route_{route_id}`` — shared with ops
      - ``driver_{driver_id}`` — driver-only messages
    """

    async def connect(self):
        user = _user_from_scope(self.scope)
        if not user or not user.is_authenticated or not user.is_driver:
            await self.close(code=4001)
            return

        self.route_id = self.scope["url_route"]["kwargs"]["route_id"]
        route_ok = await self._verify_route_access(user, self.route_id)
        if not route_ok:
            await self.close(code=4003)
            return

        self.route_group = f"route_{self.route_id}"
        self.driver_group = f"driver_{user.pk}"

        await self.channel_layer.group_add(self.route_group, self.channel_name)
        await self.channel_layer.group_add(self.driver_group, self.channel_name)
        await self.accept()
        await self.send_json({"type": "connected", "route_id": self.route_id})

    async def disconnect(self, code):
        for attr in ("route_group", "driver_group"):
            if hasattr(self, attr):
                await self.channel_layer.group_discard(getattr(self, attr), self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type == "location.update":
            await self._handle_location_update(content)
        else:
            await self.send_json({"type": "error", "detail": f"Unknown message type: {msg_type}"})

    async def _handle_location_update(self, content):
        user = _user_from_scope(self.scope)
        lat = content.get("lat")
        lng = content.get("lng")
        if lat is None or lng is None:
            await self.send_json({"type": "error", "detail": "lat and lng required"})
            return
        await self._save_driver_location(user, lat, lng)

        # Broadcast to ops
        tenant_group = await self._get_tenant_group(user)
        if tenant_group:
            await self.channel_layer.group_send(
                tenant_group,
                {"type": "driver_location", "driver_user_id": str(user.pk), "lat": lat, "lng": lng},
            )
        await self.send_json({"type": "location.ack"})

    # Channel layer message handlers
    async def route_updated(self, event):
        await self.send_json(event)

    async def order_updated(self, event):
        await self.send_json(event)

    # Database helpers
    @database_sync_to_async
    def _verify_route_access(self, user, route_id):
        return Route.objects.filter(
            pk=route_id, driver__user=user, status__in=["PLANNED", "IN_PROGRESS"]
        ).exists()

    @database_sync_to_async
    def _save_driver_location(self, user, lat, lng):
        from apps.logistics.models import Driver
        from apps.logistics import services
        try:
            driver = Driver.objects.get(user=user)
            services.driver_update_location(driver=driver, lat=lat, lng=lng)
        except Driver.DoesNotExist:
            logger.warning("DriverRouteConsumer: no driver for user %s", user.pk)

    @database_sync_to_async
    def _get_tenant_group(self, user):
        try:
            return f"ops_tenant_{user.tenant_id}"
        except Exception:
            return None


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER — Live tracking updates (read-only)
# ─────────────────────────────────────────────────────────────────────────────

class TrackingConsumer(AsyncJsonWebsocketConsumer):
    """
    Public (unauthenticated) consumer. Joins group ``tracking_{order_id}``.
    Receives order_updated events and forwards to the customer browser.
    """

    async def connect(self):
        token = self.scope["url_route"]["kwargs"]["tracking_token"]
        order_id = await self._get_order_id(token)
        if not order_id:
            await self.close(code=4004)
            return

        self.group_name = f"tracking_{order_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type": "connected", "order_id": str(order_id)})

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def order_updated(self, event):
        # Only forward safe fields
        await self.send_json({
            "type": "order.updated",
            "status": event.get("status"),
            "updated_at": event.get("updated_at"),
        })

    @database_sync_to_async
    def _get_order_id(self, token):
        try:
            return Order.objects.values_list("id", flat=True).get(tracking_token=token)
        except Order.DoesNotExist:
            return None
