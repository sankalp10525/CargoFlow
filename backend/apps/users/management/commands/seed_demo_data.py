"""Django management command: seed_demo_data."""
import random
import uuid
from datetime import date

from django.core.management.base import BaseCommand

from apps.logistics.services import (
    driver_create,
    order_create,
    route_create,
    vehicle_create,
)
from apps.users.models import User
from apps.users.services import tenant_create, user_create


class Command(BaseCommand):
    help = "Seed the database with a demo tenant, users, drivers, vehicles, orders, and a route."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", default="demo", help="Slug for the demo tenant")
        parser.add_argument("--orders", type=int, default=10, help="Number of demo orders to create")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        n_orders = options["orders"]

        self.stdout.write(self.style.MIGRATE_HEADING(f"\nSeeding demo tenant '{slug}'..."))

        # ── Tenant ─────────────────────────────────────────────────────────────
        from apps.users.models import Tenant
        tenant, created = Tenant.objects.get_or_create(
            slug=slug, defaults={"name": "Demo Logistics Co"}
        )
        status_str = "Created" if created else "Found existing"
        self.stdout.write(f"  ✓ {status_str} tenant: {tenant.name}")

        # ── Admin + dispatcher ─────────────────────────────────────────────────
        for email, name, role in [
            (f"admin@{slug}.demo", "Demo Admin", User.Role.OPS_ADMIN),
            (f"dispatcher@{slug}.demo", "Demo Dispatcher", User.Role.OPS_DISPATCHER),
        ]:
            if not User.objects.filter(email=email).exists():
                user_create(tenant=tenant, email=email, password="demo1234",
                            full_name=name, role=role)
                self.stdout.write(f"  ✓ {role}: {email} / demo1234")
            else:
                self.stdout.write(f"  ↩ Existing: {email}")

        # ── Drivers ────────────────────────────────────────────────────────────
        from apps.logistics.models import Driver
        drivers = []
        for i in range(1, 4):
            drv_email = f"driver{i}@{slug}.demo"
            if not User.objects.filter(email=drv_email).exists():
                drv_user = user_create(
                    tenant=tenant, email=drv_email, password="demo1234",
                    full_name=f"Demo Driver {i}", role=User.Role.DRIVER,
                )
                self.stdout.write(f"  ✓ Driver: {drv_email} / demo1234")
            else:
                drv_user = User.objects.get(email=drv_email)

            driver, _ = Driver.objects.get_or_create(
                tenant=tenant, user=drv_user,
                defaults={"name": f"Demo Driver {i}", "phone": f"98765432{i:02d}"},
            )
            drivers.append(driver)

        self.stdout.write(f"  ✓ {len(drivers)} drivers ready")

        # ── Vehicles ───────────────────────────────────────────────────────────
        from apps.logistics.models import Vehicle
        vehicles = []
        for i, vtype in enumerate(["VAN", "TRUCK", "BIKE"], start=1):
            plate = f"KA0{i}DM{1000 + i}"
            vehicle, _ = Vehicle.objects.get_or_create(
                tenant=tenant, plate_number=plate,
                defaults={"type": vtype, "capacity_kg": 200 * i},
            )
            vehicles.append(vehicle)

        self.stdout.write(f"  ✓ {len(vehicles)} vehicles ready")

        # ── Orders ─────────────────────────────────────────────────────────────
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
                    customer_email=f"cust{i}@example.com",
                    stops_data=[
                        {
                            "type": "PICKUP",
                            "address_line1": f"{(i + 1) * 10} Pickup Lane",
                            "city": "Bengaluru",
                            "pincode": "560001",
                            "lat": round(12.97 + random.uniform(-0.05, 0.05), 6),
                            "lng": round(77.59 + random.uniform(-0.05, 0.05), 6),
                        },
                        {
                            "type": "DROP",
                            "address_line1": f"{(i + 1) * 10} Drop Avenue",
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
                self.stdout.write(self.style.WARNING(f"  ! Skipped {ref}: {e}"))

        self.stdout.write(f"  ✓ {len(orders)} orders created")

        # ── Route ──────────────────────────────────────────────────────────────
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
                self.stdout.write(f"  ✓ Route created: {route.pk} (status={route.status})")
            except ValueError as e:
                self.stdout.write(self.style.WARNING(f"  ! Route skipped: {e}"))

        self.stdout.write(self.style.SUCCESS("\n🚚 Demo seed complete!\n"))
        self.stdout.write("  Login credentials (all use password: demo1234)")
        self.stdout.write(f"    Admin:      admin@{slug}.demo")
        self.stdout.write(f"    Dispatcher: dispatcher@{slug}.demo")
        self.stdout.write(f"    Driver 1:   driver1@{slug}.demo\n")
