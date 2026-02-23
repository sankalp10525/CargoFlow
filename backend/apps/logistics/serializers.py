"""Logistics serializers."""
from rest_framework import serializers

from apps.logistics.models import (
    Driver,
    Exception as LogisticsException,
    Order,
    OutboxMessage,
    POD,
    Route,
    StatusHistory,
    Stop,
    Vehicle,
)
from apps.users.serializers import UserSerializer


# ─── Shared ────────────────────────────────────────────────────────────────

class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = [
            "id", "sequence_index", "type", "address_line", "city",
            "state", "postal_code", "lat", "lng",
            "scheduled_eta", "actual_arrival_time", "status", "notes",
        ]
        read_only_fields = ["id", "actual_arrival_time", "status"]


class StopCreateSerializer(serializers.Serializer):
    sequence_index = serializers.IntegerField(min_value=1)
    type = serializers.ChoiceField(choices=Stop.StopType.choices)
    address_line = serializers.CharField(max_length=300)
    city = serializers.CharField(max_length=100, required=False, default="")
    state = serializers.CharField(max_length=100, required=False, default="")
    postal_code = serializers.CharField(max_length=20, required=False, default="")
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    scheduled_eta = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="")


class PODSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model = POD
        fields = ["id", "receiver_name", "photo_url", "signature_url", "notes", "delivered_at"]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None

    def get_signature_url(self, obj):
        if obj.signature:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.signature.url) if request else obj.signature.url
        return None


class StatusHistorySerializer(serializers.ModelSerializer):
    actor_user = UserSerializer(read_only=True)

    class Meta:
        model = StatusHistory
        fields = [
            "id", "from_status", "to_status", "actor_type",
            "actor_user", "stop", "metadata", "created_at",
        ]


# ─── Driver ────────────────────────────────────────────────────────────────

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ["id", "name", "phone", "is_active", "current_lat", "current_lng",
                  "location_updated_at", "created_at"]
        read_only_fields = ["id", "created_at", "current_lat", "current_lng", "location_updated_at"]


class DriverCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(min_length=8, write_only=True, required=False)
    is_active = serializers.BooleanField(default=True)


# ─── Vehicle ───────────────────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ["id", "plate_number", "type", "capacity_kg", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


# ─── Order ─────────────────────────────────────────────────────────────────

class OrderListSerializer(serializers.ModelSerializer):
    stops = StopSerializer(many=True, read_only=True)
    route_id = serializers.UUIDField(source="assigned_route_id", read_only=True, allow_null=True)
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "reference_code", "customer_name", "customer_phone",
            "status", "tracking_token", "route_id", "driver_name",
            "stops", "created_at", "updated_at",
        ]

    def get_driver_name(self, obj):
        if obj.assigned_route and obj.assigned_route.driver:
            return obj.assigned_route.driver.name
        return None


class OrderDetailSerializer(serializers.ModelSerializer):
    stops = StopSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    pod = PODSerializer(read_only=True)
    route_id = serializers.UUIDField(source="assigned_route_id", read_only=True, allow_null=True)
    driver_name = serializers.SerializerMethodField()
    route_date = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "reference_code", "customer_name", "customer_phone",
            "customer_email", "status", "tracking_token",
            "assigned_route", "route_id", "driver_name", "route_date",
            "stops", "status_history", "pod",
            "pickup_window_start", "pickup_window_end",
            "drop_window_start", "drop_window_end",
            "notes", "created_at", "updated_at",
        ]

    def get_driver_name(self, obj):
        if obj.assigned_route and obj.assigned_route.driver:
            return obj.assigned_route.driver.name
        return None

    def get_route_date(self, obj):
        if obj.assigned_route:
            return str(obj.assigned_route.route_date)
        return None


class OrderCreateSerializer(serializers.Serializer):
    reference_code = serializers.CharField(max_length=100)
    customer_name = serializers.CharField(max_length=200)
    customer_phone = serializers.CharField(max_length=30)
    customer_email = serializers.EmailField(required=False, default="")
    stops = StopCreateSerializer(many=True, min_length=1)
    notes = serializers.CharField(required=False, default="")
    pickup_window_start = serializers.DateTimeField(required=False, allow_null=True)
    pickup_window_end = serializers.DateTimeField(required=False, allow_null=True)
    drop_window_start = serializers.DateTimeField(required=False, allow_null=True)
    drop_window_end = serializers.DateTimeField(required=False, allow_null=True)


class OrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)


# ─── Route ─────────────────────────────────────────────────────────────────

class RouteListSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    orders = OrderListSerializer(many=True, read_only=True)
    order_count = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            "id", "route_date", "driver", "vehicle", "status",
            "orders", "order_count", "start_time", "end_time", "created_at",
        ]

    def get_order_count(self, obj):
        return obj.orders.count()


class RouteDetailSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    orders = OrderListSerializer(many=True, read_only=True)

    class Meta:
        model = Route
        fields = [
            "id", "route_date", "driver", "vehicle", "status",
            "orders", "start_time", "end_time", "notes", "created_at",
        ]


class RouteCreateSerializer(serializers.Serializer):
    route_date = serializers.DateField()
    driver_id = serializers.UUIDField()
    vehicle_id = serializers.UUIDField()
    order_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    optimize = serializers.BooleanField(default=False)


class RouteReorderSerializer(serializers.Serializer):
    stop_order = serializers.ListField(child=serializers.UUIDField(), min_length=1)


class OrderReassignSerializer(serializers.Serializer):
    target_route_id = serializers.UUIDField()
    note = serializers.CharField(max_length=500, default="")


# ─── Exception ─────────────────────────────────────────────────────────────

class ExceptionSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(source="order.reference_code", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    description = serializers.CharField(source="notes", read_only=True)

    class Meta:
        model = LogisticsException
        fields = [
            "id", "order", "order_reference", "type", "status",
            "notes", "description", "resolution", "created_by_name",
            "created_at", "acknowledged_at", "resolved_at",
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class ExceptionAckSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=1000)


class ExceptionResolveSerializer(serializers.Serializer):
    resolution = serializers.CharField(max_length=1000)


# ─── Driver status update ───────────────────────────────────────────────────

class DriverStatusUpdateSerializer(serializers.Serializer):
    to_status = serializers.ChoiceField(choices=Order.Status.choices)
    stop_id = serializers.UUIDField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False, default=dict)


class PODCreateSerializer(serializers.Serializer):
    receiver_name = serializers.CharField(max_length=200)
    photo = serializers.ImageField(required=False, allow_null=True)
    signature = serializers.ImageField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="")


class ScanSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=100)


# ─── Customer tracking ──────────────────────────────────────────────────────

class TrackingStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = ["id", "sequence_index", "type", "address_line", "city",
                  "scheduled_eta", "actual_arrival_time", "status"]


class TrackingSerializer(serializers.ModelSerializer):
    stops = TrackingStopSerializer(many=True, read_only=True)
    pod_summary = serializers.SerializerMethodField()
    last_update = serializers.SerializerMethodField()
    driver_eta = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "reference_code", "customer_name", "status",
            "stops", "pod_summary", "last_update", "driver_eta",
        ]

    def get_pod_summary(self, obj):
        try:
            return {"delivered_at": obj.pod.delivered_at, "receiver_name": obj.pod.receiver_name}
        except Exception:
            return None

    def get_last_update(self, obj):
        last = obj.status_history.order_by("-created_at").first()
        return last.created_at if last else obj.updated_at

    def get_driver_eta(self, obj):
        if obj.assigned_route and obj.assigned_route.driver:
            drop_stop = obj.stops.filter(type=Stop.StopType.DROP).order_by("sequence_index").first()
            if drop_stop:
                return drop_stop.scheduled_eta
        return None
