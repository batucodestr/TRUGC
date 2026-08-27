from apps.accounts.permissions import IsOwner


class IsCampaignOwner(IsOwner):
    """Bir marka yalnızca kendi kampanyalarını düzenleyebilir."""

    owner_field_default = "brand.user"


class IsCampaignOwnerOrStaff(IsCampaignOwner):
    """IsCampaignOwner ile aynı, ancak staff/moderatör/admin /manage üzerinden herhangi bir kampanyayı yönetebilir."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff or user.role in ("admin", "moderator"):
            return True
        return super().has_object_permission(request, view, obj)
