"""
Pytest configuration for the CargoFlow backend.

Sets DJANGO_SETTINGS_MODULE to test settings and marks all tests
as django_db by default (override with @pytest.mark.no_db if needed).
"""
import django
import pytest
from django.conf import settings


def pytest_configure(config):
    import os
    os.environ.setdefault("DJANGO_ENV", "test")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
