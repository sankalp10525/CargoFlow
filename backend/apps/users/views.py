"""Auth & user views."""
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import Tenant, User
from apps.users.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    WebhookSettingsSerializer,
)
from apps.users.services import tenant_create, tenant_update_webhook, user_create
from common.permissions import IsOpsAdmin


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = tenant_create(name=data["tenant_name"], slug=data["tenant_slug"])
        user = user_create(
            tenant=tenant,
            email=data["email"],
            password=data["password"],
            full_name=data["full_name"],
            role=User.Role.OPS_ADMIN,
        )

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["tenant_id"] = str(user.tenant_id)
        refresh["full_name"] = user.full_name

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
            )
        if not user.is_active:
            return Response(
                {"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        refresh["full_name"] = user.full_name

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class WebhookSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsOpsAdmin]

    def put(self, request):
        serializer = WebhookSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        tenant = tenant_update_webhook(
            tenant=request.user.tenant,
            enabled=d["enabled"],
            url=d["url"],
            secret=d["secret"],
            events=d["events"],
        )
        return Response({"detail": "Webhook settings updated.", "tenant_id": str(tenant.id)})
