"""Read-only query logic (selectors)."""
from django.db.models import QuerySet, Prefetch
from django.utils import timezone

from apps.logistics.models import Driver, Exception as LogisticsException, Order, Route, Vehicle
from apps.users.models import Tenant


def driver_list(*, tenant: Tenant) -> QuerySet[Driver]:
    return Driver.objects.filter(tenant=tenant, is_active=True).select_related("user")


def vehicle_list(*, tenant: Tenant) -> QuerySet[Vehicle]:
    return Vehicle.objects.filter(tenant=tenant, is_active=True)


def order_list(*, tenant: Tenant) -> QuerySet[Order]:
    return (
        Order.objects.filter(tenant=tenant)
        .select_related("assigned_route__driver")
        .prefetch_related("stops")
        .order_by("-created_at")
    )


def order_get(*, tenant: Tenant, order_id: str) -> Order:
    return (
        Order.objects.filter(tenant=tenant, id=order_id)
        .select_related("assigned_route__driver", "assigned_route__vehicle")
        .prefetch_related(
            "stops",
            "status_history__actor_user",
            "exceptions",
            "pod",
        )
        .get()
    )


def route_list(*, tenant: Tenant) -> QuerySet[Route]:
    return (
        Route.objects.filter(tenant=tenant)
        .select_related("driver", "vehicle")
        .prefetch_related(
            Prefetch("orders", queryset=Order.objects.prefetch_related("stops"))
        )
        .order_by("-route_date")
    )


def route_get(*, tenant: Tenant, route_id: str) -> Route:
    return (
        Route.objects.filter(tenant=tenant, id=route_id)
        .select_related("driver", "vehicle")
        .prefetch_related(
            Prefetch("orders", queryset=Order.objects.prefetch_related("stops", "pod"))
        )
        .get()
    )


def exception_list(*, tenant: Tenant) -> QuerySet[LogisticsException]:
    return (
        LogisticsException.objects.filter(tenant=tenant)
        .select_related("order", "created_by")
        .order_by("-created_at")
    )


def driver_today_route(*, driver: Driver) -> Route | None:
    today = timezone.localdate()
    return (
        Route.objects.filter(driver=driver, route_date=today)
        .select_related("vehicle")
        .prefetch_related(
            Prefetch("orders", queryset=Order.objects.prefetch_related("stops", "pod"))
        )
        .first()
    )
