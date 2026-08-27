from apps.accounts.permissions import IsOwner


class IsCampaignOwner(IsOwner):
    """A brand can only edit its own campaigns."""

    owner_field_default = "brand.user"


class IsCampaignOwnerOrStaff(IsCampaignOwner):
    """Same as IsCampaignOwner, but staff/moderator/admin can moderate any campaign from /manage."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff or user.role in ("admin", "moderator"):
            return True
        return super().has_object_permission(request, view, obj)
