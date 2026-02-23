"""Logistics views — Ops, Driver, Tracking."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.logistics import selectors, services
from apps.logistics.models import (
    Driver,
    Exception as LogisticsException,
    Order,
    Route,
    Stop,
    Vehicle,
)
from apps.logistics.serializers import (
    DriverCreateSerializer, DriverSerializer, DriverStatusUpdateSerializer,
    ExceptionAckSerializer, ExceptionResolveSerializer, ExceptionSerializer,
    OrderCancelSerializer, OrderCreateSerializer, OrderDetailSerializer,
    OrderListSerializer, OrderReassignSerializer,
    PODCreateSerializer, PODSerializer,
    RouteCreateSerializer, RouteDetailSerializer, RouteListSerializer,
    RouteReorderSerializer, ScanSerializer, TrackingSerializer,
    VehicleSerializer,
)
from apps.users.models import User
from apps.users.services import user_create
from common.permissions import IsDriverUser, IsOpsUser


class TrackingRateThrottle(AnonRateThrottle):
    rate = "30/minute"
    scope = "tracking"


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "cargoflow"})


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Drivers
# ─────────────────────────────────────────────────────────────────────────────

class OpsDriverListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request):
        drivers = selectors.driver_list(tenant=request.user.tenant)
        return Response(DriverSerializer(drivers, many=True).data)

    def post(self, request):
        ser = DriverCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        driver_user = None
        if d.get("email") and d.get("password"):
            driver_user = user_create(
                tenant=request.user.tenant,
                email=d["email"],
                password=d["password"],
                full_name=d["name"],
                role=User.Role.DRIVER,
            )

        driver = services.driver_create(
            tenant=request.user.tenant,
            name=d["name"],
            phone=d["phone"],
            user=driver_user,
        )
        return Response(DriverSerializer(driver).data, status=status.HTTP_201_CREATED)


class OpsDriverDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request, pk):
        driver = get_object_or_404(Driver, pk=pk, tenant=request.user.tenant)
        return Response(DriverSerializer(driver).data)


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Vehicles
# ─────────────────────────────────────────────────────────────────────────────

class OpsVehicleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request):
        vehicles = selectors.vehicle_list(tenant=request.user.tenant)
        return Response(VehicleSerializer(vehicles, many=True).data)

    def post(self, request):
        ser = VehicleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vehicle = services.vehicle_create(
            tenant=request.user.tenant,
            plate_number=ser.validated_data["plate_number"],
            vehicle_type=ser.validated_data["type"],
            capacity_kg=ser.validated_data["capacity_kg"],
        )
        return Response(VehicleSerializer(vehicle).data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Orders
# ─────────────────────────────────────────────────────────────────────────────

class OpsOrderListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request):
        orders = selectors.order_list(tenant=request.user.tenant)
        # Apply status filter
        s = request.query_params.get("status")
        if s:
            orders = orders.filter(status=s)
        return Response(OrderListSerializer(orders, many=True).data)

    def post(self, request):
        ser = OrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            order = services.order_create(
                tenant=request.user.tenant,
                reference_code=d["reference_code"],
                customer_name=d["customer_name"],
                customer_phone=d["customer_phone"],
                customer_email=d.get("customer_email", ""),
                stops_data=d["stops"],
                notes=d.get("notes", ""),
                pickup_window_start=d.get("pickup_window_start"),
                pickup_window_end=d.get("pickup_window_end"),
                drop_window_start=d.get("drop_window_start"),
                drop_window_end=d.get("drop_window_end"),
                actor_user=request.user,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OpsOrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request, pk):
        try:
            order = selectors.order_get(tenant=request.user.tenant, order_id=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class OpsOrderCancelView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, tenant=request.user.tenant)
        ser = OrderCancelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            order = services.order_cancel(
                order=order, reason=ser.validated_data["reason"], actor_user=request.user
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class OpsOrderReassignView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, tenant=request.user.tenant)
        ser = OrderReassignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        route = get_object_or_404(
            Route, pk=ser.validated_data["target_route_id"], tenant=request.user.tenant
        )
        try:
            order = services.order_reassign(
                order=order, target_route=route,
                note=ser.validated_data.get("note", ""), actor_user=request.user,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Routes
# ─────────────────────────────────────────────────────────────────────────────

class OpsRouteListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request):
        routes = selectors.route_list(tenant=request.user.tenant)
        return Response(RouteListSerializer(routes, many=True).data)

    def post(self, request):
        ser = RouteCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        driver = get_object_or_404(Driver, pk=d["driver_id"], tenant=request.user.tenant)
        vehicle = get_object_or_404(Vehicle, pk=d["vehicle_id"], tenant=request.user.tenant)

        try:
            route = services.route_create(
                tenant=request.user.tenant,
                route_date=d["route_date"],
                driver=driver,
                vehicle=vehicle,
                order_ids=[str(oid) for oid in d["order_ids"]],
                optimize=d.get("optimize", False),
                actor_user=request.user,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(RouteDetailSerializer(route).data, status=status.HTTP_201_CREATED)


class OpsRouteDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request, pk):
        try:
            route = selectors.route_get(tenant=request.user.tenant, route_id=pk)
        except Route.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouteDetailSerializer(route).data)


class OpsRouteReorderView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def post(self, request, pk):
        route = get_object_or_404(Route, pk=pk, tenant=request.user.tenant)
        ser = RouteReorderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            services.route_reorder_stops(
                route=route, stop_order=[str(s) for s in ser.validated_data["stop_order"]]
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Stops reordered."})


# ─────────────────────────────────────────────────────────────────────────────
# OPS — Exceptions
# ─────────────────────────────────────────────────────────────────────────────

class OpsExceptionListView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def get(self, request):
        exceptions = selectors.exception_list(tenant=request.user.tenant)
        s = request.query_params.get("status")
        if s:
            exceptions = exceptions.filter(status=s)
        return Response(ExceptionSerializer(exceptions, many=True).data)


class OpsExceptionAckView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def post(self, request, pk):
        exc = get_object_or_404(LogisticsException, pk=pk, tenant=request.user.tenant)
        ser = ExceptionAckSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            exc = services.exception_acknowledge(exc=exc, note=ser.validated_data["note"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ExceptionSerializer(exc).data)


class OpsExceptionResolveView(APIView):
    permission_classes = [IsAuthenticated, IsOpsUser]

    def post(self, request, pk):
        exc = get_object_or_404(LogisticsException, pk=pk, tenant=request.user.tenant)
        ser = ExceptionResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        exc = services.exception_resolve(exc=exc, resolution=ser.validated_data["resolution"])
        return Response(ExceptionSerializer(exc).data)


# ─────────────────────────────────────────────────────────────────────────────
# DRIVER APP
# ─────────────────────────────────────────────────────────────────────────────

class DriverMeView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def get(self, request):
        from apps.users.serializers import UserSerializer
        return Response(UserSerializer(request.user).data)


class DriverTodayRouteView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def get(self, request):
        driver = get_object_or_404(Driver, user=request.user, is_active=True)
        route = selectors.driver_today_route(driver=driver)
        if not route:
            return Response({"detail": "No route assigned for today."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouteDetailSerializer(route).data)


class DriverRouteDetailView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def get(self, request, pk):
        driver = get_object_or_404(Driver, user=request.user)
        route = get_object_or_404(Route, pk=pk, driver=driver)
        return Response(RouteDetailSerializer(route).data)


class DriverRouteStartView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def post(self, request, pk):
        driver = get_object_or_404(Driver, user=request.user)
        route = get_object_or_404(Route, pk=pk, driver=driver)
        try:
            route = services.route_start(route=route, actor_user=request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(RouteDetailSerializer(route).data)


class DriverOrderStatusView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def post(self, request, pk):
        driver = get_object_or_404(Driver, user=request.user)
        order = get_object_or_404(Order, pk=pk, assigned_route__driver=driver)

        ser = DriverStatusUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        stop = None
        if d.get("stop_id"):
            stop = get_object_or_404(Stop, pk=d["stop_id"], order=order)

        try:
            order = services.driver_update_order_status(
                order=order,
                to_status=d["to_status"],
                stop=stop,
                actor_user=request.user,
                metadata=d.get("metadata", {}),
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class DriverPODView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        driver = get_object_or_404(Driver, user=request.user)
        order = get_object_or_404(Order, pk=pk, assigned_route__driver=driver)

        ser = PODCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            pod = services.pod_create(
                order=order,
                receiver_name=d["receiver_name"],
                photo=d.get("photo"),
                signature=d.get("signature"),
                notes=d.get("notes", ""),
                actor_user=request.user,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            PODSerializer(pod, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DriverScanView(APIView):
    permission_classes = [IsAuthenticated, IsDriverUser]

    def post(self, request):
        driver = get_object_or_404(Driver, user=request.user)
        ser = ScanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        order = Order.objects.filter(
            reference_code=ser.validated_data["code"],
            assigned_route__driver=driver,
        ).first()
        if not order:
            return Response({"detail": "Order not found on your routes."}, status=status.HTTP_404_NOT_FOUND)

        return Response(OrderDetailSerializer(order, context={"request": request}).data)


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER TRACKING
# ─────────────────────────────────────────────────────────────────────────────

class CustomerTrackingView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [TrackingRateThrottle]

    def get(self, request, tracking_token):
        order = get_object_or_404(
            Order.objects.prefetch_related(
                "stops", "status_history", "pod"
            ),
            tracking_token=tracking_token,
        )
        return Response(TrackingSerializer(order, context={"request": request}).data)
