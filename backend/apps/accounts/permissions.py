"""Her uygulama tarafından paylaşılan, yeniden kullanılabilir ve birleştirilebilir DRF yetki sınıfları."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


def _has_role(request, role):
    user = request.user
    return bool(user and user.is_authenticated and user.role == role)


class IsCreator(BasePermission):
    """Yalnızca Creator rolüne sahip kullanıcılara erişim izni verir."""

    message = "Bu işlemi yalnızca creator'lar gerçekleştirebilir."

    def has_permission(self, request, view):
        return _has_role(request, Role.CREATOR)


class IsBrand(BasePermission):
    """Yalnızca Marka rolüne sahip kullanıcılara erişim izni verir."""

    message = "Bu işlemi yalnızca markalar gerçekleştirebilir."

    def has_permission(self, request, view):
        return _has_role(request, Role.BRAND)


class IsModerator(BasePermission):
    """Yalnızca moderatörlere (veya staff/superuser'lara) erişim izni verir."""

    message = "Bu işlemi yalnızca moderatörler gerçekleştirebilir."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.role == Role.MODERATOR or user.is_staff or user.is_superuser)
        )


class IsAdminRole(BasePermission):
    """Yalnızca adminlere (veya superuser'lara) erişim izni verir."""

    message = "Bu işlemi yalnızca adminler gerçekleştirebilir."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == Role.ADMIN or user.is_superuser))


class IsVerified(BasePermission):
    """Giriş yapmış kullanıcının doğrulamayı tamamlamış olmasını gerektirir."""

    message = "Bu işlemi gerçekleştirmek için hesabınızın onaylanmış olması gerekir."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_verified)


class IsOwner(BasePermission):
    """
    Genel nesne düzeyinde yetki: erişimi yalnızca nesnenin sahibine verir.

    Nesne üzerinde ``view.owner_field``'a bakar (varsayılan: ``"user"``), noktalı
    yolları destekler (ör. ``"brand.user"``); böylece sahip kullanıcıya ilişkili
    bir nesne üzerinden ulaşan modellere sahip uygulamalar arasında yeniden
    kullanılabilir. Salt okunur (SAFE_METHODS) isteklere her zaman izin verilir;
    nesneyi getirme yetkisi yine de view'ın queryset/get_permissions'ı tarafından
    kontrol edilir.
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
    """Çağrı noktalarında okunabilirlik için tutulan bir takma ad (alias)."""


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
