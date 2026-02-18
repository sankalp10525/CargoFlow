"""API v1 URL configuration — mounts all app routers."""
from django.urls import include, path

from apps.logistics.urls import driver_urlpatterns, ops_urlpatterns
from apps.logistics.views import CustomerTrackingView, HealthView

urlpatterns = [
    # Health
    path("health/", HealthView.as_view(), name="health"),

    # Auth
    path("auth/", include("apps.users.urls")),

    # Ops (requires OPS_ADMIN or OPS_DISPATCHER role)
    path("ops/", include((ops_urlpatterns, "ops"), namespace="ops")),

    # Driver mobile app
    path("driver/", include((driver_urlpatterns, "driver"), namespace="driver")),

    # Customer public tracking
    path("tracking/<str:tracking_token>/", CustomerTrackingView.as_view(), name="customer-tracking"),
]
