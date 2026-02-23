"""Django admin registrations for logistics models."""
from django.contrib import admin

from apps.logistics.models import (
    Driver,
    Event,
    Exception as LogisticsException,
    Order,
    OutboxMessage,
    POD,
    Route,
    StatusHistory,
    Stop,
    Vehicle,
)


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "tenant", "is_active", "current_lat", "current_lng", "location_updated_at")
    list_filter = ("tenant", "is_active")
    search_fields = ("name", "phone")
    raw_id_fields = ("user",)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("plate_number", "type", "capacity_kg", "tenant", "is_active")
    list_filter = ("tenant", "type", "is_active")
    search_fields = ("plate_number",)


class StopInline(admin.TabularInline):
    model = Stop
    extra = 0
    fields = ("sequence_index", "type", "address_line", "city", "status", "scheduled_eta", "actual_arrival_time")
    readonly_fields = ("actual_arrival_time",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "reference_code", "customer_name", "status", "tenant",
        "assigned_route", "created_at",
    )
    list_filter = ("tenant", "status")
    search_fields = ("reference_code", "customer_name", "customer_phone")
    readonly_fields = ("tracking_token", "created_at", "updated_at")
    inlines = [StopInline]
    raw_id_fields = ("assigned_route",)


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ("id", "route_date", "driver", "vehicle", "status", "tenant", "created_at")
    list_filter = ("tenant", "status", "route_date")
    search_fields = ("driver__name",)
    raw_id_fields = ("driver", "vehicle")


@admin.register(POD)
class PODAdmin(admin.ModelAdmin):
    list_display = ("order", "receiver_name", "delivered_at")
    search_fields = ("order__reference_code", "receiver_name")
    raw_id_fields = ("order",)


@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "from_status", "to_status", "actor_type", "actor_user", "created_at")
    list_filter = ("actor_type",)
    readonly_fields = ("created_at",)
    raw_id_fields = ("order", "stop", "actor_user")


@admin.register(LogisticsException)
class ExceptionAdmin(admin.ModelAdmin):
    list_display = ("order", "type", "status", "tenant", "created_at")
    list_filter = ("tenant", "type", "status")
    raw_id_fields = ("order",)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("type", "tenant", "created_at")
    list_filter = ("tenant", "type")
    readonly_fields = ("created_at",)


@admin.register(OutboxMessage)
class OutboxMessageAdmin(admin.ModelAdmin):
    list_display = ("event", "status", "retries", "next_attempt_at", "created_at")
    list_filter = ("status",)
    readonly_fields = ("created_at",)
