"""Custom User model."""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str = None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.OPS_ADMIN)
        return self.create_user(email, password, **extra_fields)


class Tenant(models.Model):
    """Logistics company / client tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=100)
    is_active = models.BooleanField(default=True)
    webhook_url = models.URLField(blank=True)
    webhook_secret = models.CharField(max_length=200, blank=True)
    webhook_enabled = models.BooleanField(default=False)
    webhook_events = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tenants"

    def __str__(self) -> str:
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with role-based access."""

    class Role(models.TextChoices):
        OPS_ADMIN = "OPS_ADMIN", "Ops Admin"
        OPS_DISPATCHER = "OPS_DISPATCHER", "Ops Dispatcher"
        DRIVER = "DRIVER", "Driver"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="users", null=True, blank=True
    )
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OPS_DISPATCHER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}>"

    @property
    def is_ops(self) -> bool:
        return self.role in (self.Role.OPS_ADMIN, self.Role.OPS_DISPATCHER)

    @property
    def is_driver(self) -> bool:
        return self.role == self.Role.DRIVER
