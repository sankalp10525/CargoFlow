"""Management command wrapper — calls seed_demo_data script logic."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed the database with demo data for CargoFlow."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", default="demo")
        parser.add_argument("--orders", type=int, default=10)

    def handle(self, *args, **options):
        # Import here to avoid circular imports at module load time
        import importlib.util
        import os
        import sys

        # Inline the logic directly
        from scripts.seed_demo_data import Command as SeedCommand
        seed = SeedCommand()
        seed.stdout = self.stdout
        seed.style = self.style
        seed.handle(*args, **options)
