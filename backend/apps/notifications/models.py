"""Notification models — push tokens, notification log."""
import uuid

from django.db import models

from apps.users.models import Tenant, User


class PushToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="push_tokens")
    token = models.CharField(max_length=512, unique=True)
    platform = models.CharField(
        max_length=16,
        choices=[("FCM", "Firebase Cloud Messaging"), ("APNS", "Apple Push Notification Service")],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user} — {self.platform}"


class NotificationLog(models.Model):
    """Audit trail for sent notifications."""

    class Channel(models.TextChoices):
        PUSH = "PUSH", "Push Notification"
        EMAIL = "EMAIL", "Email"
        WEBHOOK = "WEBHOOK", "Webhook"

    class DeliveryStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="notification_logs")
    recipient_user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="notification_logs"
    )
    channel = models.CharField(max_length=16, choices=Channel.choices)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    delivery_status = models.CharField(
        max_length=16, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.channel} → {self.recipient_user} [{self.delivery_status}]"
