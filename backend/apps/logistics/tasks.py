"""Celery tasks for CargoFlow logistics."""
import logging
import hashlib
import hmac
import json
import time
from datetime import timedelta

import requests
from celery import shared_task
from django.utils import timezone

from apps.logistics.models import Event, Order, OutboxMessage, Route

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Outbox processor — picks up PENDING OutboxMessages and dispatches webhooks
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=0, name="logistics.process_outbox")
def process_outbox(self):
    """Process all pending outbox messages that are due."""
    now = timezone.now()
    pending = OutboxMessage.objects.filter(
        status__in=[OutboxMessage.Status.PENDING, OutboxMessage.Status.FAILED],
        next_attempt_at__lte=now,
        retries__lt=5,
    ).select_related("event__tenant")[:100]

    for msg in pending:
        dispatch_webhook.delay(str(msg.pk))

    return f"Queued {pending.count()} outbox messages"


@shared_task(bind=True, max_retries=5, name="logistics.dispatch_webhook")
def dispatch_webhook(self, outbox_msg_id: str):
    """Dispatch a single outbox message as a webhook to the tenant."""
    try:
        msg = OutboxMessage.objects.select_related("event__tenant").get(pk=outbox_msg_id)
    except OutboxMessage.DoesNotExist:
        logger.error("OutboxMessage %s not found", outbox_msg_id)
        return

    if msg.status == OutboxMessage.Status.PROCESSED:
        return  # Already processed, skip

    tenant = msg.event.tenant
    if not tenant.webhook_enabled or not tenant.webhook_url:
        msg.status = OutboxMessage.Status.PROCESSED
        msg.save(update_fields=["status"])
        return

    # Check if this event type is subscribed
    if tenant.webhook_events and msg.event.type not in tenant.webhook_events:
        msg.status = OutboxMessage.Status.PROCESSED
        msg.save(update_fields=["status"])
        return

    msg.status = OutboxMessage.Status.PROCESSING
    msg.save(update_fields=["status"])

    payload = {
        "event_id": str(msg.event.id),
        "event_type": msg.event.type,
        "tenant": tenant.slug,
        "payload": msg.event.payload,
        "timestamp": msg.event.created_at.isoformat(),
    }
    body = json.dumps(payload)

    headers = {"Content-Type": "application/json", "X-CargoFlow-Event": msg.event.type}

    if tenant.webhook_secret:
        sig = hmac.new(tenant.webhook_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers["X-CargoFlow-Signature"] = f"sha256={sig}"

    try:
        resp = requests.post(tenant.webhook_url, data=body, headers=headers, timeout=10)
        resp.raise_for_status()
        msg.status = OutboxMessage.Status.PROCESSED
        msg.processed_at = timezone.now()
        msg.save(update_fields=["status", "processed_at"])
    except Exception as exc:
        logger.warning("Webhook delivery failed for msg %s: %s", outbox_msg_id, exc)
        msg.retries += 1
        backoff = min(300, 30 * (2 ** msg.retries))
        msg.next_attempt_at = timezone.now() + timedelta(seconds=backoff)
        msg.status = OutboxMessage.Status.FAILED
        msg.save(update_fields=["status", "retries", "next_attempt_at"])

        if msg.retries < 5:
            raise self.retry(exc=exc, countdown=backoff)


# ─────────────────────────────────────────────────────────────────────────────
# Real-time channel broadcast helpers
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(name="logistics.broadcast_order_update")
def broadcast_order_update(order_id: str, status: str, tenant_id: str, tracking_token: str):
    """Push order status update to WebSocket consumers."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    payload = {"type": "order_updated", "order_id": order_id, "status": status, "updated_at": timezone.now().isoformat()}

    # Notify ops
    async_to_sync(channel_layer.group_send)(f"ops_tenant_{tenant_id}", payload)
    # Notify customer tracking
    async_to_sync(channel_layer.group_send)(f"tracking_{order_id}", payload)


# ─────────────────────────────────────────────────────────────────────────────
# Delay detection — flag orders that are overdue
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(name="logistics.detect_delays")
def detect_delays():
    """
    Find in-transit orders whose drop window_end has passed.
    Create a DELAY exception if one doesn't exist yet.
    """
    from apps.logistics.models import Exception as LogisticsException
    from apps.logistics.services import exception_create

    now = timezone.now()
    overdue = Order.objects.filter(
        status=Order.Status.IN_TRANSIT,
        drop_window_end__lt=now,
    ).select_related("tenant")

    created = 0
    for order in overdue:
        already = LogisticsException.objects.filter(
            order=order,
            type=LogisticsException.Type.DELAY,
            status__in=[LogisticsException.Status.OPEN, LogisticsException.Status.ACKNOWLEDGED],
        ).exists()
        if not already:
            exception_create(
                tenant=order.tenant,
                order=order,
                exc_type=LogisticsException.Type.DELAY,
                description=f"Auto-detected: order {order.reference_code} overdue since {order.drop_window_end}",
            )
            created += 1

    return f"Delay detection complete. Created {created} exceptions."


# ─────────────────────────────────────────────────────────────────────────────
# Route reminders — alert drivers about upcoming routes
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(name="logistics.send_route_reminders")
def send_route_reminders():
    """
    Find PLANNED routes starting within the next 30 minutes.
    Log/send reminder (extend with push notifications as needed).
    """
    from datetime import date
    now = timezone.now()
    soon = now + timedelta(minutes=30)

    routes = Route.objects.filter(
        status=Route.Status.PLANNED,
        route_date=date.today(),
    ).select_related("driver", "driver__user")

    notified = []
    for route in routes:
        driver = route.driver
        if driver.user and driver.user.email:
            logger.info(
                "Route reminder: driver=%s route=%s date=%s",
                driver.name, route.pk, route.route_date,
            )
            notified.append(str(route.pk))

    return f"Route reminders sent for {len(notified)} routes."
