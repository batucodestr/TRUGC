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


# ---------------------------------------------------------------------------
# Zorunlu kullanıcı akışı: kayıt → e-posta doğrulama → profil fotoğrafı → kullanım
# ---------------------------------------------------------------------------
# Bu üç sınıf, "iş verme / iş alma" yolundaki her endpoint'te backend tarafında
# uygulanan gerçek sınırdır — frontend'deki yönlendirme yalnızca kullanıcıyı
# doğru ekrana götüren bir kolaylıktır, güvenlik sınırı değildir.
#
# ``code`` alanı bilinçlidir: apps/accounts/exceptions.py, bu kodları taşıyan
# 403'lerin mesajını genel "yetkiniz bulunmuyor" metniyle değiştirmeden geçirir,
# böylece frontend kullanıcıya hangi adımın eksik olduğunu söyleyebilir.


def _is_staff_like(user):
    """Staff/moderatör/admin, son kullanıcı onboarding kurallarının dışındadır."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or user.is_superuser or user.role in (Role.MODERATOR, Role.ADMIN))
    )


class IsEmailVerified(BasePermission):
    """E-posta/Gmail adresini doğrulamamış kullanıcıyı engeller."""

    code = "EMAIL_NOT_VERIFIED"
    message = "Bu işlem için e-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu kontrol edin."

    def has_permission(self, request, view):
        from django.conf import settings

        user = request.user
        if not (user and user.is_authenticated):
            return False
        if not getattr(settings, "ONBOARDING_REQUIRE_EMAIL_VERIFICATION", True):
            return True
        return bool(user.email_verified) or _is_staff_like(user)


class HasProfilePhoto(BasePermission):
    """Profil fotoğrafı olmayan kullanıcıyı engeller (kullanıcı başına tek fotoğraf).

    Zorunluluk yalnızca kuralın getirilmesinden sonra açılan hesaplar için
    geçerlidir: ``User.photo_is_required`` hem platform genelindeki anahtarı
    hem de hesabın kendi bayrağını birlikte değerlendirir, böylece eski
    kullanıcılar bir anda iş verme/iş alma dışında kalmaz.
    """

    code = "PROFILE_PHOTO_REQUIRED"
    message = "Bu işlem için profilinize bir profil fotoğrafı yüklemeniz gerekiyor."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if not user.photo_is_required:
            return True
        return bool(user.has_profile_photo) or _is_staff_like(user)


class IsOnboarded(BasePermission):
    """E-posta doğrulaması **ve** profil fotoğrafı birlikte zorunlu.

    ``IsEmailVerified & HasProfilePhoto`` kombinasyonu yerine tek sınıf olarak
    durmasının nedeni hata mesajıdır: DRF yalnızca başarısız olan ilk iznin
    mesajını döndürür, bu sınıf ise eksik olan adımı tespit edip ona özel
    mesaj/kod üretir.
    """

    code = "ONBOARDING_REQUIRED"
    message = "Bu işlemi gerçekleştirmek için hesap kurulumunuzu tamamlamanız gerekiyor."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if _is_staff_like(user):
            return True

        email_check = IsEmailVerified()
        if not email_check.has_permission(request, view):
            self.code = email_check.code
            self.message = email_check.message
            return False

        photo_check = HasProfilePhoto()
        if not photo_check.has_permission(request, view):
            self.code = photo_check.code
            self.message = photo_check.message
            return False

        return True


class PaymentsEnabled(BasePermission):
    """Ücretsiz dönemde (hafta sonu) her türlü ödeme/ücret akışını kapatır.

    Fiyatların arayüzde gizlenmesi tek başına yeterli değildir — bu sınıf,
    endpoint'e doğrudan istek atılsa bile hafta sonu hiçbir tahsilatın
    başlatılamayacağını garanti eder. Staff hesapları da dahil hiç kimse için
    istisna yoktur: hafta sonu ödeme alınmaz.
    """

    code = "FREE_PERIOD"
    message = (
        "Hafta sonu (Cumartesi–Pazar) TRUGC ücretsizdir; ödeme işlemleri "
        "Pazartesi günü tekrar açılır. Bu süreçte hiçbir ücret alınmaz."
    )

    def has_permission(self, request, view):
        from apps.common import pricing

        return pricing.payments_enabled()
