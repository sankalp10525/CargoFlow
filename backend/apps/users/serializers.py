"""Auth & user serializers."""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import Tenant, User


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "slug", "is_active", "created_at"]


class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "tenant", "created_at"]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.Serializer):
    tenant_name = serializers.CharField(max_length=200)
    tenant_slug = serializers.SlugField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=200)

    def validate_tenant_slug(self, value):
        if Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("This tenant slug is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class WebhookSettingsSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    url = serializers.URLField()
    secret = serializers.CharField(max_length=200)
    events = serializers.ListField(child=serializers.CharField())


class CargoFlowTokenObtainSerializer(TokenObtainPairSerializer):
    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["full_name"] = user.full_name
        return token
