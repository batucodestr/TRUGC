from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import log_admin_action
from apps.accounts.permissions import IsAdminRole, IsBrand, IsModerator

from .models import Campaign, CampaignMedia, CampaignRequirement, CampaignStatus
from .permissions import IsCampaignOwnerOrStaff
from .serializers import CampaignMediaSerializer, CampaignRequirementSerializer, CampaignSerializer


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Public users see only published campaigns. Brand owners additionally see
    all of their own campaigns regardless of status. Moderators/admins see everything.
    """

    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "platform", "categories"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "deadline", "budget_max"]
    owner_field = "brand.user"

    def get_queryset(self):
        queryset = Campaign.objects.select_related("brand", "brand__user").prefetch_related(
            "categories", "media_files"
        )
        user = self.request.user

        if user.is_authenticated and (user.is_staff or user.role == "moderator" or user.role == "admin"):
            return queryset
        if user.is_authenticated and user.role == "brand":
            return queryset.filter(Q(status=CampaignStatus.PUBLISHED) | Q(brand__user=user))
        return queryset.filter(status=CampaignStatus.PUBLISHED)

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBrand()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsCampaignOwnerOrStaff()]
        if self.action == "bulk":
            return [permissions.IsAuthenticated(), (IsAdminRole | IsModerator)()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "brand"):
            raise PermissionDenied("Only brands with a company profile can create campaigns.")
        serializer.save()

    def perform_update(self, serializer):
        campaign = serializer.save()
        if self.request.user.is_staff or self.request.user.role in ("admin", "moderator"):
            log_admin_action(
                self.request.user, "campaign.update", "campaign", campaign.id, f"status={campaign.status}"
            )

    def perform_destroy(self, instance):
        if self.request.user.is_staff or self.request.user.role in ("admin", "moderator"):
            log_admin_action(self.request.user, "campaign.delete", "campaign", instance.id, instance.title)
        instance.delete()

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        """Admin-only bulk moderation: {action: 'unpublish'|'close'|'delete', ids: [...]}."""
        op = request.data.get("action")
        ids = request.data.get("ids") or []
        campaigns = Campaign.objects.filter(id__in=ids)
        count = campaigns.count()

        if op == "unpublish":
            campaigns.update(status=CampaignStatus.DRAFT)
        elif op == "close":
            campaigns.update(status=CampaignStatus.CANCELLED)
        elif op == "delete":
            campaigns.delete()
        else:
            return Response({"error": True, "message": "Geçersiz işlem."}, status=400)

        log_admin_action(request.user, f"campaign.bulk_{op}", "campaign", ",".join(map(str, ids)), f"{count} campaigns")
        return Response({"updated": count})


class CampaignMediaViewSet(viewsets.ModelViewSet):
    """Manage media attachments for a campaign owned by the authenticated brand."""

    serializer_class = CampaignMediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrand]

    def get_queryset(self):
        return CampaignMedia.objects.filter(
            campaign_id=self.kwargs["campaign_pk"], campaign__brand__user=self.request.user
        )

    def perform_create(self, serializer):
        campaign = Campaign.objects.filter(pk=self.kwargs["campaign_pk"], brand__user=self.request.user).first()
        if campaign is None:
            raise PermissionDenied("You do not own this campaign.")
        serializer.save(campaign=campaign)


class CampaignRequirementViewSet(viewsets.ModelViewSet):
    """Manage structured deliverables for a campaign owned by the authenticated brand."""

    serializer_class = CampaignRequirementSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrand]

    def get_queryset(self):
        return CampaignRequirement.objects.filter(
            campaign_id=self.kwargs["campaign_pk"], campaign__brand__user=self.request.user
        )

    def perform_create(self, serializer):
        campaign = Campaign.objects.filter(pk=self.kwargs["campaign_pk"], brand__user=self.request.user).first()
        if campaign is None:
            raise PermissionDenied("You do not own this campaign.")
        serializer.save(campaign=campaign)
