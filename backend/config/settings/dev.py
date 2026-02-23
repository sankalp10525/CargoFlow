"""Development settings."""
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True

LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # noqa
