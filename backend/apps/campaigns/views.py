from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.exceptions import error_response
from apps.accounts.models import log_admin_action
from apps.accounts.permissions import IsAdminRole, IsBrand, IsModerator, IsOnboarded
from apps.collaborations.logging import log_status_change
from apps.collaborations.models import StatusLog
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user
from apps.payments import membership as membership_rules

from .models import Campaign, CampaignMedia, CampaignRequirement, CampaignStatus
from .permissions import IsCampaignOwnerOrStaff
from .serializers import CampaignMediaSerializer, CampaignRequirementSerializer, CampaignSerializer


def _is_staff(user) -> bool:
    return user.is_authenticated and (user.is_staff or getattr(user, "role", "") in ("admin", "moderator"))


#: Marka (staff olmayan) kendi kampanyasını yalnızca bu durumlara çekebilir.
#: "İncelemede" ve "Devam Ediyor" yalnızca sunucu tarafından atanır.
BRAND_SETTABLE_STATUSES = {
    CampaignStatus.DRAFT,
    CampaignStatus.PUBLISHED,
    CampaignStatus.CANCELLED,
    CampaignStatus.COMPLETED,
}


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Genel kullanıcılar yalnızca yayınlanmış kampanyaları görür. Marka sahipleri
    ayrıca durumdan bağımsız olarak kendi tüm kampanyalarını görür.
    Moderatörler/adminler her şeyi görür.
    """

    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # "brand": markanın kendi kampanyalarını sunucu tarafında süzebilmesi için.
    # Panel eskiden /campaigns/ ilk sayfasını çekip istemcide filtreliyordu;
    # platformdaki kampanya sayısı sayfa boyutunu (20) geçtiğinde markanın
    # kampanyaları listede hiç görünmüyordu.
    filterset_fields = ["status", "platform", "categories", "brand"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "deadline", "budget_max"]
    owner_field = "brand.user"

    def get_queryset(self):
        queryset = (
            Campaign.objects.select_related("brand", "brand__user")
            .prefetch_related("categories", "media_files")
            # Başvuran sayısı serializer'da gösterilir; annotate edilmezse
            # her satır için ayrı bir COUNT sorgusu çalışırdı.
            .annotate(applications_count=Count("applications", filter=Q(applications__awaiting_payment=False)))
            # Annotate GROUP BY ürettiği için Django, Meta.ordering'i
            # "sıralanmış" saymaz (QuerySet.ordered -> False) ve sayfalama
            # tutarsız sonuç uyarısı verir. Sıra burada açıkça tekrarlanır.
            .order_by("-created_at")
        )
        user = self.request.user

        if user.is_authenticated and (user.is_staff or user.role == "moderator" or user.role == "admin"):
            return queryset
        # Premium kampanyalar yalnızca aktif Premium Creator paketi olanlara
        # (ve sahibi markaya) görünür; anonim/Classic kullanıcılar listede
        # göremez ve detaya da ulaşamaz.
        public = Q(status=CampaignStatus.PUBLISHED)
        if not (user.is_authenticated and user.role == "creator" and membership_rules.is_premium_creator(user)):
            public &= Q(is_premium_only=False)
        if user.is_authenticated and user.role == "brand":
            return queryset.filter(public | Q(brand__user=user))
        if user.is_authenticated and user.role == "creator":
            # Başvuru yaptığı kampanya, sonradan "Devam Ediyor" olsa da görünür kalır.
            return queryset.filter(public | Q(applications__creator__user=user, applications__awaiting_payment=False)).distinct()
        return queryset.filter(public)

    def get_permissions(self):
        # "İş verme" yolundaki her yazma işlemi, zorunlu kullanıcı akışının
        # (e-posta doğrulama + profil fotoğrafı) tamamlanmasını gerektirir —
        # IsOnboarded staff/moderatör/admin'i kendi içinde muaf tutar.
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBrand(), IsOnboarded()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsCampaignOwnerOrStaff(), IsOnboarded()]
        if self.action in ("bulk", "approve", "reject"):
            return [permissions.IsAuthenticated(), (IsAdminRole | IsModerator)()]
        if self.action == "recommended":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        """Yayınlanmak istenen ilanda paket kuralı doğrulamadan ÖNCE uygulanır.

        * Paketi hiç olmayan marka engellenmez: ilanı taslak olarak, ödeme
          bekler halde kaydedilir; marka ödeme ekranına yönlendirilir ve paketi
          tanımlandığında ilan kendiliğinden yayına girer
          (bkz. membership.release_awaiting_campaigns). Böylece doldurduğu
          form boşa gitmez.
        * Paketi olup aktif kampanya limiti dolan marka 402 alır.

        Taslak kaydetmek paket istemez.
        """
        self._hold_for_payment = False
        if request.data.get("status") == CampaignStatus.PUBLISHED:
            if membership_rules.campaign_needs_payment(request.user):
                self._hold_for_payment = True
            else:
                try:
                    membership_rules.check_campaign_slot(request.user)
                except membership_rules.MembershipRequired as exc:
                    return error_response("MEMBERSHIP_REQUIRED", str(exc), status.HTTP_402_PAYMENT_REQUIRED)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "brand"):
            raise PermissionDenied("Only brands with a company profile can create campaigns.")
        if getattr(self, "_hold_for_payment", False):
            campaign = serializer.save(status=CampaignStatus.DRAFT, awaiting_payment=True)
        else:
            requested = serializer.validated_data.get("status", CampaignStatus.DRAFT)
            if requested not in BRAND_SETTABLE_STATUSES:
                requested = CampaignStatus.DRAFT
            campaign = serializer.save(status=self._publication_status(self.request.user, requested))
        log_status_change(StatusLog.ENTITY_CAMPAIGN, campaign, "", campaign.status, actor=self.request.user)

    @staticmethod
    def _publication_status(user, requested):
        """Yayınlanmak istenen ilan, onay açıksa önce "İncelemede" olur (admin kendisi yayınlayabilir)."""
        if (
            requested == CampaignStatus.PUBLISHED
            and getattr(settings, "CAMPAIGN_REQUIRES_APPROVAL", False)
            and not _is_staff(user)
        ):
            return CampaignStatus.IN_REVIEW
        return requested

    def update(self, request, *args, **kwargs):
        """Taslağı yayına almak da yeni ilan vermek sayılır: aynı paket kuralı.

        Bu kontrol olmadan marka ilanı taslak kaydedip düzenleme ekranından
        yayına alarak ödemeyi atlayabilirdi.
        """
        instance = self.get_object()
        publishing = (
            request.data.get("status") == CampaignStatus.PUBLISHED and instance.status != CampaignStatus.PUBLISHED
        )
        if publishing and instance.brand.user_id == request.user.id:
            try:
                membership_rules.check_campaign_slot(request.user)
            except membership_rules.MembershipRequired as exc:
                return error_response("MEMBERSHIP_REQUIRED", str(exc), status.HTTP_402_PAYMENT_REQUIRED)
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        old_status = serializer.instance.status
        if "status" in serializer.validated_data and not _is_staff(user):
            requested = serializer.validated_data["status"]
            if requested not in BRAND_SETTABLE_STATUSES and requested != old_status:
                raise PermissionDenied("Bu durum yalnızca sistem tarafından atanabilir.")
            # İncelemedeki ilanı marka kendisi yayına alamaz; onay admin'dedir.
            if old_status == CampaignStatus.IN_REVIEW and requested == CampaignStatus.PUBLISHED:
                requested = CampaignStatus.IN_REVIEW
            elif requested == CampaignStatus.PUBLISHED and old_status != CampaignStatus.PUBLISHED:
                requested = self._publication_status(user, requested)
            serializer.validated_data["status"] = requested
        # Marka ilanı kendisi kapatır veya yayına alırsa artık ödeme sonrası
        # otomatik yayına girecek bir ilan değildir.
        if "status" in serializer.validated_data and serializer.instance.awaiting_payment:
            serializer.validated_data["awaiting_payment"] = False
        campaign = serializer.save()
        log_status_change(StatusLog.ENTITY_CAMPAIGN, campaign, old_status, campaign.status, actor=user)
        if self.request.user.is_staff or self.request.user.role in ("admin", "moderator"):
            log_admin_action(
                self.request.user, "campaign.update", "campaign", campaign.id, f"status={campaign.status}"
            )

    def perform_destroy(self, instance):
        if self.request.user.is_staff or self.request.user.role in ("admin", "moderator"):
            log_admin_action(self.request.user, "campaign.delete", "campaign", instance.id, instance.title)
        instance.delete()

    def _review(self, request, new_status, title, body_tpl):
        campaign = self.get_object()
        if campaign.status != CampaignStatus.IN_REVIEW:
            return error_response("NOT_IN_REVIEW", "Kampanya incelemede değil.", status.HTTP_400_BAD_REQUEST)
        note = str(request.data.get("note", ""))[:255]
        if new_status == CampaignStatus.CANCELLED and not note:
            return error_response("NOTE_REQUIRED", "Red gerekçesi yazın.", status.HTTP_400_BAD_REQUEST)
        old = campaign.status
        campaign.status = new_status
        campaign.review_note = note
        campaign.save(update_fields=["status", "review_note", "updated_at"])
        log_status_change(StatusLog.ENTITY_CAMPAIGN, campaign, old, new_status, actor=request.user, note=note)
        log_admin_action(request.user, f"campaign.{'approve' if new_status == CampaignStatus.PUBLISHED else 'reject'}",
                         "campaign", campaign.id, note)
        notify_user(user=campaign.brand.user, title=title, body=body_tpl.format(title=campaign.title, note=note),
                    notification_type=NotificationType.CAMPAIGN, link="/dashboard/brand/campaigns")
        return Response(self.get_serializer(campaign).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Admin/moderatör: İncelemede → Yayında."""
        return self._review(request, CampaignStatus.PUBLISHED, "Kampanyanız onaylandı",
                            '"{title}" kampanyanız yayına alındı ve creator\'lara gösteriliyor.')

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Admin/moderatör: İncelemede → İptal (gerekçe zorunlu)."""
        return self._review(request, CampaignStatus.CANCELLED, "Kampanyanız reddedildi",
                            '"{title}" kampanyanız onaylanmadı. Gerekçe: {note}')

    @action(detail=False, methods=["get"])
    def recommended(self, request):
        """Creator'a uygun kampanyalar: kategori veya platform eşleşmesi (premium kuralı queryset'te)."""
        creator = getattr(request.user, "creator", None)
        queryset = self.get_queryset().filter(status=CampaignStatus.PUBLISHED)
        if creator is not None:
            platforms = list(creator.social_accounts.values_list("platform", flat=True))
            category_ids = list(creator.categories.values_list("id", flat=True))
            queryset = queryset.exclude(applications__creator=creator)
            matched = queryset.filter(Q(categories__in=category_ids) | Q(platform__in=platforms)).distinct()
            if matched.exists():
                queryset = matched
        return Response(self.get_serializer(queryset[:8], many=True).data)

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        """Yalnızca admin için toplu moderasyon: {action: 'unpublish'|'close'|'delete', ids: [...]}."""
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
    """Giriş yapmış markaya ait bir kampanyanın medya eklerini yönetir."""

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
    """Giriş yapmış markaya ait bir kampanyanın yapılandırılmış teslimatlarını yönetir."""

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
