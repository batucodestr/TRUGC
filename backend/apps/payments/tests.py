import re
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import AdminActionLog, Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus
from apps.common.testing import onboard
from apps.notifications.models import Notification

from .models import Membership, PaymentDeclaration, PosPayment, PosPaymentStatus, TransactionStatus, Wallet
from .packages import PACKAGES


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


# ---------------------------------------------------------------------------
# Bakiye ve üyelik paketi (admin paneli)
# ---------------------------------------------------------------------------
class WalletAndMembershipTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin@example.com", password="StrongPass123", role=Role.ADMIN)
        self.moderator = User.objects.create_user(
            email="mod@example.com", password="StrongPass123", role=Role.MODERATOR
        )
        self.creator = User.objects.create_user(
            email="walletcreator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.wallet_url = reverse("payments:user-wallet", args=[self.creator.id])
        self.membership_url = reverse("payments:user-membership", args=[self.creator.id])

    def test_admin_can_credit_balance_and_ledger_records_it(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.wallet_url, {"amount": "699.00", "note": "Havale · dekont #12"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["balance"]), Decimal("699.00"))

        entries = response.data["entries"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["kind"], "admin_credit")
        self.assertEqual(Decimal(entries[0]["balance_after"]), Decimal("699.00"))
        self.assertEqual(entries[0]["created_by_email"], self.admin.email)

    def test_credits_accumulate(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "100"})
        response = self.client.post(self.wallet_url, {"amount": "49.50"})
        self.assertEqual(Decimal(response.data["balance"]), Decimal("149.50"))
        self.assertEqual(len(response.data["entries"]), 2)

    def test_debit_cannot_push_balance_below_zero(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "100"})
        response = self.client.post(self.wallet_url, {"amount": "-150"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Reddedilen düşüm bakiyeyi ve defteri hiç değiştirmemeli.
        wallet = self.client.get(self.wallet_url)
        self.assertEqual(Decimal(wallet.data["balance"]), Decimal("100.00"))
        self.assertEqual(len(wallet.data["entries"]), 1)

    def test_zero_amount_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.wallet_url, {"amount": "0"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_moderator_cannot_touch_balances(self):
        self.client.force_authenticate(self.moderator)
        self.assertEqual(self.client.get(self.wallet_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(self.wallet_url, {"amount": "100"}).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_user_cannot_credit_their_own_balance(self):
        self.client.force_authenticate(self.creator)
        response = self.client.post(self.wallet_url, {"amount": "10000"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_assign_package_with_quota_and_expiry(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.membership_url, {"package_code": "premium-creator", "tier_code": "monthly"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership = response.data["membership"]
        self.assertEqual(membership["package_name"], "Premium Creator")
        self.assertEqual(membership["tier_label"], "Aylık")
        self.assertEqual(membership["application_quota"], 50)
        self.assertEqual(membership["remaining_applications"], 50)
        self.assertTrue(membership["is_active"])
        self.assertEqual(membership["days_remaining"], 29)  # 30 gün − kesirli ilk gün

    def test_assigning_package_can_charge_the_wallet(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "1500"})
        response = self.client.post(
            self.membership_url,
            {"package_code": "premium-creator", "tier_code": "monthly", "charge_wallet": True},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["wallet"]["balance"]), Decimal("201.00"))  # 1500 − 1299
        kinds = [entry["kind"] for entry in response.data["wallet"]["entries"]]
        self.assertIn("package_purchase", kinds)

    def test_insufficient_balance_leaves_no_package_and_no_charge(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "100"})
        response = self.client.post(
            self.membership_url,
            {"package_code": "premium-creator", "tier_code": "monthly", "charge_wallet": True},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Tahsilat da paket ataması da geri alınmalı (tek transaction).
        self.assertEqual(Decimal(self.client.get(self.wallet_url).data["balance"]), Decimal("100.00"))
        self.assertEqual(self.client.get(self.membership_url).data["package_code"], "")

    def test_changing_package_resets_usage_and_replaces_the_previous_one(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.membership_url, {"package_code": "classic-creator", "tier_code": "weekly"})
        Membership.objects.filter(user=self.creator).update(applications_used=7)

        response = self.client.post(
            self.membership_url, {"package_code": "premium-creator", "tier_code": "3d"}
        )
        membership = response.data["membership"]
        self.assertEqual(membership["package_code"], "premium-creator")
        self.assertEqual(membership["applications_used"], 0)
        self.assertEqual(membership["application_quota"], 5)
        # Kullanıcı başına tek satır kalmalı.
        self.assertEqual(Membership.objects.filter(user=self.creator).count(), 1)

    def test_unlimited_package_reports_null_quota(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.membership_url, {"package_code": "kurumsal-marka", "tier_code": "monthly"}
        )
        membership = response.data["membership"]
        self.assertIsNone(membership["application_quota"])
        self.assertIsNone(membership["remaining_applications"])

    def test_unknown_package_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.membership_url, {"package_code": "altin-paket", "tier_code": "monthly"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tier_must_belong_to_the_package(self):
        self.client.force_authenticate(self.admin)
        # Marka paketlerinin haftalık süresi yok.
        response = self.client.post(self.membership_url, {"package_code": "baslangic-marka", "tier_code": "weekly"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_clear_a_package(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.membership_url, {"package_code": "classic-creator", "tier_code": "monthly"})
        response = self.client.delete(self.membership_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["package_code"], "")
        self.assertFalse(response.data["is_active"])

    def test_expired_package_is_not_active(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.membership_url, {"package_code": "classic-creator", "tier_code": "3d"})
        Membership.objects.filter(user=self.creator).update(expires_at=timezone.now() - timedelta(minutes=1))
        response = self.client.get(self.membership_url)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(response.data["days_remaining"], 0)

    def test_user_sees_their_own_balance_and_package(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "250"})
        self.client.post(self.membership_url, {"package_code": "classic-creator", "tier_code": "weekly"})

        self.client.force_authenticate(self.creator)
        response = self.client.get(reverse("payments:my-wallet"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["wallet"]["balance"]), Decimal("250.00"))
        self.assertEqual(response.data["membership"]["package_code"], "classic-creator")

    def test_admin_action_is_written_to_the_audit_log(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.wallet_url, {"amount": "500", "note": "dekont"})
        self.assertTrue(
            AdminActionLog.objects.filter(
                actor=self.admin, action="user.wallet_credit", target_id=str(self.creator.id)
            ).exists()
        )


class PackageCatalogParityTests(SimpleTestCase):
    """Sunucudaki katalog ile pazarlama sayfalarındaki fiyat listesi aynı olmalı.

    Fiyatlar iki dilde iki dosyada yaşıyor (bkz. apps/payments/packages.py
    başlığı). Biri güncellenip diğeri unutulursa site bir fiyat gösterip
    sistem başka bir fiyat tahsil ederdi; bu test o ayrışmayı yakalar.
    Frontend kaynağı imajda bulunmadığında (yalnızca backend imajı içinde
    koşarken) test atlanır.
    """

    TS_PATH = Path(__file__).resolve().parents[3] / "frontend" / "lib" / "content" / "packages.ts"

    def test_prices_match_the_frontend_catalog(self):
        if not self.TS_PATH.exists():
            self.skipTest("frontend/lib/content/packages.ts bu ortamda yok")
        source = self.TS_PATH.read_text(encoding="utf-8")

        backend_prices = sorted(int(tier.price) for package in PACKAGES for tier in package.tiers)
        ts_prices = sorted(int(match) for match in re.findall(r"price:\s*(\d+)", source))
        self.assertEqual(backend_prices, ts_prices)

    def test_package_names_match_the_frontend_catalog(self):
        if not self.TS_PATH.exists():
            self.skipTest("frontend/lib/content/packages.ts bu ortamda yok")
        source = self.TS_PATH.read_text(encoding="utf-8")
        for package in PACKAGES:
            self.assertIn(f'name: "{package.name}"', source)
            self.assertIn(f'id: "{package.code}"', source)


# ---------------------------------------------------------------------------
# Üyelik kurallarının uygulanması
# ---------------------------------------------------------------------------
# Ücretsiz dönemde paket şartı aranmaz; bu sınıf kuralın kendisini test ettiği
# için ücretsiz dönem kapatılır (aksi halde test hafta sonu koşunca yeşil
# kalır ama hiçbir şey doğrulamaz).
@override_settings(BILLING_FREE_PERIOD_ENABLED=False)
class MembershipEnforcementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="enfadmin@example.com", password="StrongPass123", role=Role.ADMIN)
        self.creator_user = User.objects.create_user(
            email="enfcreator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        onboard(self.creator_user)
        self.brand_user = User.objects.create_user(
            email="enfbrand@example.com", password="StrongPass123", role=Role.BRAND
        )
        onboard(self.brand_user)
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Enforcement Campaign",
            description="desc",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )
        self.apply_url = reverse("applications:application-list")

    def _apply(self, campaign=None):
        return self.client.post(
            self.apply_url,
            {"campaign_id": (campaign or self.campaign).id, "message": "Başvuruyorum", "proposed_rate": "250"},
        )

    def _give_package(self, user, package_code, tier_code):
        self.client.force_authenticate(self.admin)
        self.client.post(
            reverse("payments:user-membership", args=[user.id]),
            {"package_code": package_code, "tier_code": tier_code},
        )
        self.client.force_authenticate(user)

    # --- Sayaçlar bayraktan bağımsız işler ---
    def test_application_consumes_a_slot_even_when_enforcement_is_off(self):
        self._give_package(self.creator_user, "classic-creator", "3d")  # 3 hak
        response = self._apply()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = Membership.objects.get(user=self.creator_user)
        self.assertEqual(membership.applications_used, 1)
        self.assertEqual(membership.remaining_applications, 2)

    def test_counter_is_not_touched_for_a_user_without_a_package(self):
        # Engelleme kapalıyken paketsiz başvuru serbest; sayaç şişmemeli,
        # yoksa kullanıcı paket aldığında hakkını yemiş görünürdü.
        self.client.force_authenticate(self.creator_user)
        self.assertEqual(self._apply().status_code, status.HTTP_201_CREATED)
        self.assertEqual(Membership.objects.get(user=self.creator_user).applications_used, 0)

    def test_unlimited_package_does_not_increment_the_counter(self):
        self._give_package(self.brand_user, "kurumsal-marka", "monthly")
        membership = Membership.objects.get(user=self.brand_user)
        self.assertIsNone(membership.application_quota)

    # --- Engelleme açıkken ---
    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_creator_without_a_package_applies_but_waits_for_payment(self):
        """Paketsiz başvuru reddedilmez: kaydedilir, markadan gizlenir ve
        creator ödeme ekranına yönlendirilir."""
        self.client.force_authenticate(self.creator_user)
        response = self._apply()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["awaiting_payment"])

        self.client.force_authenticate(self.brand_user)
        listed = self.client.get(self.apply_url)
        self.assertEqual(listed.data["count"], 0)
        self.assertFalse(Notification.objects.filter(user=self.brand_user).exists())

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_package_approval_forwards_the_waiting_application_to_the_brand(self):
        self.client.force_authenticate(self.creator_user)
        application_id = self._apply().data["id"]

        self._give_package(self.creator_user, "classic-creator", "3d")

        application = Application.objects.get(pk=application_id)
        self.assertFalse(application.awaiting_payment)
        self.assertEqual(Membership.objects.get(user=self.creator_user).applications_used, 1)
        self.assertTrue(Notification.objects.filter(user=self.brand_user, title="Yeni başvuru aldınız").exists())

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_creator_with_a_package_can_apply(self):
        self._give_package(self.creator_user, "classic-creator", "weekly")
        self.assertEqual(self._apply().status_code, status.HTTP_201_CREATED)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_exhausted_quota_blocks_further_applications(self):
        self._give_package(self.creator_user, "classic-creator", "3d")  # 3 hak
        Membership.objects.filter(user=self.creator_user).update(applications_used=3)
        response = self._apply()
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn("başvuru hakkının tamamını", response.data["message"])

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_expired_package_sends_the_application_to_payment(self):
        self._give_package(self.creator_user, "classic-creator", "monthly")
        Membership.objects.filter(user=self.creator_user).update(expires_at=timezone.now() - timedelta(hours=1))
        response = self._apply()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["awaiting_payment"])

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_a_rejected_application_does_not_burn_a_slot(self):
        self._give_package(self.creator_user, "classic-creator", "3d")
        # Yayınlanmamış bir kampanyaya başvuru doğrulamaya takılır; hak
        # harcanmamalı (hak yalnızca başvuru gerçekten oluşunca düşer).
        draft = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Taslak kampanya",
            description="d",
            platform="tiktok",
            budget_min=10,
            budget_max=20,
            deadline=timezone.now() + timedelta(days=5),
            status=CampaignStatus.DRAFT,
        )
        self.client.force_authenticate(self.creator_user)
        rejected = self._apply(campaign=draft)
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Membership.objects.get(user=self.creator_user).applications_used, 0)

    def test_applying_twice_to_the_same_campaign_returns_the_existing_one(self):
        """İkinci başvuru hata değil, var olan başvurudur.

        Eskiden 400 dönüyordu ve kullanıcı ödeme adımına hiç geçemiyordu;
        uç artık idempotent, 200 ile mevcut kaydı döner.
        """
        self.client.force_authenticate(self.creator_user)
        first = self._apply()
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self._apply()
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(Application.objects.filter(creator=self.creator_user.creator).count(), 1)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_repeating_an_application_does_not_burn_another_slot(self):
        self._give_package(self.creator_user, "classic-creator", "3d")
        self._apply()
        self._apply()
        self._apply()
        self.assertEqual(Membership.objects.get(user=self.creator_user).applications_used, 1)

    @override_settings(MEMBERSHIP_ENFORCED=True, BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[0, 1, 2, 3, 4, 5, 6])
    def test_free_period_bypasses_the_package_requirement(self):
        self.client.force_authenticate(self.creator_user)
        self.assertEqual(self._apply().status_code, status.HTTP_201_CREATED)

    # --- Marka: aktif kampanya limiti ---
    def _create_campaign(self):
        return self.client.post(
            reverse("campaigns:campaign-list"),
            {
                "title": "Yeni kampanya",
                "description": "açıklama",
                "platform": "tiktok",
                "budget_min": "100",
                "budget_max": "500",
                "deadline": (timezone.now() + timedelta(days=10)).isoformat(),
                "status": CampaignStatus.PUBLISHED,
            },
        )

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_brand_without_a_package_has_the_campaign_held_for_payment(self):
        """İlan reddedilmez: taslak olarak ödeme bekler, yayında görünmez."""
        self.client.force_authenticate(self.brand_user)
        response = self._create_campaign()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], CampaignStatus.DRAFT)
        self.assertTrue(response.data["awaiting_payment"])

        self.client.force_authenticate(self.creator_user)
        public = self.client.get(reverse("campaigns:campaign-list"))
        self.assertNotIn(response.data["id"], [c["id"] for c in public.data["results"]])

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_package_approval_publishes_the_held_campaign(self):
        self.client.force_authenticate(self.brand_user)
        campaign_id = self._create_campaign().data["id"]

        self._give_package(self.brand_user, "baslangic-marka", "monthly")

        campaign = Campaign.objects.get(pk=campaign_id)
        self.assertEqual(campaign.status, CampaignStatus.PUBLISHED)
        self.assertFalse(campaign.awaiting_payment)
        self.assertTrue(Notification.objects.filter(user=self.brand_user, title="İlanınız yayında").exists())

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_held_campaigns_beyond_the_quota_stay_as_drafts(self):
        self.client.force_authenticate(self.brand_user)
        for _ in range(6):
            self._create_campaign()
        # setUp'taki yayındaki kampanya + 4 = Başlangıç paketinin 5 limiti.
        self._give_package(self.brand_user, "baslangic-marka", "monthly")
        brand = self.brand_user.brand
        self.assertEqual(Campaign.objects.filter(brand=brand, status=CampaignStatus.PUBLISHED).count(), 5)
        self.assertEqual(Campaign.objects.filter(brand=brand, awaiting_payment=True).count(), 2)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_a_cancelled_held_campaign_is_not_published_after_payment(self):
        self.client.force_authenticate(self.brand_user)
        campaign_id = self._create_campaign().data["id"]
        self.client.patch(
            reverse("campaigns:campaign-detail", args=[campaign_id]), {"status": CampaignStatus.CANCELLED}
        )
        self._give_package(self.brand_user, "baslangic-marka", "monthly")
        self.assertEqual(Campaign.objects.get(pk=campaign_id).status, CampaignStatus.CANCELLED)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_publishing_a_draft_without_a_package_is_blocked(self):
        """Taslak kaydedip düzenlemeden yayına almak ödemeyi atlatmamalı."""
        self.client.force_authenticate(self.brand_user)
        draft = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Taslak",
            description="d",
            platform="tiktok",
            budget_min=10,
            budget_max=20,
            deadline=timezone.now() + timedelta(days=5),
            status=CampaignStatus.DRAFT,
        )
        response = self.client.patch(
            reverse("campaigns:campaign-detail", args=[draft.id]), {"status": CampaignStatus.PUBLISHED}
        )
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["code"], "MEMBERSHIP_REQUIRED")

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_wallet_reports_which_actions_need_payment(self):
        self.client.force_authenticate(self.creator_user)
        gates = self.client.get(reverse("payments:my-wallet")).data["gates"]
        self.assertEqual(
            gates, {"messaging_locked": True, "application_needs_payment": True, "campaign_needs_payment": False}
        )
        self._give_package(self.creator_user, "classic-creator", "weekly")
        gates = self.client.get(reverse("payments:my-wallet")).data["gates"]
        self.assertFalse(gates["messaging_locked"])
        self.assertFalse(gates["application_needs_payment"])

    # --- Mesajlaşma: ödeme sonrası açılır ---
    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_messaging_requires_an_active_package_and_opens_after_payment(self):
        url = reverse("messaging:conversation-list")
        self.client.force_authenticate(self.brand_user)
        blocked = self.client.post(url, {"participant_ids": [self.creator_user.id]}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(blocked.data["code"], "MEMBERSHIP_REQUIRED")

        self._give_package(self.brand_user, "baslangic-marka", "monthly")
        self.client.force_authenticate(self.brand_user)
        opened = self.client.post(url, {"participant_ids": [self.creator_user.id]}, format="json")
        self.assertEqual(opened.status_code, status.HTTP_201_CREATED)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_brand_is_blocked_once_the_active_campaign_limit_is_reached(self):
        self._give_package(self.brand_user, "baslangic-marka", "monthly")  # 5 aktif kampanya
        # setUp bir kampanya açtı; limite kadar doldur.
        for i in range(4):
            Campaign.objects.create(
                brand=self.brand_user.brand,
                title=f"Dolgu {i}",
                description="d",
                platform="tiktok",
                budget_min=10,
                budget_max=20,
                deadline=timezone.now() + timedelta(days=5),
                status=CampaignStatus.PUBLISHED,
            )
        response = self._create_campaign()
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn("aktif kampanyaya izin veriyor", response.data["message"])

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_unlimited_brand_package_has_no_campaign_limit(self):
        self._give_package(self.brand_user, "kurumsal-marka", "monthly")
        for i in range(8):
            Campaign.objects.create(
                brand=self.brand_user.brand,
                title=f"Sınırsız {i}",
                description="d",
                platform="tiktok",
                budget_min=10,
                budget_max=20,
                deadline=timezone.now() + timedelta(days=5),
                status=CampaignStatus.PUBLISHED,
            )
        self.assertEqual(self._create_campaign().status_code, status.HTTP_201_CREATED)

    @override_settings(MEMBERSHIP_ENFORCED=True)
    def test_quota_check_is_not_fooled_by_a_stale_cached_membership(self):
        """Sayaç UPDATE ile artırıldığı için örnek üzerindeki one-to-one
        önbelleği eskir; kontrol taze okumazsa hakkı biten kullanıcı başvuru
        yapmaya devam ederdi."""
        from apps.payments import membership as rules

        self._give_package(self.creator_user, "classic-creator", "3d")  # 3 hak
        user = User.objects.get(pk=self.creator_user.pk)
        rules.consume_application(user)  # user.membership artık önbellekte
        Membership.objects.filter(user=user).update(applications_used=3)

        with self.assertRaises(rules.MembershipRequired):
            rules.check_application_slot(user)


# ---------------------------------------------------------------------------
# Ödeme bildirimi akışı
# ---------------------------------------------------------------------------
@override_settings(BILLING_FREE_PERIOD_ENABLED=False)
class PaymentDeclarationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="decadmin@example.com", password="StrongPass123", role=Role.ADMIN)
        self.other_admin = User.objects.create_user(
            email="decadmin2@example.com", password="StrongPass123", role=Role.MODERATOR
        )
        self.creator_user = User.objects.create_user(
            email="deccreator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        onboard(self.creator_user)
        self.brand_user = User.objects.create_user(
            email="decbrand@example.com", password="StrongPass123", role=Role.BRAND
        )
        onboard(self.brand_user)
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Bildirim Kampanyası",
            description="d",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )
        self.application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign)
        self.list_url = reverse("payments:declaration-list")

    def _declare(self, **overrides):
        payload = {
            "package_code": "classic-creator",
            "tier_code": "monthly",
            "application_id": self.application.id,
            "sender_note": "Ziraat · 12:40",
        }
        payload.update(overrides)
        return self.client.post(self.list_url, payload)

    def test_declaring_a_payment_creates_a_pending_record(self):
        self.client.force_authenticate(self.creator_user)
        response = self._declare()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(Decimal(response.data["amount"]), Decimal("699.00"))
        self.assertEqual(response.data["campaign_title"], "Bildirim Kampanyası")

    def test_amount_comes_from_the_catalog_not_the_client(self):
        self.client.force_authenticate(self.creator_user)
        # İstemci tutar göndermeye çalışsa bile dikkate alınmaz.
        response = self._declare(amount="1")
        self.assertEqual(Decimal(response.data["amount"]), Decimal("699.00"))

    def test_admins_get_payment_then_application_notification_in_that_order(self):
        self.client.force_authenticate(self.creator_user)
        self._declare()

        for staff in (self.admin, self.other_admin):
            titles = list(
                Notification.objects.filter(user=staff).order_by("created_at", "id").values_list("title", flat=True)
            )
            self.assertEqual(titles, ["Ödeme bildirimi geldi", "Yeni kampanya başvurusu"])

        # Panelde en yeni üstte listelenir; sıra deterministik olmalı.
        newest_first = list(
            Notification.objects.filter(user=self.admin).values_list("title", flat=True)
        )
        self.assertEqual(newest_first, ["Yeni kampanya başvurusu", "Ödeme bildirimi geldi"])

    def test_declaration_without_an_application_only_notifies_about_the_payment(self):
        self.client.force_authenticate(self.creator_user)
        self._declare(application_id=None)
        titles = list(Notification.objects.filter(user=self.admin).values_list("title", flat=True))
        self.assertEqual(titles, ["Ödeme bildirimi geldi"])

    def test_cannot_attach_someone_elses_application(self):
        stranger = User.objects.create_user(email="stranger@example.com", password="StrongPass123", role=Role.CREATOR)
        onboard(stranger)
        self.client.force_authenticate(stranger)
        response = self._declare()
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_users_only_see_their_own_declarations(self):
        self.client.force_authenticate(self.creator_user)
        self._declare()
        other = User.objects.create_user(email="nosy2@example.com", password="StrongPass123", role=Role.CREATOR)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(self.list_url).data["count"], 0)

        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.list_url).data["count"], 1)

    def test_approval_credits_the_balance_and_assigns_the_package(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"}),
            {"note": "dekont görüldü"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "approved")

        membership = Membership.objects.get(user=self.creator_user)
        self.assertEqual(membership.package_code, "classic-creator")
        self.assertTrue(membership.is_active)
        # 699 yüklendi, 699 pakete gitti → bakiye 0, defterde iki satır.
        wallet = Wallet.objects.get(user=self.creator_user)
        self.assertEqual(wallet.balance, Decimal("0.00"))
        self.assertEqual(wallet.entries.count(), 2)

    def test_approval_can_credit_without_assigning_a_package(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"}),
            {"assign_package": False},
        )
        self.assertEqual(Wallet.objects.get(user=self.creator_user).balance, Decimal("699.00"))
        # Paket tanımlanmadığı için üyelik satırı hiç açılmamış olmalı.
        self.assertFalse(Membership.objects.filter(user=self.creator_user).exists())

    def test_rejection_leaves_the_balance_untouched(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "reject"}),
            {"note": "Hesabımıza ulaşmadı"},
        )
        self.assertEqual(response.data["status"], "rejected")
        self.assertEqual(Wallet.objects.filter(user=self.creator_user).count(), 0)
        self.assertFalse(Membership.objects.filter(user=self.creator_user).exists())

    def test_a_declaration_cannot_be_reviewed_twice(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        url = reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"})
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(url, {}).status_code, status.HTTP_200_OK)
        second = self.client.post(url, {})
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        # Çift onay bakiyeyi iki kez yüklememeli.
        self.assertEqual(Wallet.objects.get(user=self.creator_user).entries.count(), 2)

    def test_moderator_cannot_approve_a_declaration(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        self.client.force_authenticate(self.other_admin)
        response = self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"}), {}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_is_notified_when_their_payment_is_approved(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"}), {}
        )
        self.assertTrue(
            Notification.objects.filter(user=self.creator_user, title="Ödemeniz onaylandı").exists()
        )

    def test_invalid_decision_is_a_404_not_a_silent_rejection(self):
        self.client.force_authenticate(self.creator_user)
        declaration_id = self._declare().data["id"]
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/payments/declarations/{declaration_id}/onayla/", {})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Paket kitlesi rolle uyuşmalı ---
    # Marka bir creator paketini bildirip onaylatsa campaign_quota=0 olan bir
    # paket alır ve ödediği halde kampanya açamazdı; tersi de doğrudur.
    def test_brand_can_declare_a_brand_package(self):
        self.client.force_authenticate(self.brand_user)
        response = self._declare(package_code="baslangic-marka", tier_code="monthly", application_id=None)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["amount"]), Decimal("499.00"))

    def test_brand_cannot_declare_a_creator_package(self):
        self.client.force_authenticate(self.brand_user)
        response = self._declare(package_code="premium-creator", tier_code="weekly", application_id=None)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Marka paketlerinden", response.data["message"])
        self.assertFalse(PaymentDeclaration.objects.exists())

    def test_creator_cannot_declare_a_brand_package(self):
        self.client.force_authenticate(self.creator_user)
        response = self._declare(package_code="kurumsal-marka", tier_code="monthly")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Creator paketlerinden", response.data["message"])
        self.assertFalse(PaymentDeclaration.objects.exists())

    # --- Kullanıcı başına tek bekleyen bildirim ---
    def test_declaring_again_updates_the_pending_record_instead_of_duplicating(self):
        self.client.force_authenticate(self.creator_user)
        first_id = self._declare().data["id"]
        response = self._declare(package_code="premium-creator", tier_code="weekly")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["id"], first_id)
        self.assertEqual(PaymentDeclaration.objects.filter(user=self.creator_user).count(), 1)
        # Tutar da yeni seçime göre güncellenmeli, yoksa admin eski tutarı onaylardı.
        self.assertEqual(Decimal(response.data["amount"]), Decimal("699.00"))
        self.assertEqual(response.data["package_code"], "premium-creator")

    def test_repeating_the_same_declaration_does_not_notify_admins_again(self):
        self.client.force_authenticate(self.creator_user)
        self._declare()
        self._declare()
        # Seçim değişmedi: ödeme + başvuru bildirimi birer kez gitmiş olmalı.
        titles = list(Notification.objects.filter(user=self.admin).values_list("title", flat=True))
        self.assertEqual(titles, ["Yeni kampanya başvurusu", "Ödeme bildirimi geldi"])

    def test_a_second_application_still_reaches_the_admins(self):
        # Adminlere başvuruyu duyuran tek yer bu akış: bekleyen bir bildirim
        # varken yapılan ikinci başvuru da bildirilmeli, yoksa sessizce kaybolur.
        second_campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="İkinci Kampanya",
            description="d",
            platform="instagram",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )
        second_application = Application.objects.create(creator=self.creator_user.creator, campaign=second_campaign)

        self.client.force_authenticate(self.creator_user)
        self._declare()
        self._declare(application_id=second_application.id)

        titles = list(
            Notification.objects.filter(user=self.admin).order_by("created_at", "id").values_list("title", flat=True)
        )
        # Paket seçimi değişmediği için ödeme bildirimi tekrarlanmaz; başvuru
        # bildirimi her yeni başvuru için gider.
        self.assertEqual(titles, ["Ödeme bildirimi geldi", "Yeni kampanya başvurusu", "Yeni kampanya başvurusu"])
        self.assertEqual(PaymentDeclaration.objects.filter(user=self.creator_user).count(), 1)

    def test_a_new_declaration_is_opened_once_the_previous_one_is_reviewed(self):
        self.client.force_authenticate(self.creator_user)
        first_id = self._declare().data["id"]
        self.client.force_authenticate(self.admin)
        self.client.post(reverse("payments:declaration-review", kwargs={"pk": first_id, "decision": "reject"}), {})

        self.client.force_authenticate(self.creator_user)
        second = self._declare()
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(second.data["id"], first_id)
        self.assertEqual(PaymentDeclaration.objects.filter(user=self.creator_user).count(), 2)

# ---------------------------------------------------------------------------
# Marka paketi = üyelik + creator dizini erişimi
# ---------------------------------------------------------------------------
# Dizin erişimi üyelikten ayrı alanlarda tutulur (Brand.has_paid_access /
# paid_access_until). Paket tanımlanırken bu alanlar güncellenmezse marka
# ödemesi onaylandığı halde creator listesini göremez. Ücretsiz dönem bu
# koşulu tamamen kaldırdığı için testte kapatılır — aksi halde testler hafta
# sonu koşunca yeşil kalır ama hiçbir şey doğrulamaz.
@override_settings(BILLING_FREE_PERIOD_ENABLED=False)
class BrandPackageDirectoryAccessTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="accadmin@example.com", password="StrongPass123", role=Role.ADMIN)
        self.brand_user = User.objects.create_user(
            email="accbrand@example.com", password="StrongPass123", role=Role.BRAND
        )
        onboard(self.brand_user)
        self.membership_url = reverse("payments:user-membership", args=[self.brand_user.id])

    def _assign(self, package_code="profesyonel-marka", tier_code="monthly"):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.membership_url, {"package_code": package_code, "tier_code": tier_code})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.brand_user.brand.refresh_from_db()
        return self.brand_user.brand

    def test_assigning_a_brand_package_opens_the_creator_directory(self):
        self.assertFalse(self.brand_user.brand.has_paid_access)
        brand = self._assign()

        self.assertTrue(brand.has_paid_access)
        self.assertTrue(brand.paid_access_active)
        membership = Membership.objects.get(user=self.brand_user)
        self.assertEqual(brand.paid_access_until, membership.expires_at)

        # Uçtan uca: dizin artık markaya açık olmalı.
        self.client.force_authenticate(self.brand_user)
        self.assertEqual(self.client.get(reverse("creators:creator-list")).status_code, status.HTTP_200_OK)

    def test_the_directory_stays_locked_without_a_package(self):
        self.client.force_authenticate(self.brand_user)
        self.assertEqual(self.client.get(reverse("creators:creator-list")).status_code, status.HTTP_403_FORBIDDEN)

    def test_an_existing_longer_access_is_not_shortened(self):
        until = self.brand_user.brand.grant_paid_access(365)
        brand = self._assign()
        self.assertEqual(brand.paid_access_until, until)

    def test_unlimited_access_is_left_untouched(self):
        # paid_access_until boş = süresiz (elle açılmış hesaplar); bir paket
        # tanımlamak bu erişimi süreli hale getirmemeli.
        brand = self.brand_user.brand
        brand.has_paid_access = True
        brand.paid_access_until = None
        brand.save(update_fields=["has_paid_access", "paid_access_until"])

        brand = self._assign()
        self.assertTrue(brand.has_paid_access)
        self.assertIsNone(brand.paid_access_until)

    def test_approved_payment_declaration_opens_the_directory_too(self):
        # Asıl akış: marka ödemeyi bildirir, admin onaylar.
        self.client.force_authenticate(self.brand_user)
        declaration_id = self.client.post(
            reverse("payments:declaration-list"),
            {"package_code": "baslangic-marka", "tier_code": "monthly", "sender_note": "havale"},
        ).data["id"]

        self.client.force_authenticate(self.admin)
        self.client.post(
            reverse("payments:declaration-review", kwargs={"pk": declaration_id, "decision": "approve"}), {}
        )

        self.brand_user.brand.refresh_from_db()
        self.assertTrue(self.brand_user.brand.paid_access_active)
