from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.common.validators import (
    avatar_extension_validator,
    validate_avatar_image,
    validate_avatar_size,
)

from .models import AdminActionLog, Profile, Role, User, VerificationStatus
from .tokens import email_verification_token


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    has_photo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "has_photo",
            "phone_number",
            "country",
            "city",
            "timezone",
            "language",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_avatar(self, value):
        """Profil fotoğrafı zorunludur: var olan fotoğraf boş bir değerle silinemez.

        Dosya tipi/boyut/içerik doğrulaması model alanının validator'ları
        tarafından yapılır (apps/common/validators.py) — burada yalnızca
        "fotoğrafı kaldırma" girişimi engellenir, çünkü her kullanıcının
        profilinde her zaman tam olarak bir fotoğraf bulunmalıdır.
        """
        if value in (None, ""):
            raise serializers.ValidationError("Profil fotoğrafı zorunludur ve kaldırılamaz.")
        return value

    def update(self, instance, validated_data):
        """Yeni fotoğraf, eskisinin **yerine geçer** — depolamada tek dosya kalır.

        Django, bir ``ImageField``'a yeni dosya atandığında eski dosyayı
        kendiliğinden silmez; bu, her yüklemede diskte yetim bir dosya
        bırakırdı ("kullanıcı başına 1 adet profil fotoğrafı" kuralının
        depolama tarafındaki karşılığı).
        """
        new_avatar = validated_data.get("avatar")
        previous = instance.avatar.name if instance.avatar else None

        instance = super().update(instance, validated_data)

        if new_avatar is not None and previous and previous != instance.avatar.name:
            instance.avatar.storage.delete(previous)

        return instance


class ProfilePhotoSerializer(serializers.ModelSerializer):
    """Yalnızca zorunlu profil fotoğrafı alanı (onboarding yüklemesi için).

    Tipi/boyutu/içeriği model validator'ları doğrular; "eskisini sil, yerine
    yenisini koy" davranışı ProfileSerializer ile aynıdır.
    """

    # Alanı açıkça tanımladığımız için model validator'ları otomatik
    # kopyalanmaz — tip/boyut/içerik doğrulayıcıları burada elle bağlanır,
    # aksi halde yalnızca DRF'nin genel "bu bir görsel mi" kontrolü kalırdı.
    avatar = serializers.ImageField(
        required=True,
        allow_null=False,
        validators=[avatar_extension_validator, validate_avatar_size, validate_avatar_image],
    )
    has_photo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = ["avatar", "has_photo", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_avatar(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("Profil fotoğrafı zorunludur.")
        return value

    def update(self, instance, validated_data):
        previous = instance.avatar.name if instance.avatar else None
        instance = super().update(instance, validated_data)
        if previous and previous != instance.avatar.name:
            instance.avatar.storage.delete(previous)
        return instance


class VerificationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationStatus
        fields = ["status", "document", "notes", "submitted_at", "reviewed_at"]
        read_only_fields = ["status", "notes", "reviewed_at"]


class VerificationQueueUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "role"]


class VerificationQueueSerializer(serializers.ModelSerializer):
    """Moderatör kuyruğu tarafından kullanılır (listeleme + inceleme); kullanıcının
    kendi doğrulama durumu için kullanılan `VerificationStatusSerializer`'ın aksine,
    bu inceleme endpoint'inin URL'sinin ihtiyaç duyduğu satır `id`'sini ve kuyruğu
    oluşturmak için yeterli kullanıcı bilgisini sunar."""

    user = VerificationQueueUserSerializer(read_only=True)

    class Meta:
        model = VerificationStatus
        fields = ["id", "user", "status", "document", "notes", "submitted_at", "reviewed_at"]
        read_only_fields = fields


class OnboardingStatusSerializer(serializers.Serializer):
    """Zorunlu kullanıcı akışının (kayıt → e-posta doğrulama → profil fotoğrafı
    → kullanım) o anki durumu. Frontend, kullanıcıyı eksik adıma yönlendirmek
    için bunu okur; gerçek engelleme her endpoint'te izin sınıflarıyla yapılır."""

    email_verified = serializers.BooleanField()
    has_profile_photo = serializers.BooleanField()
    email_verification_required = serializers.BooleanField()
    profile_photo_required = serializers.BooleanField()
    complete = serializers.BooleanField()
    next_step = serializers.CharField(allow_null=True)


def build_onboarding_status(user) -> dict:
    from django.conf import settings

    email_required = bool(getattr(settings, "ONBOARDING_REQUIRE_EMAIL_VERIFICATION", True))
    # Fotoğraf zorunluluğu kullanıcıya göre değişir: kural getirilmeden önce
    # var olan hesaplar muaftır (bkz. User.photo_is_required).
    photo_required = bool(user.photo_is_required)
    email_verified = bool(user.email_verified)
    has_photo = bool(user.has_profile_photo)

    if email_required and not email_verified:
        next_step = "verify_email"
    elif photo_required and not has_photo:
        next_step = "upload_photo"
    else:
        next_step = None

    return {
        "email_verified": email_verified,
        "has_profile_photo": has_photo,
        "email_verification_required": email_required,
        "profile_photo_required": photo_required,
        "complete": next_step is None,
        "next_step": next_step,
    }


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    verification = VerificationStatusSerializer(read_only=True)
    has_profile_photo = serializers.BooleanField(read_only=True)
    onboarding = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "is_staff",
            "is_superuser",
            "is_verified",
            "email_verified",
            "email_verified_at",
            "has_profile_photo",
            "profile_photo_required",
            "onboarding",
            "is_active",
            "is_banned",
            "ban_reason",
            "date_joined",
            "last_login",
            "profile",
            "verification",
        ]
        read_only_fields = [
            "id",
            "role",
            "is_staff",
            "is_superuser",
            "is_verified",
            "email_verified",
            "email_verified_at",
            "profile_photo_required",
            "is_active",
            "is_banned",
            "ban_reason",
            "date_joined",
            "last_login",
        ]

    def get_onboarding(self, obj):
        return build_onboarding_status(obj)


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = AdminActionLog
        fields = ["id", "actor_email", "action", "target_type", "target_id", "detail", "created_at"]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[(Role.CREATOR, Role.CREATOR.label), (Role.BRAND, Role.BRAND.label)])

    class Meta:
        model = User
        fields = ["email", "password", "password_confirm", "role"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Token yanıt verisine rol ve doğrulama bilgisini ekler."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role
        data["email"] = self.user.email
        data["is_verified"] = self.user.is_verified
        data["user_id"] = self.user.id
        data["is_staff"] = self.user.is_staff
        data["is_superuser"] = self.user.is_superuser
        # Zorunlu akışın durumu da token yanıtına eklenir: frontend, girişten
        # hemen sonra kullanıcıyı doğrulama/fotoğraf adımına yönlendirebilmek
        # için bunu ayrı bir istek atmadan bilmek zorundadır.
        data["email_verified"] = self.user.email_verified
        data["onboarding"] = build_onboarding_status(self.user)
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError({"uid": "Invalid reset link."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired reset link."})

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class EmailVerificationConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError({"uid": "Invalid verification link."})

        if user.email_verified:
            raise serializers.ValidationError({"token": "This email address is already verified."})

        if not email_verification_token.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired verification link."})

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.email_verified = True
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified", "email_verified_at"])
        return user


class VerificationSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationStatus
        fields = ["document"]

    def update(self, instance, validated_data):
        instance.document = validated_data.get("document", instance.document)
        instance.status = VerificationStatus.Status.PENDING
        instance.submitted_at = timezone.now()
        instance.save(update_fields=["document", "status", "submitted_at"])
        return instance
