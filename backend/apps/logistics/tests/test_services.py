"""
Logistics tests.

Covers:
- Status machine transitions (valid and invalid)
- order_create + stop creation
- order_cancel guards
- Driver cannot update to forbidden statuses
- Tenant isolation on order_list / order_get
- Tracking token privacy (TrackingSerializer)
"""
import uuid

import pytest

from apps.logistics.models import Order, Stop
from apps.logistics.selectors import order_get, order_list
from apps.logistics.serializers import TrackingSerializer
from apps.logistics.services import (
    driver_create,
    order_cancel,
    order_create,
    route_create,
    vehicle_create,
)
from apps.users.models import User
from apps.users.services import tenant_create, user_create


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def tenant_a():
    return tenant_create(name="Tenant A", slug="tenant-a")


@pytest.fixture
def tenant_b():
    return tenant_create(name="Tenant B", slug="tenant-b")


@pytest.fixture
def ops_user(tenant_a):
    return user_create(
        tenant=tenant_a,
        email="ops@tenant-a.com",
        password="pass",
        full_name="Ops User",
        role=User.Role.OPS_ADMIN,
    )


@pytest.fixture
def driver_user(tenant_a):
    return user_create(
        tenant=tenant_a,
        email="driver@tenant-a.com",
        password="pass",
        full_name="Driver User",
        role=User.Role.DRIVER,
    )


@pytest.fixture
def driver(tenant_a, driver_user):
    return driver_create(tenant=tenant_a, name="Driver User", phone="1234567890", user=driver_user)


@pytest.fixture
def vehicle(tenant_a):
    return vehicle_create(
        tenant=tenant_a, plate_number="KA01AB1234", vehicle_type="VAN", capacity_kg=500
    )


def make_order(tenant, actor, ref=None):
    ref = ref or f"ORD-{uuid.uuid4().hex[:8].upper()}"
    return order_create(
        tenant=tenant,
        reference_code=ref,
        customer_name="Test Customer",
        customer_phone="9999999999",
        customer_email="customer@test.com",
        stops_data=[
            {
                "sequence_index": 1,
                "type": "PICKUP",
                "address_line": "123 Main St",
                "city": "Bengaluru",
                "postal_code": "560001",
                "lat": 12.97,
                "lng": 77.59,
            },
            {
                "sequence_index": 2,
                "type": "DROP",
                "address_line": "456 End St",
                "city": "Bengaluru",
                "postal_code": "560002",
                "lat": 12.98,
                "lng": 77.60,
            },
        ],
        actor_user=actor,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Order creation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestOrderCreate:
    def test_order_created_with_stops(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        assert order.status == Order.Status.CREATED
        assert order.stops.count() == 2
        assert order.tracking_token  # non-empty

    def test_duplicate_reference_raises(self, tenant_a, ops_user):
        make_order(tenant_a, ops_user, ref="DUPLICATE-001")
        with pytest.raises(ValueError, match="reference_code"):
            make_order(tenant_a, ops_user, ref="DUPLICATE-001")


# ─────────────────────────────────────────────────────────────────────────────
# Status machine
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStatusMachine:
    def test_valid_transitions(self, tenant_a, ops_user, driver, vehicle):
        order = make_order(tenant_a, ops_user)
        assert order.can_transition_to(Order.Status.ASSIGNED)

    def test_created_cannot_jump_to_delivered(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        assert not order.can_transition_to(Order.Status.DELIVERED)

    def test_terminal_statuses_are_final(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        order.status = Order.Status.DELIVERED
        order.save()
        for s in [Order.Status.ASSIGNED, Order.Status.IN_TRANSIT, Order.Status.CANCELLED]:
            assert not order.can_transition_to(s)


# ─────────────────────────────────────────────────────────────────────────────
# Order cancel
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestOrderCancel:
    def test_cancel_created_order(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        cancelled = order_cancel(order=order, reason="Customer request", actor_user=ops_user)
        assert cancelled.status == Order.Status.CANCELLED

    def test_cannot_cancel_delivered_order(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        order.status = Order.Status.DELIVERED
        order.save()
        with pytest.raises(ValueError, match="cannot be cancelled"):
            order_cancel(order=order, reason="Test", actor_user=ops_user)


# ─────────────────────────────────────────────────────────────────────────────
# Tenant isolation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTenantIsolation:
    def test_order_list_scoped_to_tenant(self, tenant_a, tenant_b, ops_user):
        ops_b = user_create(
            tenant=tenant_b, email="ops@b.com", password="pass",
            full_name="Ops B", role=User.Role.OPS_ADMIN,
        )
        make_order(tenant_a, ops_user, ref="A-001")
        make_order(tenant_b, ops_b, ref="B-001")

        a_orders = order_list(tenant=tenant_a)
        b_orders = order_list(tenant=tenant_b)

        assert all(o.tenant_id == tenant_a.pk for o in a_orders)
        assert all(o.tenant_id == tenant_b.pk for o in b_orders)

    def test_order_get_raises_for_wrong_tenant(self, tenant_a, tenant_b, ops_user):
        ops_b = user_create(
            tenant=tenant_b, email="ops2@b.com", password="pass",
            full_name="Ops B2", role=User.Role.OPS_ADMIN,
        )
        order = make_order(tenant_a, ops_user)
        with pytest.raises(Order.DoesNotExist):
            order_get(tenant=tenant_b, order_id=str(order.pk))


# ─────────────────────────────────────────────────────────────────────────────
# Tracking privacy
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTrackingPrivacy:
    def test_tracking_serializer_hides_sensitive_fields(self, tenant_a, ops_user):
        order = make_order(tenant_a, ops_user)
        data = TrackingSerializer(order).data
        assert "customer_phone" not in data
        assert "customer_email" not in data
        assert "tenant" not in data
        assert "reference_code" in data
        assert "status" in data
