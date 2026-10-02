from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AdminActionLog, Profile, User, VerificationStatus


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    fk_name = "user"
    extra = 0


class VerificationStatusInline(admin.StackedInline):
    model = VerificationStatus
    can_delete = False
    fk_name = "user"
    extra = 0
    readonly_fields = ["submitted_at"]


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    inlines = [ProfileInline, VerificationStatusInline]
    ordering = ["-date_joined"]
    list_display = ["email", "role", "is_verified", "email_verified", "is_active", "is_banned", "is_staff", "date_joined"]
    list_filter = ["role", "is_verified", "email_verified", "profile_photo_required", "is_active", "is_banned", "is_staff"]
    search_fields = ["email"]
    readonly_fields = ["date_joined", "last_login", "last_login_ip", "email_verified_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Role & status", {"fields": ("role", "is_verified", "is_active", "is_banned", "ban_reason", "is_staff", "is_superuser")}),
        (
            "Onboarding",
            {
                "fields": ("email_verified", "email_verified_at", "profile_photo_required"),
                "description": (
                    "Zorunlu akış: e-posta doğrulama + profil fotoğrafı. "
                    "profile_photo_required, kural getirilmeden önce var olan hesaplarda kapalıdır; "
                    "tek bir kullanıcıyı muaf tutmak ya da zorunlu kılmak için buradan değiştirilir."
                ),
            },
        ),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined", "last_login_ip")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "role", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(VerificationStatus)
class VerificationStatusAdmin(admin.ModelAdmin):
    list_display = ["user", "status", "submitted_at", "reviewed_at", "reviewed_by"]
    list_filter = ["status"]
    search_fields = ["user__email"]
    autocomplete_fields = ["user", "reviewed_by"]


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ["action", "actor", "target_type", "target_id", "created_at"]
    list_filter = ["action", "target_type"]
    search_fields = ["actor__email", "target_id", "detail"]
    readonly_fields = ["actor", "action", "target_type", "target_id", "detail", "created_at"]

    def has_add_permission(self, request):
        return False
