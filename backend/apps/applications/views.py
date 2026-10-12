from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.exceptions import error_response
from apps.accounts.permissions import IsBrand, IsCreator, IsOnboarded
from apps.notifications.services import notify_user
from apps.payments import membership as membership_rules

from .models import Application, ApplicationStatus
from .permissions import IsApplicationParty
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    Creator'lar kendi başvurularını oluşturur/listeler/geri çeker.
    Markalar kendi kampanyalarına gelen başvuruları listeler ve kabul/red eder.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsApplicationParty]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "campaign"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.select_related("creator", "creator__user", "campaign", "campaign__brand")
        if user.is_staff or user.role in ("admin", "moderator"):
            return queryset
        return queryset.filter(Q(creator__user=user) | Q(campaign__brand__user=user))

    def get_permissions(self):
        # "İş alma" (creator başvurusu) ve "iş verme" (markanın kabul/red
        # kararı) işlemleri, e-posta doğrulaması ve profil fotoğrafı olmadan
        # yapılamaz. Okuma (listeleme/detay) kısıtlanmaz — kullanıcı mevcut
        # başvurularını her durumda görebilir.
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsCreator(), IsOnboarded()]
        if self.action in ("accept", "reject"):
            return [permissions.IsAuthenticated(), IsApplicationParty(), IsOnboarded()]
        if self.action == "hold":
            return [permissions.IsAuthenticated(), IsApplicationParty()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsCreator(), IsApplicationParty()]
        return super().get_permissions()

    def _is_staff_reviewer(self, request):
        return request.user.is_staff or request.user.role in ("admin", "moderator")

    def create(self, request, *args, **kwargs):
        """Başvuru hakkı kontrolü, doğrulamadan ÖNCE yapılır.

        Hak bittiğinde kullanıcıya alan bazlı bir doğrulama hatası değil,
        ne yapması gerektiğini söyleyen tek bir mesaj döner.

        Ayrıca uç **idempotent**tir: aynı kampanyaya ikinci kez başvurmak hata
        değildir, var olan başvuru 200 ile döner. (creator, campaign) zaten
        benzersiz olduğu için ikinci kayıt hiçbir zaman oluşmaz; eskiden bu
        durum 400'e düşüyor ve kullanıcı "Gönderilen bilgilerde bir hata var"
        görüp akışta ilerleyemiyordu. Oysa yapılacak doğru şey bellidir:
        başvuru zaten var, kullanıcı ödeme adımına geçmelidir. 201 yerine 200
        dönülür, böylece istemci yeni mi oluştu yoksa var olan mı döndü
        ayırt edebilir.
        """
        try:
            membership_rules.check_application_slot(request.user)
        except membership_rules.MembershipRequired as exc:
            return error_response("MEMBERSHIP_REQUIRED", str(exc), status.HTTP_402_PAYMENT_REQUIRED)

        existing = self._existing_application(request)
        if existing is not None:
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def _existing_application(self, request):
        """Kullanıcının bu kampanyaya daha önce yaptığı başvuru (varsa).

        Geçersiz/eksik ``campaign_id`` burada sessizce yutulur: o durumun
        hata mesajını serializer üretir, bu yardımcı yalnızca "zaten var mı"
        sorusunu yanıtlar.
        """
        campaign_id = request.data.get("campaign_id")
        if not campaign_id or not hasattr(request.user, "creator"):
            return None
        try:
            campaign_id = int(campaign_id)
        except (TypeError, ValueError):
            return None
        return (
            Application.objects.filter(creator=request.user.creator, campaign_id=campaign_id)
            .select_related("campaign", "creator")
            .first()
        )

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "creator"):
            raise PermissionDenied("Only creators with a profile can apply to campaigns.")
        application = serializer.save()
        # Hak, başvuru gerçekten oluştuktan SONRA harcanır: doğrulamaya takılan
        # bir istek kullanıcının hakkını yemez.
        membership_rules.consume_application(self.request.user)
        notify_user(
            user=application.campaign.brand.user,
            title="New application received",
            body=f"{application.creator.display_name or application.creator.user.email} applied to '{application.campaign.title}'.",
        )

    def perform_destroy(self, instance):
        if instance.creator.user_id != self.request.user.id:
            raise PermissionDenied("You can only withdraw your own application.")
        instance.status = ApplicationStatus.WITHDRAWN
        instance.save(update_fields=["status"])

    def _set_status(self, request, pk, new_status):
        application = self.get_object()
        if application.campaign.brand.user_id != request.user.id and not self._is_staff_reviewer(request):
            raise PermissionDenied("You do not own this campaign.")
        serializer = ApplicationStatusUpdateSerializer(application, data={"status": new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        notify_user(
            user=application.creator.user,
            title=f"Application {new_status}",
            body=f"Your application to '{application.campaign.title}' was {new_status}.",
        )
        return Response(ApplicationSerializer(application).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return self._set_status(request, pk, ApplicationStatus.ACCEPTED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._set_status(request, pk, ApplicationStatus.REJECTED)

    @action(detail=True, methods=["post"])
    def hold(self, request, pk=None):
        """Yalnızca admin: bir kararı yeniden inceleme için beklemede durumuna geri alır."""
        application = self.get_object()
        if not self._is_staff_reviewer(request):
            raise PermissionDenied("Only staff can put an application on hold.")
        application.status = ApplicationStatus.PENDING
        application.reviewed_at = None
        application.save(update_fields=["status", "reviewed_at"])
        return Response(ApplicationSerializer(application).data)
