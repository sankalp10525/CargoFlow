"""Settings package — loads based on DJANGO_ENV."""
import os

env = os.environ.get("DJANGO_ENV", "dev")

if env == "prod":
    from .prod import *  # noqa
elif env == "test":
    from .test import *  # noqa
else:
    from .dev import *  # noqa
