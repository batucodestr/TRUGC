from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.validators import (
    avatar_extension_validator,
    document_extension_validator,
    validate_avatar_image,
    validate_avatar_size,
    validate_document_size,
)


class Role(models.TextChoices):
    CREATOR = "creator", _("Creator")
    BRAND = "brand", _("Brand")
    MODERATOR = "moderator", _("Moderator")
    ADMIN = "admin", _("Admin")


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", Role.CREATOR)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Özel kullanıcı modeli. Kimlik doğrulamada kullanılan benzersiz tanımlayıcı e-postadır."""

    email = models.EmailField(_("email address"), unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CREATOR, db_index=True)

    is_active = models.BooleanField(default=True)
    is_banned = models.BooleanField(default=False, help_text="Permanently banned by an admin (distinct from a temporary suspension).")
    ban_reason = models.CharField(max_length=255, blank=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(
        default=False, help_text="Whether the user has completed identity verification (see VerificationStatus)."
    )
    email_verified = models.BooleanField(default=False, help_text="Whether the user has confirmed their email address.")
    email_verified_at = models.DateTimeField(
        null=True, blank=True, help_text="When the user confirmed their email address (audit trail)."
    )
    # Zorunlu profil fotoğrafı YALNIZCA yeni hesaplar için geçerlidir. Bu alan
    # yeni kayıtlarda True olarak başlar; kural devreye girdiği anda var olan
    # hesaplar için bir veri taşıma adımıyla False'a çekildi (bkz.
    # accounts/migrations/0008). Böylece eski kullanıcılar bir anda iş
    # verme/iş alma dışında kalmaz, yeni kullanıcılar ise fotoğraf yüklemeden
    # ilerleyemez. Tarih/saat karşılaştırmasına dayanmaz: kullanıcı başına
    # açık bir bayrak, sunucu saatine veya bir ayara göre kayan bir eşikten
    # daha öngörülebilirdir.
    profile_photo_required = models.BooleanField(
        default=True,
        help_text=(
            "Whether this account must upload a profile photo before using the main features. "
            "Pre-existing accounts were grandfathered out when the rule was introduced."
        ),
    )

    date_joined = models.DateTimeField(default=timezone.now)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        return self.email

    @property
    def is_creator(self):
        return self.role == Role.CREATOR

    @property
    def is_brand(self):
        return self.role == Role.BRAND

    @property
    def is_moderator(self):
        return self.role == Role.MODERATOR

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN

    @property
    def has_profile_photo(self):
        """Zorunlu profil fotoğrafının yüklenmiş olup olmadığı.

        ``Profile`` satırı kayıt anında post_save sinyaliyle oluşturulur, ancak
        (ör. doğrudan ORM ile oluşturulmuş eski kayıtlarda) eksik olabileceği
        için erişim savunmacı yapılır.
        """
        profile = getattr(self, "profile", None)
        return bool(profile and profile.avatar)

    @property
    def photo_is_required(self):
        """Bu hesabın profil fotoğrafı yüklemesi zorunlu mu?

        İki koşulun birleşimidir: platform genelindeki ``ONBOARDING_REQUIRE_PROFILE_PHOTO``
        anahtarı ve hesabın kendi ``profile_photo_required`` bayrağı. İkincisi,
        kural getirilmeden önce var olan hesapları muaf tutar.
        """
        from django.conf import settings

        if not getattr(settings, "ONBOARDING_REQUIRE_PROFILE_PHOTO", True):
            return False
        return bool(self.profile_photo_required)

    @property
    def onboarding_complete(self):
        """Kayıt → e-posta doğrulama → profil fotoğrafı akışının tamamlanıp
        tamamlanmadığı. İş verme/iş alma gibi ana işlemlerin ön koşuludur
        (bkz. apps/accounts/permissions.py::IsOnboarded)."""
        from django.conf import settings

        if getattr(settings, "ONBOARDING_REQUIRE_EMAIL_VERIFICATION", True) and not self.email_verified:
            return False
        if self.photo_is_required and not self.has_profile_photo:
            return False
        return True


class Profile(models.Model):
    """Her rol tarafından paylaşılan ortak profil alanları."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    # Kullanıcı başına TEK profil fotoğrafı: Profile, User ile OneToOne olduğu
    # ve bu tek alanı taşıdığı için "birden fazla fotoğraf" durumu şema
    # düzeyinde imkânsızdır. Yeni bir yükleme, eskisini depolamadan da silerek
    # yerine geçer (bkz. apps/accounts/serializers.py::ProfileSerializer).
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        null=True,
        blank=True,
        validators=[avatar_extension_validator, validate_avatar_size, validate_avatar_image],
    )
    phone_number = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=64, blank=True, default="UTC")
    language = models.CharField(max_length=10, blank=True, default="en")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_profile"

    def __str__(self):
        return f"Profile<{self.user.email}>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def has_photo(self):
        return bool(self.avatar)


class VerificationStatus(models.Model):
    class Status(models.TextChoices):
        UNVERIFIED = "unverified", _("Unverified")
        PENDING = "pending", _("Pending review")
        VERIFIED = "verified", _("Verified")
        REJECTED = "rejected", _("Rejected")

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="verification")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNVERIFIED, db_index=True)
    document = models.FileField(
        upload_to="verification_documents/%Y/%m/",
        null=True,
        blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_verifications"
    )

    class Meta:
        db_table = "accounts_verification_status"
        verbose_name_plural = "Verification statuses"
        ordering = ["-id"]

    def __str__(self):
        return f"Verification<{self.user.email}:{self.status}>"


class AdminActionLog(models.Model):
    """/manage panelinden yapılan her değiştirici işlem için denetim kaydı."""

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="admin_actions")
    action = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.CharField(max_length=50, blank=True)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "accounts_admin_action_log"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} by {self.actor_id} @ {self.created_at}"


def log_admin_action(actor, action, target_type="", target_id="", detail=""):
    return AdminActionLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else "",
        detail=detail,
    )
