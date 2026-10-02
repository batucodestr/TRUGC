from decimal import Decimal

from rest_framework import serializers

from apps.applications.models import Application, ApplicationStatus
from apps.common import pricing
from apps.common.serializers import FreePeriodPricingMixin

from .models import PaymentPurpose, PosPayment, Transaction


class TransactionSerializer(serializers.ModelSerializer):
    application_id = serializers.PrimaryKeyRelatedField(
        source="application", queryset=Application.objects.filter(status=ApplicationStatus.ACCEPTED)
    )
    payee_email = serializers.EmailField(source="payee.email", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "application_id",
            "payee_email",
            "amount",
            "currency",
            "status",
            "provider",
            "provider_reference",
            "created_at",
            "updated_at",
            "released_at",
        ]
        read_only_fields = ["id", "status", "provider", "provider_reference", "created_at", "updated_at", "released_at"]

    def validate_application_id(self, application):
        request = self.context["request"]
        if application.campaign.brand.user_id != request.user.id:
            raise serializers.ValidationError("You may only pay for your own campaign's applications.")
        return application

    def validate(self, attrs):
        # Hafta sonu hiçbir tahsilat yapılamaz. Endpoint ayrıca PaymentsEnabled
        # izniyle kapatılır; buradaki kontrol, serializer'ın başka bir çağrı
        # noktasından (ör. admin aracı) kullanılması durumunda da kuralın
        # geçerli kalmasını sağlar.
        if pricing.is_free_period():
            raise serializers.ValidationError(
                "Hafta sonu TRUGC ücretsizdir; ödeme işlemleri Pazartesi günü tekrar açılır."
            )
        return attrs

    def create(self, validated_data):
        application = validated_data["application"]
        validated_data["payer"] = self.context["request"].user
        validated_data["payee"] = application.creator.user
        return super().create(validated_data)


class PosPaymentSerializer(FreePeriodPricingMixin, serializers.ModelSerializer):
    """Sanal POS ödeme kaydının istemciye açılan güvenli görünümü.

    ``provider_payload`` bilinçli olarak dışarı verilmez — sağlayıcıdan gelen
    ham alanlar yalnızca sunucu tarafı teşhis/denetim içindir.
    """

    class Meta:
        model = PosPayment
        fields = [
            "merchant_oid",
            "purpose",
            "amount",
            "currency",
            "status",
            "provider",
            "access_days",
            "failure_reason",
            "created_at",
            "paid_at",
        ]
        read_only_fields = fields


class PosCheckoutSerializer(serializers.Serializer):
    """Sanal POS ödeme başlatma isteği.

    ``brand_access``  → markanın creator dizini erişim paketi; tutar sunucudaki
                        yapılandırmadan (``BRAND_ACCESS_PRICE``) alınır,
                        istemciden tutar KABUL EDİLMEZ.
    ``campaign_escrow`` → kabul edilmiş bir başvuru için emanet fonlaması;
                        tutar istemciden gelir ama başvurunun sahipliği
                        sunucuda doğrulanır.
    """

    purpose = serializers.ChoiceField(choices=PaymentPurpose.choices)
    application_id = serializers.IntegerField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=Decimal("0.01"))

    def validate(self, attrs):
        request = self.context["request"]
        purpose = attrs["purpose"]

        if purpose == PaymentPurpose.BRAND_ACCESS:
            if getattr(request.user, "role", None) != "brand" or not hasattr(request.user, "brand"):
                raise serializers.ValidationError("Erişim paketi yalnızca marka hesapları tarafından satın alınabilir.")
            price = pricing.brand_access_price()
            if price <= 0:
                raise serializers.ValidationError(
                    "Erişim paketi fiyatı tanımlı değil (BRAND_ACCESS_PRICE). Lütfen yönetici ile iletişime geçin."
                )
            attrs["amount"] = price
            attrs["access_days"] = pricing.brand_access_days()
            attrs["application"] = None
            return attrs

        # campaign_escrow
        application_id = attrs.get("application_id")
        amount = attrs.get("amount")
        if not application_id or amount is None:
            raise serializers.ValidationError("Emanet ödemesi için application_id ve amount zorunludur.")
        application = (
            Application.objects.select_related("campaign__brand", "creator__user")
            .filter(pk=application_id, status=ApplicationStatus.ACCEPTED)
            .first()
        )
        if application is None:
            raise serializers.ValidationError("Kabul edilmiş bir başvuru bulunamadı.")
        if application.campaign.brand.user_id != request.user.id:
            raise serializers.ValidationError("Yalnızca kendi kampanyanızın başvurusu için ödeme yapabilirsiniz.")
        attrs["application"] = application
        attrs["access_days"] = 0
        return attrs
