from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AdminActionLog, Profile, Role, User, VerificationStatus
from .tokens import email_verification_token


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "phone_number",
            "country",
            "city",
            "timezone",
            "language",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


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


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    verification = VerificationStatusSerializer(read_only=True)

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
            "is_active",
            "is_banned",
            "ban_reason",
            "date_joined",
            "last_login",
        ]


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
        user.save(update_fields=["email_verified"])
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
