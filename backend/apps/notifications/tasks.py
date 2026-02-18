"""Notification tasks — push/email delivery."""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="notifications.send_push")
def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send a push notification to a user's active devices."""
    from apps.notifications.models import NotificationLog, PushToken
    from apps.users.models import User

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("send_push: user %s not found", user_id)
        return

    tokens = PushToken.objects.filter(user=user, is_active=True)
    for token in tokens:
        log = NotificationLog.objects.create(
            tenant=user.tenant,
            recipient_user=user,
            channel=NotificationLog.Channel.PUSH,
            subject=title,
            body=body,
        )
        # Extend: call FCM/APNS API here
        logger.info("Push notification sent to %s via %s", user.email, token.platform)
        log.delivery_status = NotificationLog.DeliveryStatus.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=["delivery_status", "sent_at"])
