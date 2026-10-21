from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.exceptions import error_response
from apps.accounts.models import log_admin_action
from apps.accounts.permissions import IsAdminRole, IsBrand, IsModerator, IsOnboarded
from apps.payments import membership as membership_rules

from .models import Campaign, CampaignMedia, CampaignRequirement, CampaignStatus
from .permissions import IsCampaignOwnerOrStaff
from .serializers import CampaignMediaSerializer, CampaignRequirementSerializer, CampaignSerializer


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
        if user.is_authenticated and user.role == "brand":
            return queryset.filter(Q(status=CampaignStatus.PUBLISHED) | Q(brand__user=user))
        return queryset.filter(status=CampaignStatus.PUBLISHED)

    def get_permissions(self):
        # "İş verme" yolundaki her yazma işlemi, zorunlu kullanıcı akışının
        # (e-posta doğrulama + profil fotoğrafı) tamamlanmasını gerektirir —
        # IsOnboarded staff/moderatör/admin'i kendi içinde muaf tutar.
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBrand(), IsOnboarded()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsCampaignOwnerOrStaff(), IsOnboarded()]
        if self.action == "bulk":
            return [permissions.IsAuthenticated(), (IsAdminRole | IsModerator)()]
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
            serializer.save(status=CampaignStatus.DRAFT, awaiting_payment=True)
            return
        serializer.save()

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
        # Marka ilanı kendisi kapatır veya yayına alırsa artık ödeme sonrası
        # otomatik yayına girecek bir ilan değildir.
        if "status" in serializer.validated_data and serializer.instance.awaiting_payment:
            serializer.validated_data["awaiting_payment"] = False
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
