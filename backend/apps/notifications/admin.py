from django.contrib import admin

from apps.notifications.models import NotificationLog, PushToken


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "is_active", "created_at")
    list_filter = ("platform", "is_active")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("tenant", "recipient_user", "channel", "delivery_status", "sent_at")
    list_filter = ("tenant", "channel", "delivery_status")
    readonly_fields = ("created_at", "sent_at")
