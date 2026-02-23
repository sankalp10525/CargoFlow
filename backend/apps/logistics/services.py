"""Logistics business logic — write operations."""
import hashlib
import math
import secrets
import uuid
from datetime import datetime
from typing import Optional

from django.db import transaction
from django.utils import timezone

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
from apps.users.models import Tenant, User


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_tracking_token() -> str:
    return secrets.token_urlsafe(32)


def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _nearest_neighbor_order(stops: list[Stop]) -> list[Stop]:
    """Simple nearest-neighbor heuristic for stop ordering."""
    with_coords = [s for s in stops if s.lat is not None and s.lng is not None]
    without_coords = [s for s in stops if s.lat is None or s.lng is None]

    if len(with_coords) < 2:
        return stops

    ordered = [with_coords.pop(0)]
    while with_coords:
        last = ordered[-1]
        nearest = min(
            with_coords,
            key=lambda s: _haversine(last.lat, last.lng, s.lat, s.lng),
        )
        with_coords.remove(nearest)
        ordered.append(nearest)

    return ordered + without_coords


def _emit_event(tenant: Tenant, event_type: str, payload: dict) -> Event:
    """Create Event + OutboxMessage in same transaction."""
    event = Event.objects.create(tenant=tenant, type=event_type, payload=payload)
    OutboxMessage.objects.create(event=event, next_attempt_at=timezone.now())
    return event


def _record_status_history(
    *,
    order: Order,
    from_status: str,
    to_status: str,
    actor_user: Optional[User],
    actor_type: str,
    stop: Optional[Stop] = None,
    metadata: dict = None,
) -> StatusHistory:
    return StatusHistory.objects.create(
        tenant=order.tenant,
        order=order,
        stop=stop,
        actor_user=actor_user,
        actor_type=actor_type,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata or {},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Driver / Vehicle CRUD
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def driver_create(
    *,
    tenant: Tenant,
    name: str,
    phone: str,
    user: Optional[User] = None,
) -> Driver:
    return Driver.objects.create(tenant=tenant, name=name, phone=phone, user=user)


@transaction.atomic
def vehicle_create(
    *,
    tenant: Tenant,
    plate_number: str,
    vehicle_type: str,
    capacity_kg: int,
) -> Vehicle:
    return Vehicle.objects.create(
        tenant=tenant,
        plate_number=plate_number,
        type=vehicle_type,
        capacity_kg=capacity_kg,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Order CRUD
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def order_create(
    *,
    tenant: Tenant,
    reference_code: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str = "",
    stops_data: list[dict],
    notes: str = "",
    pickup_window_start=None,
    pickup_window_end=None,
    drop_window_start=None,
    drop_window_end=None,
    actor_user: Optional[User] = None,
) -> Order:
    if Order.objects.filter(tenant=tenant, reference_code=reference_code).exists():
        raise ValueError(f"Order with reference '{reference_code}' already exists.")

    order = Order.objects.create(
        tenant=tenant,
        reference_code=reference_code,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        notes=notes,
        tracking_token=_make_tracking_token(),
        pickup_window_start=pickup_window_start,
        pickup_window_end=pickup_window_end,
        drop_window_start=drop_window_start,
        drop_window_end=drop_window_end,
    )

    for stop_data in stops_data:
        Stop.objects.create(order=order, **stop_data)

    _record_status_history(
        order=order,
        from_status="",
        to_status=Order.Status.CREATED,
        actor_user=actor_user,
        actor_type=StatusHistory.ActorType.OPS,
    )

    _emit_event(tenant, "order.created", {"order_id": str(order.id), "reference_code": reference_code})
    return order


@transaction.atomic
def order_cancel(*, order: Order, reason: str, actor_user: Optional[User]) -> Order:
    if order.status not in Order.CANCELLABLE_STATUSES:
        raise ValueError(f"Cannot cancel order in status '{order.status}'.")

    prev = order.status
    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])

    _record_status_history(
        order=order,
        from_status=prev,
        to_status=Order.Status.CANCELLED,
        actor_user=actor_user,
        actor_type=StatusHistory.ActorType.OPS,
        metadata={"reason": reason},
    )
    _emit_event(order.tenant, "order.cancelled", {"order_id": str(order.id), "reason": reason})
    return order


# ─────────────────────────────────────────────────────────────────────────────
# Route management
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def route_create(
    *,
    tenant: Tenant,
    route_date,
    driver: Driver,
    vehicle: Vehicle,
    order_ids: list,
    optimize: bool = False,
    actor_user: Optional[User] = None,
) -> Route:
    route = Route.objects.create(
        tenant=tenant,
        route_date=route_date,
        driver=driver,
        vehicle=vehicle,
    )

    orders = Order.objects.filter(id__in=order_ids, tenant=tenant, status=Order.Status.CREATED)
    if orders.count() != len(order_ids):
        raise ValueError("One or more orders not found or not in CREATED status.")

    for order in orders:
        prev = order.status
        order.assigned_route = route
        order.status = Order.Status.ASSIGNED
        order.save(update_fields=["assigned_route", "status", "updated_at"])
        _record_status_history(
            order=order,
            from_status=prev,
            to_status=Order.Status.ASSIGNED,
            actor_user=actor_user,
            actor_type=StatusHistory.ActorType.OPS,
            metadata={"route_id": str(route.id)},
        )
        _emit_event(
            tenant,
            "order.status_changed",
            {"order_id": str(order.id), "to_status": Order.Status.ASSIGNED},
        )

    if optimize:
        _optimize_route_stops(route)

    return route


def _optimize_route_stops(route: Route) -> None:
    """Re-sequence stops using nearest-neighbor heuristic."""
    orders = route.orders.all().prefetch_related("stops")
    all_stops = []
    for order in orders:
        all_stops.extend(list(order.stops.all()))

    optimized = _nearest_neighbor_order(all_stops)
    for idx, stop in enumerate(optimized, start=1):
        stop.sequence_index = idx
        stop.save(update_fields=["sequence_index"])


@transaction.atomic
def route_reorder_stops(*, route: Route, stop_order: list[str]) -> Route:
    """Reorder stops by list of stop UUIDs."""
    stops = {str(s.id): s for s in Stop.objects.filter(order__assigned_route=route)}
    for idx, stop_id in enumerate(stop_order, start=1):
        if stop_id not in stops:
            raise ValueError(f"Stop {stop_id} not on this route.")
        stop = stops[stop_id]
        stop.sequence_index = idx
        stop.save(update_fields=["sequence_index"])
    return route


@transaction.atomic
def route_start(*, route: Route, actor_user: Optional[User]) -> Route:
    if route.status != Route.Status.PLANNED:
        raise ValueError("Route must be in PLANNED status to start.")
    route.status = Route.Status.IN_PROGRESS
    route.start_time = timezone.now()
    route.save(update_fields=["status", "start_time", "updated_at"])
    return route


@transaction.atomic
def order_reassign(
    *, order: Order, target_route: Route, note: str, actor_user: Optional[User]
) -> Order:
    if order.status not in (Order.Status.ASSIGNED,):
        raise ValueError("Only ASSIGNED orders can be reassigned.")
    order.assigned_route = target_route
    order.save(update_fields=["assigned_route", "updated_at"])
    _record_status_history(
        order=order,
        from_status=Order.Status.ASSIGNED,
        to_status=Order.Status.ASSIGNED,
        actor_user=actor_user,
        actor_type=StatusHistory.ActorType.OPS,
        metadata={"note": note, "target_route_id": str(target_route.id)},
    )
    return order


# ─────────────────────────────────────────────────────────────────────────────
# Driver status update
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def driver_update_order_status(
    *,
    order: Order,
    to_status: str,
    stop: Optional[Stop],
    actor_user: User,
    metadata: dict = None,
) -> Order:
    if not order.can_transition_to(to_status):
        raise ValueError(
            f"Invalid transition: {order.status} → {to_status}"
        )

    prev = order.status
    order.status = to_status
    order.save(update_fields=["status", "updated_at"])

    if stop:
        stop.actual_arrival_time = timezone.now()
        stop.status = Stop.StopStatus.COMPLETED
        stop.save(update_fields=["actual_arrival_time", "status"])

    _record_status_history(
        order=order,
        from_status=prev,
        to_status=to_status,
        actor_user=actor_user,
        actor_type=StatusHistory.ActorType.DRIVER,
        stop=stop,
        metadata=metadata or {},
    )
    _emit_event(
        order.tenant,
        "order.status_changed",
        {
            "order_id": str(order.id),
            "reference_code": order.reference_code,
            "from_status": prev,
            "to_status": to_status,
        },
    )

    # Auto-complete route if all orders done
    if order.assigned_route:
        _check_route_completion(order.assigned_route)

    return order


def _check_route_completion(route: Route) -> None:
    """Complete route if all its orders are in terminal state."""
    terminal = Order.TERMINAL_STATUSES
    orders = route.orders.all()
    if all(o.status in terminal for o in orders):
        route.status = Route.Status.COMPLETED
        route.end_time = timezone.now()
        route.save(update_fields=["status", "end_time", "updated_at"])


# ─────────────────────────────────────────────────────────────────────────────
# POD
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def pod_create(
    *,
    order: Order,
    receiver_name: str,
    photo=None,
    signature=None,
    notes: str = "",
    actor_user: User,
) -> POD:
    if order.status != Order.Status.IN_TRANSIT:
        raise ValueError("Order must be IN_TRANSIT to upload POD.")
    if POD.objects.filter(order=order).exists():
        raise ValueError("POD already exists for this order.")

    pod = POD.objects.create(
        order=order,
        receiver_name=receiver_name,
        photo=photo,
        signature=signature,
        notes=notes,
        delivered_at=timezone.now(),
    )

    # Transition to DELIVERED
    driver_update_order_status(
        order=order,
        to_status=Order.Status.DELIVERED,
        stop=None,
        actor_user=actor_user,
        metadata={"pod_id": str(pod.id), "receiver_name": receiver_name},
    )

    _emit_event(
        order.tenant,
        "pod.created",
        {"order_id": str(order.id), "pod_id": str(pod.id)},
    )
    return pod


# ─────────────────────────────────────────────────────────────────────────────
# Exceptions
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def exception_create(
    *,
    tenant: Tenant,
    order: Order,
    exception_type: str,
    notes: str,
    created_by: Optional[User],
) -> LogisticsException:
    return LogisticsException.objects.create(
        tenant=tenant,
        order=order,
        type=exception_type,
        notes=notes,
        created_by=created_by,
    )


@transaction.atomic
def exception_acknowledge(*, exc: LogisticsException, note: str) -> LogisticsException:
    if exc.status != LogisticsException.ExceptionStatus.OPEN:
        raise ValueError("Exception is not OPEN.")
    exc.status = LogisticsException.ExceptionStatus.ACKNOWLEDGED
    exc.notes = f"{exc.notes}\nACK: {note}".strip()
    exc.acknowledged_at = timezone.now()
    exc.save(update_fields=["status", "notes", "acknowledged_at"])
    return exc


@transaction.atomic
def exception_resolve(*, exc: LogisticsException, resolution: str) -> LogisticsException:
    exc.status = LogisticsException.ExceptionStatus.RESOLVED
    exc.resolution = resolution
    exc.resolved_at = timezone.now()
    exc.save(update_fields=["status", "resolution", "resolved_at"])
    return exc


# ─────────────────────────────────────────────────────────────────────────────
# Driver location
# ─────────────────────────────────────────────────────────────────────────────

def driver_update_location(*, driver: Driver, lat: float, lng: float) -> Driver:
    driver.current_lat = lat
    driver.current_lng = lng
    driver.location_updated_at = timezone.now()
    driver.save(update_fields=["current_lat", "current_lng", "location_updated_at"])
    return driver
