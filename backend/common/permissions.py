"""Custom permissions."""
from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsOpsUser(BasePermission):
    """Ops admin or dispatcher."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.OPS_ADMIN, User.Role.OPS_DISPATCHER)
        )


class IsOpsAdmin(BasePermission):
    """Ops admin only."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.OPS_ADMIN
        )


class IsDriverUser(BasePermission):
    """Driver users only."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.DRIVER
        )
