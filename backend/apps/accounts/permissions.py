"""Reusable, composable DRF permission classes shared across every app."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


def _has_role(request, role):
    user = request.user
    return bool(user and user.is_authenticated and user.role == role)


class IsCreator(BasePermission):
    """Allows access only to users with the Creator role."""

    message = "Only creators can perform this action."

    def has_permission(self, request, view):
        return _has_role(request, Role.CREATOR)


class IsBrand(BasePermission):
    """Allows access only to users with the Brand role."""

    message = "Only brands can perform this action."

    def has_permission(self, request, view):
        return _has_role(request, Role.BRAND)


class IsModerator(BasePermission):
    """Allows access only to moderators (or staff/superusers)."""

    message = "Only moderators can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.role == Role.MODERATOR or user.is_staff or user.is_superuser)
        )


class IsAdminRole(BasePermission):
    """Allows access only to admins (or superusers)."""

    message = "Only admins can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == Role.ADMIN or user.is_superuser))


class IsVerified(BasePermission):
    """Requires the authenticated user to have completed verification."""

    message = "Your account must be verified to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_verified)


class IsOwner(BasePermission):
    """
    Generic object-level permission: grants access only to the owner of an object.

    Looks up ``view.owner_field`` (default: ``"user"``) on the object, supporting
    dotted paths (e.g. ``"brand.user"``) so it can be reused across apps whose
    models reach the owning user through a related object.
    Read-only (SAFE_METHODS) requests are always allowed; object retrieval
    permission is still gated by the view's queryset/get_permissions.
    """

    owner_field_default = "user"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        owner_field = getattr(view, "owner_field", self.owner_field_default)
        target = obj
        for part in owner_field.split("."):
            target = getattr(target, part, None)
            if target is None:
                return False
        return target == request.user


class IsOwnerOrReadOnly(IsOwner):
    """Alias kept for readability at call sites."""


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
