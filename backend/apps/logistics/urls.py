"""Logistics URL patterns — ops/, driver/, tracking/."""
from django.urls import path

from apps.logistics import views

# ── Ops ───────────────────────────────────────────────────────────────────────
ops_urlpatterns = [
    path("drivers/", views.OpsDriverListCreateView.as_view(), name="ops-driver-list-create"),
    path("drivers/<uuid:pk>/", views.OpsDriverDetailView.as_view(), name="ops-driver-detail"),
    path("vehicles/", views.OpsVehicleListCreateView.as_view(), name="ops-vehicle-list-create"),
    path("orders/", views.OpsOrderListCreateView.as_view(), name="ops-order-list-create"),
    path("orders/<uuid:pk>/", views.OpsOrderDetailView.as_view(), name="ops-order-detail"),
    path("orders/<uuid:pk>/cancel/", views.OpsOrderCancelView.as_view(), name="ops-order-cancel"),
    path("orders/<uuid:pk>/reassign/", views.OpsOrderReassignView.as_view(), name="ops-order-reassign"),
    path("routes/", views.OpsRouteListCreateView.as_view(), name="ops-route-list-create"),
    path("routes/<uuid:pk>/", views.OpsRouteDetailView.as_view(), name="ops-route-detail"),
    path("routes/<uuid:pk>/reorder/", views.OpsRouteReorderView.as_view(), name="ops-route-reorder"),
    path("exceptions/", views.OpsExceptionListView.as_view(), name="ops-exception-list"),
    path("exceptions/<uuid:pk>/ack/", views.OpsExceptionAckView.as_view(), name="ops-exception-ack"),
    path("exceptions/<uuid:pk>/resolve/", views.OpsExceptionResolveView.as_view(), name="ops-exception-resolve"),
]

# ── Driver ────────────────────────────────────────────────────────────────────
driver_urlpatterns = [
    path("me/", views.DriverMeView.as_view(), name="driver-me"),
    path("routes/today/", views.DriverTodayRouteView.as_view(), name="driver-today-route"),
    path("routes/<uuid:pk>/", views.DriverRouteDetailView.as_view(), name="driver-route-detail"),
    path("routes/<uuid:pk>/start/", views.DriverRouteStartView.as_view(), name="driver-route-start"),
    path("orders/<uuid:pk>/status/", views.DriverOrderStatusView.as_view(), name="driver-order-status"),
    path("orders/<uuid:pk>/pod/", views.DriverPODView.as_view(), name="driver-order-pod"),
    path("scan/", views.DriverScanView.as_view(), name="driver-scan"),
]
