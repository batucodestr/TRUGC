from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus
from apps.common.testing import onboard

from .models import PosPayment, PosPaymentStatus, TransactionStatus


# Ödeme uçları hafta sonu (ücretsiz dönem) kapalıdır; bu sınıf ücretli dönem
# davranışını test ettiği için ücretsiz dönem açıkça kapatılır — böylece test
# haftanın hangi günü koşulduğundan bağımsız olur.
@override_settings(BILLING_FREE_PERIOD_ENABLED=False)
class TransactionTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Test Campaign",
            description="desc",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timezone.timedelta(days=30),
            status=CampaignStatus.PUBLISHED,
        )
        onboard(self.brand_user)
        onboard(self.creator_user)
        self.application = Application.objects.create(
            creator=self.creator_user.creator, campaign=self.campaign, message="hi", status=ApplicationStatus.ACCEPTED
        )

    def test_brand_can_create_escrow_transaction(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("payments:transaction-list")
        response = self.client.post(url, {"application_id": self.application.pk, "amount": "250.00"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], TransactionStatus.HELD_IN_ESCROW)

    def test_creator_cannot_create_transaction(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("payments:transaction-list")
        response = self.client.post(url, {"application_id": self.application.pk, "amount": "250.00"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_release_transaction(self):
        self.client.force_authenticate(self.brand_user)
        create_url = reverse("payments:transaction-list")
        create_response = self.client.post(create_url, {"application_id": self.application.pk, "amount": "250.00"})
        release_url = reverse("payments:transaction-release", args=[create_response.data["id"]])
        response = self.client.post(release_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], TransactionStatus.RELEASED)


FREE_PERIOD = dict(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[0, 1, 2, 3, 4, 5, 6])
PAID_PERIOD = dict(BILLING_FREE_PERIOD_ENABLED=False)


class PricingStateEndpointTests(APITestCase):
    """Frontend'in fiyat gizleme kararını verdiği genel uç."""

    def test_state_is_public_and_server_authoritative(self):
        response = self.client.get(reverse("payments:pricing-state"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("free", "paid", "payments_enabled", "weekday", "weekday_label", "server_time", "timezone"):
            self.assertIn(key, response.data)

    @override_settings(**FREE_PERIOD)
    def test_free_period_is_reported_as_free(self):
        response = self.client.get(reverse("payments:pricing-state"))
        self.assertTrue(response.data["free"])
        self.assertFalse(response.data["payments_enabled"])
        self.assertFalse(response.data["pos"]["available"])

    @override_settings(**PAID_PERIOD)
    def test_paid_period_is_reported_as_paid(self):
        response = self.client.get(reverse("payments:pricing-state"))
        self.assertFalse(response.data["free"])
        self.assertTrue(response.data["payments_enabled"])


@override_settings(**FREE_PERIOD)
class FreePeriodBlocksPaymentsTests(APITestCase):
    """Hafta sonu hiçbir tahsilat başlatılamaz — frontend gizlemesine güvenilmez."""

    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        onboard(self.brand_user)
        onboard(self.creator_user)
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Free weekend campaign",
            description="desc",
            platform="tiktok",
            budget_min=0,
            budget_max=0,
            deadline=timezone.now() + timezone.timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )
        self.application = Application.objects.create(
            creator=self.creator_user.creator,
            campaign=self.campaign,
            message="hi",
            status=ApplicationStatus.ACCEPTED,
        )

    def test_escrow_creation_is_blocked(self):
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(
            reverse("payments:transaction-list"), {"application_id": self.application.pk, "amount": "250.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FREE_PERIOD")

    def test_release_is_blocked(self):
        from .models import Transaction

        escrow = Transaction.objects.create(
            application=self.application,
            payer=self.brand_user,
            payee=self.creator_user,
            amount="100.00",
            status=TransactionStatus.HELD_IN_ESCROW,
        )
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(reverse("payments:transaction-release", args=[escrow.pk]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FREE_PERIOD")

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="499.00")
    def test_pos_checkout_is_blocked_even_when_pos_is_configured(self):
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FREE_PERIOD")

    def test_existing_transactions_remain_readable(self):
        """Geçmiş kayıtlar hafta sonu da görüntülenebilir (yalnızca yeni tahsilat kapalı)."""
        self.client.force_authenticate(self.brand_user)
        response = self.client.get(reverse("payments:transaction-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@override_settings(**PAID_PERIOD)
class PosCheckoutTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        onboard(self.brand_user)
        self.client.force_authenticate(self.brand_user)

    @override_settings(POS_PROVIDER="")
    def test_checkout_fails_loudly_when_pos_is_not_configured(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "POS_NOT_CONFIGURED")

    @override_settings(POS_PROVIDER="paytr", PAYTR_MERCHANT_ID="", PAYTR_MERCHANT_KEY="", PAYTR_MERCHANT_SALT="")
    def test_checkout_reports_missing_credentials(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("PAYTR_MERCHANT_ID", response.data["message"])

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="0")
    def test_brand_access_requires_a_configured_price(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="499.00", BRAND_ACCESS_DAYS=30)
    def test_checkout_creates_a_pending_payment_and_redirect(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["mode"], "redirect")
        self.assertTrue(response.data["redirect_url"])

        payment = PosPayment.objects.get(merchant_oid=response.data["merchant_oid"])
        self.assertEqual(payment.status, PosPaymentStatus.PENDING)
        # Tutar istemciden DEĞİL, sunucudaki yapılandırmadan gelir.
        self.assertEqual(str(payment.amount), "499.00")
        self.assertEqual(payment.access_days, 30)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="499.00")
    def test_client_cannot_dictate_the_access_package_price(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access", "amount": "1.00"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(PosPayment.objects.get().amount), "499.00")

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="499.00")
    def test_creator_cannot_buy_the_brand_access_package(self):
        creator = User.objects.create_user(email="c@example.com", password="StrongPass123", role=Role.CREATOR)
        onboard(creator)
        self.client.force_authenticate(creator)
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True, BRAND_ACCESS_PRICE="499.00")
    def test_checkout_requires_completed_onboarding(self):
        unverified = User.objects.create_user(email="new-brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.client.force_authenticate(unverified)
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "EMAIL_NOT_VERIFIED")

    @override_settings(POS_PROVIDER="sandbox", DEBUG=False, POS_SANDBOX_ALLOW_IN_PROD=False, BRAND_ACCESS_PRICE="10")
    def test_sandbox_provider_refuses_to_run_in_production(self):
        response = self.client.post(reverse("payments:pos-checkout"), {"purpose": "brand_access"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


@override_settings(**PAID_PERIOD)
class PosCallbackTests(APITestCase):
    """Bildirim ucu: doğrulanmış ödeme erişimi açar, doğrulanmamış hiçbir şey yapmaz."""

    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        onboard(self.brand_user)
        self.payment = PosPayment.objects.create(
            user=self.brand_user,
            purpose="brand_access",
            amount="499.00",
            currency="TRY",
            provider="sandbox",
            access_days=30,
            status=PosPaymentStatus.PENDING,
        )
        self.url = reverse("payments:pos-callback", args=["sandbox"])

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True)
    def test_successful_callback_grants_paid_access(self):
        response = self.client.post(self.url, {"merchant_oid": self.payment.merchant_oid, "status": "success"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PosPaymentStatus.PAID)
        self.assertIsNotNone(self.payment.paid_at)

        brand = self.brand_user.brand
        brand.refresh_from_db()
        self.assertTrue(brand.has_paid_access)
        self.assertTrue(brand.paid_access_active)
        self.assertIsNotNone(brand.paid_access_until)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True)
    def test_duplicate_callback_does_not_extend_access_twice(self):
        self.client.post(self.url, {"merchant_oid": self.payment.merchant_oid, "status": "success"})
        brand = self.brand_user.brand
        brand.refresh_from_db()
        first_until = brand.paid_access_until

        self.client.post(self.url, {"merchant_oid": self.payment.merchant_oid, "status": "success"})
        brand.refresh_from_db()
        self.assertEqual(brand.paid_access_until, first_until)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True)
    def test_failed_callback_does_not_grant_access(self):
        self.client.post(self.url, {"merchant_oid": self.payment.merchant_oid, "status": "failed"})
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PosPaymentStatus.FAILED)
        brand = self.brand_user.brand
        brand.refresh_from_db()
        self.assertFalse(brand.has_paid_access)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True)
    def test_unknown_order_reference_is_rejected(self):
        response = self.client.post(self.url, {"merchant_oid": "TRUGCDOESNOTEXIST", "status": "success"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(
        POS_PROVIDER="paytr", PAYTR_MERCHANT_ID="1", PAYTR_MERCHANT_KEY="key", PAYTR_MERCHANT_SALT="salt"
    )
    def test_paytr_callback_with_invalid_signature_is_rejected(self):
        """İmza doğrulanmadan hiçbir ödeme başarılı sayılmaz."""
        payment = PosPayment.objects.create(
            user=self.brand_user,
            purpose="brand_access",
            amount="499.00",
            provider="paytr",
            access_days=30,
            status=PosPaymentStatus.PENDING,
        )
        response = self.client.post(
            reverse("payments:pos-callback", args=["paytr"]),
            {
                "merchant_oid": payment.merchant_oid,
                "status": "success",
                "total_amount": "49900",
                "hash": "forged-hash",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PosPaymentStatus.PENDING)
        brand = self.brand_user.brand
        brand.refresh_from_db()
        self.assertFalse(brand.has_paid_access)

    @override_settings(
        POS_PROVIDER="paytr", PAYTR_MERCHANT_ID="1", PAYTR_MERCHANT_KEY="key", PAYTR_MERCHANT_SALT="salt"
    )
    def test_paytr_callback_with_valid_signature_is_accepted(self):
        import base64
        import hashlib
        import hmac

        payment = PosPayment.objects.create(
            user=self.brand_user,
            purpose="brand_access",
            amount="499.00",
            provider="paytr",
            access_days=30,
            status=PosPaymentStatus.PENDING,
        )
        total_amount = "49900"
        message = f"{payment.merchant_oid}saltsuccess{total_amount}"
        signature = base64.b64encode(hmac.new(b"key", message.encode(), hashlib.sha256).digest()).decode()

        response = self.client.post(
            reverse("payments:pos-callback", args=["paytr"]),
            {
                "merchant_oid": payment.merchant_oid,
                "status": "success",
                "total_amount": total_amount,
                "hash": signature,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PosPaymentStatus.PAID)

    @override_settings(POS_PROVIDER="sandbox", DEBUG=True)
    def test_payment_status_is_only_visible_to_its_owner(self):
        other = User.objects.create_user(email="nosy@example.com", password="StrongPass123", role=Role.BRAND)
        onboard(other)
        self.client.force_authenticate(other)
        response = self.client.get(reverse("payments:pos-payment-detail", args=[self.payment.merchant_oid]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.brand_user)
        own = self.client.get(reverse("payments:pos-payment-detail", args=[self.payment.merchant_oid]))
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertEqual(own.data["merchant_oid"], self.payment.merchant_oid)
