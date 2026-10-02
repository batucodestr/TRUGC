import logging

from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import error_response
from apps.accounts.permissions import IsBrand, IsOnboarded, PaymentsEnabled
from apps.common import pricing
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import PaymentPurpose, PosPayment, PosPaymentStatus, Transaction, TransactionStatus
from .pos import PosError, PosNotConfigured, get_pos_provider, pos_status
from .serializers import PosCheckoutSerializer, PosPaymentSerializer, TransactionSerializer

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        # Caddy, gerçek istemci IP'sini listenin başına ekler.
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class TransactionViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Brands initiate escrow transactions for accepted applications on their campaigns.
    Both parties (payer/payee) and staff can view. Release/refund are moderated actions.

    Hafta sonu (ücretsiz dönem) oluşturma ve serbest bırakma uçları kapalıdır —
    bkz. apps/common/pricing.py ve PaymentsEnabled izni.
    """

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.select_related("application", "payer", "payee")
        if user.is_staff or user.role in ("admin", "moderator"):
            return queryset
        return queryset.filter(Q(payer=user) | Q(payee=user))

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBrand(), IsOnboarded(), PaymentsEnabled()]
        if self.action == "release":
            return [permissions.IsAuthenticated(), PaymentsEnabled()]
        return super().get_permissions()

    def perform_create(self, serializer):
        transaction = serializer.save(status=TransactionStatus.HELD_IN_ESCROW)
        notify_user(
            user=transaction.payee,
            title="Payment held in escrow",
            body=f"{transaction.amount} {transaction.currency} has been placed in escrow for your work.",
            notification_type=NotificationType.PAYMENT,
        )

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        transaction = self.get_object()
        if transaction.payer_id != request.user.id and not (request.user.is_staff or request.user.role in ("admin", "moderator")):
            raise PermissionDenied("Only the payer or a moderator can release funds.")
        if transaction.status != TransactionStatus.HELD_IN_ESCROW:
            return error_response("VALIDATION_ERROR", "Yalnızca emanetteki işlemler serbest bırakılabilir.", 400)
        transaction.status = TransactionStatus.RELEASED
        transaction.released_at = timezone.now()
        transaction.save(update_fields=["status", "released_at"])
        notify_user(
            user=transaction.payee,
            title="Payment released",
            body=f"{transaction.amount} {transaction.currency} has been released to you.",
            notification_type=NotificationType.PAYMENT,
        )
        return Response(TransactionSerializer(transaction).data)


# ---------------------------------------------------------------------------
# Ücretlendirme durumu (hafta sonu ücretsiz / hafta içi ücretli)
# ---------------------------------------------------------------------------
class PricingStateView(APIView):
    """Sunucu saatine göre ücretlendirme durumu — frontend'in **tek** kaynağı.

    Herkese açıktır (giriş gerekmez) çünkü pazarlama sayfalarındaki fiyat
    bölümleri de bu duruma göre gizlenir. Kullanıcının cihaz saatine asla
    güvenilmez: gün hesabı yalnızca burada, sunucu saatiyle yapılır.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        state = pricing.pricing_state().as_dict()
        pos = pos_status()
        state["pos"] = {
            "provider": pos["provider"],
            "configured": pos["configured"],
            # Ücretsiz dönemde POS, yapılandırılmış olsa bile kullanılamaz.
            "available": pos["configured"] and state["payments_enabled"],
        }
        state["brand_access_plan"] = {
            "price": str(pricing.brand_access_price()),
            "days": pricing.brand_access_days(),
            # Fiyat 0 ise satın alma akışı kapalıdır (admin manuel açar).
            "purchasable": state["payments_enabled"] and pos["configured"] and pricing.brand_access_price() > 0,
        }
        return Response(state)


# ---------------------------------------------------------------------------
# Sanal POS
# ---------------------------------------------------------------------------
class PosConfigView(APIView):
    """POS yapılandırma özeti. Eksik ayar adlarını yalnızca staff'a gösterir."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        summary = pos_status()
        if not pricing.is_privileged(request.user):
            summary.pop("missing_settings", None)
        summary["payments_enabled"] = pricing.payments_enabled()
        return Response(summary)


class PosCheckoutView(APIView):
    """Sanal POS ödemesi başlatır ve kullanıcının yönlendirileceği adresi döner.

    Ücretsiz dönemde (hafta sonu) ``PaymentsEnabled`` izni bu ucu tamamen
    kapatır — hafta sonu hiçbir ödeme başlatılamaz.
    """

    permission_classes = [permissions.IsAuthenticated, IsOnboarded, PaymentsEnabled]
    throttle_scope = "burst"

    @extend_schema(request=PosCheckoutSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        # POS yapılandırması ÖNCE kontrol edilir: entegrasyon hiç kurulmamışsa
        # kullanıcıya "fiyat tanımlı değil" gibi dolaylı bir doğrulama hatası
        # değil, doğrudan "POS yapılandırılmadı" (503) döner.
        try:
            provider = get_pos_provider()
            provider.ensure_configured()
        except PosNotConfigured as exc:
            return error_response("POS_NOT_CONFIGURED", str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)

        serializer = PosCheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        application = data.get("application")
        escrow_transaction = None
        if data["purpose"] == PaymentPurpose.CAMPAIGN_ESCROW:
            # Emanet kaydı "pending" olarak açılır; yalnızca ödeme onaylanınca
            # emanete alınmış sayılır (bkz. _apply_successful_payment).
            escrow_transaction = Transaction.objects.create(
                application=application,
                payer=request.user,
                payee=application.creator.user,
                amount=data["amount"],
                currency=pricing.currency(),
                status=TransactionStatus.PENDING,
                provider=provider.name,
            )

        payment = PosPayment.objects.create(
            user=request.user,
            purpose=data["purpose"],
            amount=data["amount"],
            currency=pricing.currency(),
            provider=provider.name,
            access_days=data.get("access_days", 0),
            transaction=escrow_transaction,
            client_ip=_client_ip(request),
        )

        return_url = f"{settings.POS_RETURN_URL}?oid={payment.merchant_oid}"
        callback_url = request.build_absolute_uri(f"/api/v1/payments/pos/callback/{provider.name}/")
        buyer = {
            "email": request.user.email,
            "name": getattr(getattr(request.user, "profile", None), "full_name", "") or "",
            "product_name": (
                "TRUGC creator erişim paketi"
                if data["purpose"] == PaymentPurpose.BRAND_ACCESS
                else "TRUGC kampanya ödemesi"
            ),
            "callback_url": callback_url,
        }

        try:
            session = provider.start(payment, return_url=return_url, buyer=buyer)
        except PosError as exc:
            payment.status = PosPaymentStatus.FAILED
            payment.failure_reason = str(exc)[:255]
            payment.save(update_fields=["status", "failure_reason", "updated_at"])
            if escrow_transaction is not None:
                escrow_transaction.status = TransactionStatus.FAILED
                escrow_transaction.save(update_fields=["status", "updated_at"])
            # Yapılandırma eksikliği 503 (bizim tarafımızdaki eksik ayar),
            # sağlayıcı/ağ hatası 502 (yukarı akış hatası) olarak ayrışır.
            http_status = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if isinstance(exc, PosNotConfigured)
                else status.HTTP_502_BAD_GATEWAY
            )
            return error_response(getattr(exc, "code", "POS_ERROR"), str(exc), http_status)

        payment.status = PosPaymentStatus.PENDING
        payment.provider_reference = session.provider_reference
        payment.provider_payload = session.raw
        payment.save(update_fields=["status", "provider_reference", "provider_payload", "updated_at"])

        return Response(
            {
                "merchant_oid": payment.merchant_oid,
                "mode": session.mode,
                "redirect_url": session.url,
                "form_html": session.html,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "provider": provider.name,
            },
            status=status.HTTP_201_CREATED,
        )


def _apply_successful_payment(payment: PosPayment):
    """Ödeme onaylandığında yapılan yan etkiler. **Idempotent** olmak zorundadır:
    sağlayıcılar aynı bildirimi birden fazla kez gönderebilir."""
    if payment.status == PosPaymentStatus.PAID:
        return

    payment.status = PosPaymentStatus.PAID
    payment.paid_at = timezone.now()
    payment.failure_reason = ""
    payment.save(update_fields=["status", "paid_at", "failure_reason", "updated_at"])

    if payment.purpose == PaymentPurpose.BRAND_ACCESS:
        brand = getattr(payment.user, "brand", None)
        if brand is not None:
            until = brand.grant_paid_access(payment.access_days or pricing.brand_access_days())
            notify_user(
                user=payment.user,
                title="Erişim paketiniz aktif",
                body=f"Creator dizinine erişiminiz {until:%d.%m.%Y} tarihine kadar açıldı.",
                notification_type=NotificationType.PAYMENT,
            )
    elif payment.transaction_id:
        escrow = payment.transaction
        escrow.status = TransactionStatus.HELD_IN_ESCROW
        escrow.provider = payment.provider
        escrow.provider_reference = payment.provider_reference
        escrow.save(update_fields=["status", "provider", "provider_reference", "updated_at"])
        notify_user(
            user=escrow.payee,
            title="Ödeme emanete alındı",
            body=f"{escrow.amount} {escrow.currency} tutarındaki ödeme işiniz için emanete alındı.",
            notification_type=NotificationType.PAYMENT,
        )


@method_decorator(csrf_exempt, name="dispatch")
class PosCallbackView(APIView):
    """Sağlayıcının sunucudan sunucuya bildirim ucu.

    * Kimlik doğrulama yoktur (banka JWT taşımaz) — güven, sağlayıcının
      imzasının/teyit çağrısının doğrulanmasından gelir, istemcinin
      söylediğinden değil.
    * **Ücretsiz dönemde de çalışır:** hafta içi başlatılmış bir ödemenin
      bildirimi hafta sonuna sarkabilir; parası çekilmiş bir işlemi
      "hafta sonu ücretsiz" diye reddetmek kullanıcıyı mağdur ederdi.
      Ödeme *başlatma* ucu kapalıdır, bildirim ucu değil.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.STR)
    def post(self, request, provider_name):
        try:
            provider = get_pos_provider(provider_name)
        except PosNotConfigured as exc:
            return error_response("POS_NOT_CONFIGURED", str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)

        data = {**request.data} if isinstance(request.data, dict) else {}
        lookup = provider.callback_lookup_key(data)
        if not lookup:
            return error_response("VALIDATION_ERROR", "Sipariş referansı bulunamadı.", status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            payment = PosPayment.objects.select_for_update().filter(merchant_oid=lookup).first()
            if payment is None:
                logger.warning("Bilinmeyen POS sipariş referansı için bildirim alındı: %s", lookup)
                return error_response("NOT_FOUND", "Ödeme kaydı bulunamadı.", status.HTTP_404_NOT_FOUND)

            if payment.status == PosPaymentStatus.PAID:
                # Yinelenen bildirim: yan etkiler tekrar uygulanmaz.
                return Response(provider_response("OK"), content_type="text/plain")

            try:
                result = provider.handle_callback(payment, data)
            except PosError as exc:
                logger.warning("POS bildirimi doğrulanamadı (%s): %s", payment.merchant_oid, exc)
                return error_response(getattr(exc, "code", "POS_ERROR"), str(exc), status.HTTP_400_BAD_REQUEST)

            payment.provider_payload = {**(payment.provider_payload or {}), "callback": result.raw}
            if result.provider_reference:
                payment.provider_reference = result.provider_reference

            if result.success:
                payment.save(update_fields=["provider_payload", "provider_reference", "updated_at"])
                _apply_successful_payment(payment)
            else:
                payment.status = PosPaymentStatus.FAILED
                payment.failure_reason = result.message[:255]
                payment.save(
                    update_fields=["status", "failure_reason", "provider_payload", "provider_reference", "updated_at"]
                )
                if payment.transaction_id:
                    escrow = payment.transaction
                    escrow.status = TransactionStatus.FAILED
                    escrow.save(update_fields=["status", "updated_at"])

        return Response(provider_response(result.response_body), content_type="text/plain")


def provider_response(body: str) -> str:
    """Sağlayıcının beklediği ham yanıt gövdesi (PayTR yalnızca "OK" kabul eder)."""
    return body if body else "OK"


class PosPaymentDetailView(APIView):
    """Ödeme dönüş sayfasının durumu yoklamak için kullandığı uç.

    Kullanıcı yalnızca kendi ödemelerini görebilir; durum **sunucudaki** kayda
    göre döner, ödeme sağlayıcısından dönen URL parametrelerine güvenilmez.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=PosPaymentSerializer)
    def get(self, request, merchant_oid):
        payment = PosPayment.objects.filter(merchant_oid=merchant_oid).first()
        if payment is None:
            return error_response("NOT_FOUND", "Ödeme kaydı bulunamadı.", status.HTTP_404_NOT_FOUND)
        if payment.user_id != request.user.id and not pricing.is_privileged(request.user):
            raise PermissionDenied("Bu ödeme kaydını görüntüleme yetkiniz yok.")
        return Response(PosPaymentSerializer(payment, context={"request": request}).data)


class MyPosPaymentListView(APIView):
    """Kullanıcının kendi sanal POS ödeme geçmişi."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=PosPaymentSerializer(many=True))
    def get(self, request):
        payments = PosPayment.objects.filter(user=request.user)[:50]
        return Response(PosPaymentSerializer(payments, many=True, context={"request": request}).data)
