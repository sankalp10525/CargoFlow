"""Core logistics domain models."""
import uuid
from django.conf import settings
from django.db import models

from apps.users.models import Tenant


class Driver(models.Model):
    """Driver entity within a tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="drivers")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="driver_profile",
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "drivers"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.tenant.slug})"


class Vehicle(models.Model):
    """Vehicle entity within a tenant."""

    class VehicleType(models.TextChoices):
        BIKE = "BIKE", "Bike"
        VAN = "VAN", "Van"
        TRUCK = "TRUCK", "Truck"
        TEMPO = "TEMPO", "Tempo"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="vehicles")
    plate_number = models.CharField(max_length=30)
    type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.VAN)
    capacity_kg = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vehicles"
        unique_together = [["tenant", "plate_number"]]
        ordering = ["plate_number"]

    def __str__(self) -> str:
        return f"{self.plate_number} ({self.type})"


class Order(models.Model):
    """Shipment order — core entity."""

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        ASSIGNED = "ASSIGNED", "Assigned"
        PICKED_UP = "PICKED_UP", "Picked Up"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        DELIVERED = "DELIVERED", "Delivered"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    TERMINAL_STATUSES = {Status.DELIVERED, Status.FAILED, Status.CANCELLED}
    CANCELLABLE_STATUSES = {Status.CREATED, Status.ASSIGNED, Status.PICKED_UP}

    VALID_TRANSITIONS: dict = {
        Status.CREATED: {Status.ASSIGNED, Status.CANCELLED},
        Status.ASSIGNED: {Status.PICKED_UP, Status.CANCELLED},
        Status.PICKED_UP: {Status.IN_TRANSIT, Status.CANCELLED},
        Status.IN_TRANSIT: {Status.DELIVERED, Status.FAILED},
        Status.DELIVERED: set(),
        Status.FAILED: set(),
        Status.CANCELLED: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="orders")
    reference_code = models.CharField(max_length=100)
    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=30)
    customer_email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    tracking_token = models.CharField(max_length=64, unique=True, db_index=True)
    assigned_route = models.ForeignKey(
        "Route", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    pickup_window_start = models.DateTimeField(null=True, blank=True)
    pickup_window_end = models.DateTimeField(null=True, blank=True)
    drop_window_start = models.DateTimeField(null=True, blank=True)
    drop_window_end = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        unique_together = [["tenant", "reference_code"]]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.reference_code} [{self.status}]"

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, set())


class Stop(models.Model):
    """Pickup or drop stop for an order."""

    class StopType(models.TextChoices):
        PICKUP = "PICKUP", "Pickup"
        DROP = "DROP", "Drop"

    class StopStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ARRIVED = "ARRIVED", "Arrived"
        COMPLETED = "COMPLETED", "Completed"
        SKIPPED = "SKIPPED", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="stops")
    sequence_index = models.PositiveIntegerField()
    type = models.CharField(max_length=10, choices=StopType.choices)
    address_line = models.CharField(max_length=300)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    scheduled_eta = models.DateTimeField(null=True, blank=True)
    actual_arrival_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StopStatus.choices, default=StopStatus.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "stops"
        ordering = ["sequence_index"]

    def __str__(self) -> str:
        return f"{self.type} #{self.sequence_index} for {self.order.reference_code}"


class Route(models.Model):
    """Daily driver delivery route."""

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="routes")
    route_date = models.DateField()
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="routes")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="routes")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "routes"
        ordering = ["-route_date"]

    def __str__(self) -> str:
        return f"Route {self.route_date} — {self.driver.name}"


class POD(models.Model):
    """Proof of Delivery."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="pod")
    photo = models.ImageField(upload_to="pods/photos/", null=True, blank=True)
    signature = models.ImageField(upload_to="pods/signatures/", null=True, blank=True)
    receiver_name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    delivered_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pods"

    def __str__(self) -> str:
        return f"POD for {self.order.reference_code}"


class StatusHistory(models.Model):
    """Immutable audit trail of every status transition."""

    class ActorType(models.TextChoices):
        OPS = "OPS", "Ops"
        DRIVER = "DRIVER", "Driver"
        SYSTEM = "SYSTEM", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="status_histories")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    stop = models.ForeignKey(Stop, on_delete=models.SET_NULL, null=True, blank=True)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    actor_type = models.CharField(max_length=10, choices=ActorType.choices)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "status_histories"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.order.reference_code}: {self.from_status} → {self.to_status}"


class Exception(models.Model):
    """Operational exception/alert on an order."""

    class ExceptionType(models.TextChoices):
        DELAY = "DELAY", "Delay"
        FAILED_ATTEMPT = "FAILED_ATTEMPT", "Failed Attempt"
        WRONG_ADDRESS = "WRONG_ADDRESS", "Wrong Address"
        CUSTOMER_UNAVAILABLE = "CUSTOMER_UNAVAILABLE", "Customer Unavailable"
        DAMAGED = "DAMAGED", "Damaged"
        OTHER = "OTHER", "Other"

    class ExceptionStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
        RESOLVED = "RESOLVED", "Resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="exceptions")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="exceptions")
    type = models.CharField(max_length=30, choices=ExceptionType.choices)
    status = models.CharField(
        max_length=20, choices=ExceptionStatus.choices, default=ExceptionStatus.OPEN
    )
    notes = models.TextField(blank=True)
    resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_exceptions"
    )

    class Meta:
        db_table = "exceptions"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.type} on {self.order.reference_code}"


class Event(models.Model):
    """Domain events for outbox pattern."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="events")
    type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "events"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.type} @ {self.created_at}"


class OutboxMessage(models.Model):
    """Outbox pattern for reliable webhook dispatch."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        PROCESSED = "PROCESSED", "Processed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name="outbox")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    retries = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "outbox_messages"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Outbox[{self.status}] for {self.event.type}"
