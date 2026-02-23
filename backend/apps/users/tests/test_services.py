"""
Users app tests.

Covers:
- Tenant creation
- User creation with unique email enforcement
- Duplicate email raises ValueError
- Role assignment
- Tenant isolation (user_create scoped to correct tenant)
"""
import pytest

from apps.users.models import User
from apps.users.services import tenant_create, user_create


@pytest.mark.django_db
class TestTenantCreate:
    def test_creates_tenant(self):
        tenant = tenant_create(name="AcmeCo", slug="acmeco")
        assert tenant.pk is not None
        assert tenant.name == "AcmeCo"
        assert tenant.slug == "acmeco"
        assert tenant.is_active

    def test_duplicate_slug_raises(self):
        tenant_create(name="AcmeCo", slug="acmeco")
        with pytest.raises(Exception):
            tenant_create(name="Acme Duplicate", slug="acmeco")


@pytest.mark.django_db
class TestUserCreate:
    def setup_method(self):
        self.tenant = tenant_create(name="Logistics Inc", slug="logistiq")

    def test_creates_user(self):
        user = user_create(
            tenant=self.tenant,
            email="dispatch@logistiq.com",
            password="securepass123",
            full_name="Alice Smith",
            role=User.Role.OPS_DISPATCHER,
        )
        assert user.pk is not None
        assert user.email == "dispatch@logistiq.com"
        assert user.role == User.Role.OPS_DISPATCHER
        assert user.tenant == self.tenant
        assert user.check_password("securepass123")

    def test_duplicate_email_raises_value_error(self):
        user_create(
            tenant=self.tenant,
            email="dup@logistiq.com",
            password="pass",
            full_name="First",
            role=User.Role.OPS_ADMIN,
        )
        with pytest.raises(ValueError, match="already registered"):
            user_create(
                tenant=self.tenant,
                email="dup@logistiq.com",
                password="pass",
                full_name="Second",
                role=User.Role.OPS_ADMIN,
            )

    def test_driver_role(self):
        user = user_create(
            tenant=self.tenant,
            email="driver@logistiq.com",
            password="pass",
            full_name="Bob Driver",
            role=User.Role.DRIVER,
        )
        assert user.is_driver
        assert not user.is_ops

    def test_ops_admin_role(self):
        user = user_create(
            tenant=self.tenant,
            email="admin@logistiq.com",
            password="pass",
            full_name="Carol Admin",
            role=User.Role.OPS_ADMIN,
        )
        assert user.is_ops
        assert not user.is_driver
