from rest_framework.permissions import BasePermission


class IsApplicationParty(BasePermission):
    """
    Grants access to either the applying creator or the campaign's owning brand,
    plus staff/moderator/admin so /manage can review any application. Used for
    read access; write access is narrowed further per-action in the view.

    Without the staff bypass here, ApplicationViewSet.get_object() rejected an
    admin's accept/reject/hold request with a 403 before _set_status()'s own
    (correct) staff check ever ran — the "Onayla" button in /manage/applications
    silently failed for every admin/moderator account.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff or user.role in ("admin", "moderator"):
            return True
        return obj.creator.user_id == user.id or obj.campaign.brand.user_id == user.id
