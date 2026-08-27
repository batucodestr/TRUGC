from rest_framework.permissions import BasePermission


class IsApplicationParty(BasePermission):
    """
    Grants access to either the applying creator or the campaign's owning brand.
    Used for read access; write access is narrowed further per-action in the view.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        return obj.creator.user_id == user.id or obj.campaign.brand.user_id == user.id
