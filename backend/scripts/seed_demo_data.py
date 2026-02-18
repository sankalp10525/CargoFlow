"""Management command: seed_demo_data — populates a demo tenant with sample data."""
import random
import uuid
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.logistics.models import Order
from apps.logistics.services import (
    driver_create,
    exception_create,
    order_create,
    route_create,
    vehicle_create,
)
from apps.users.models import User
from apps.users.services import tenant_create, user_create


class Command(BaseCommand):
    help = "Seed the database with a demo tenant, users, drivers, vehicles, orders and a route."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", default="demo", help="Slug for the demo tenant")
        parser.add_argument("--orders", type=int, default=10, help="Number of demo orders")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        n_orders = options["orders"]

        self.stdout.write(self.style.MIGRATE_HEADING(f"Seeding demo tenant '{slug}'..."))

        # Tenant
        from apps.users.models import Tenant
        tenant, created = Tenant.objects.get_or_create(slug=slug, defaults={"name": "Demo Logistics Co"})
        if created:
            self.stdout.write(f"  ✓ Created tenant: {tenant.name}")
        else:
            self.stdout.write(f"  ↩ Using existing tenant: {tenant.name}")

        # Users
        admin_email = f"admin@{slug}.demo"
        if not User.objects.filter(email=admin_email).exists():
            admin = user_create(tenant=tenant, email=admin_email, password="demo1234",
                                full_name="Demo Admin", role=User.Role.OPS_ADMIN)
            self.stdout.write(f"  ✓ Admin user: {admin_email} / demo1234")

        dispatcher_email = f"dispatcher@{slug}.demo"
        if not User.objects.filter(email=dispatcher_email).exists():
            dispatcher = user_create(tenant=tenant, email=dispatcher_email, password="demo1234",
                                     full_name="Demo Dispatcher", role=User.Role.OPS_DISPATCHER)
            self.stdout.write(f"  ✓ Dispatcher: {dispatcher_email} / demo1234")

        # Drivers
        drivers = []
        for i in range(1, 4):
            drv_email = f"driver{i}@{slug}.demo"
            drv_user = None
            if not User.objects.filter(email=drv_email).exists():
                drv_user = user_create(tenant=tenant, email=drv_email, password="demo1234",
                                       full_name=f"Demo Driver {i}", role=User.Role.DRIVER)
                self.stdout.write(f"  ✓ Driver user: {drv_email} / demo1234")
            else:
                drv_user = User.objects.get(email=drv_email)

            from apps.logistics.models import Driver
            driver, _ = Driver.objects.get_or_create(
                tenant=tenant, user=drv_user,
                defaults={"name": f"Demo Driver {i}", "phone": f"98765432{i:02d}"},
            )
            drivers.append(driver)

        self.stdout.write(f"  ✓ {len(drivers)} drivers ready")

        # Vehicles
        vehicles = []
        for i, vtype in enumerate(["VAN", "TRUCK", "BIKE"], start=1):
            from apps.logistics.models import Vehicle
            plate = f"KA0{i}AB{1000 + i}"
            vehicle, _ = Vehicle.objects.get_or_create(
                tenant=tenant, plate_number=plate,
                defaults={"type": vtype, "capacity_kg": 200 * i},
            )
            vehicles.append(vehicle)

        self.stdout.write(f"  ✓ {len(vehicles)} vehicles ready")

        # Orders
        actor = User.objects.filter(tenant=tenant, role=User.Role.OPS_ADMIN).first()
        orders = []
        for i in range(n_orders):
            ref = f"DEMO-{uuid.uuid4().hex[:6].upper()}"
            try:
                order = order_create(
                    tenant=tenant,
                    reference_code=ref,
                    customer_name=f"Customer {i + 1}",
                    customer_phone=f"7000000{i:03d}",
                    customer_email=f"cust{i}@test.com",
                    stops_data=[
                        {
                            "type": "PICKUP",
                            "address_line1": f"{i * 10} Pickup Lane",
                            "city": "Bengaluru",
                            "pincode": "560001",
                            "lat": round(12.97 + random.uniform(-0.05, 0.05), 6),
                            "lng": round(77.59 + random.uniform(-0.05, 0.05), 6),
                        },
                        {
                            "type": "DROP",
                            "address_line1": f"{i * 10} Drop Street",
                            "city": "Bengaluru",
                            "pincode": "560002",
                            "lat": round(12.98 + random.uniform(-0.05, 0.05), 6),
                            "lng": round(77.60 + random.uniform(-0.05, 0.05), 6),
                        },
                    ],
                    actor_user=actor,
                )
                orders.append(order)
            except ValueError as e:
                self.stdout.write(self.style.WARNING(f"  ! Skipped order {ref}: {e}"))

        self.stdout.write(f"  ✓ {len(orders)} orders created")

        # Route (use first 5 orders)
        if orders and drivers and vehicles:
            try:
                route = route_create(
                    tenant=tenant,
                    route_date=date.today(),
                    driver=drivers[0],
                    vehicle=vehicles[0],
                    order_ids=[str(o.pk) for o in orders[:5]],
                    optimize=True,
                    actor_user=actor,
                )
                self.stdout.write(f"  ✓ Route created: {route.pk} ({route.status})")
            except ValueError as e:
                self.stdout.write(self.style.WARNING(f"  ! Route skipped: {e}"))

        self.stdout.write(self.style.SUCCESS("\nDemo seed complete! 🚚"))
