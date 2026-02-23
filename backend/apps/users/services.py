"""User services — write operations."""
from django.db import transaction

from apps.users.models import Tenant, User


@transaction.atomic
def tenant_create(*, name: str, slug: str) -> Tenant:
    return Tenant.objects.create(name=name, slug=slug)


@transaction.atomic
def user_create(
    *,
    tenant: Tenant,
    email: str,
    password: str,
    full_name: str,
    role: str = User.Role.OPS_DISPATCHER,
) -> User:
    if User.objects.filter(email=email).exists():
        raise ValueError("A user with this email already exists.")
    user = User.objects.create_user(
        email=email,
        password=password,
        full_name=full_name,
        role=role,
        tenant=tenant,
    )
    return user


@transaction.atomic
def tenant_update_webhook(
    *,
    tenant: Tenant,
    enabled: bool,
    url: str,
    secret: str,
    events: list,
) -> Tenant:
    tenant.webhook_enabled = enabled
    tenant.webhook_url = url
    tenant.webhook_secret = secret
    tenant.webhook_events = events
    tenant.save(update_fields=["webhook_enabled", "webhook_url", "webhook_secret", "webhook_events"])
    return tenant
