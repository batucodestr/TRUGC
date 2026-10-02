from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Creator, CreatorPackage, SocialAccount


class CreatorProfileTests(APITestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.other_creator_user = User.objects.create_user(
            email="other@example.com", password="StrongPass123", role=Role.CREATOR
        )

    def test_creator_auto_created_on_signup(self):
        self.assertTrue(Creator.objects.filter(user=self.creator_user).exists())

    def test_creator_can_update_own_profile(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("creators:my-creator")
        response = self.client.patch(url, {"bio": "I make videos."})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "I make videos.")

    def test_creator_can_add_social_account(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("creators:social-account-list")
        response = self.client.post(
            url, {"platform": "instagram", "handle": "@creator", "followers_count": 1000, "engagement_rate": 3.5}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SocialAccount.objects.filter(creator=self.creator_user.creator).exists())

    def test_creator_cannot_see_others_social_accounts(self):
        SocialAccount.objects.create(
            creator=self.other_creator_user.creator, platform="tiktok", handle="@other", followers_count=500
        )
        self.client.force_authenticate(self.creator_user)
        url = reverse("creators:social-account-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]) if "results" in response.data else len(response.data), 0)

    def test_creator_directory_requires_authentication(self):
        # Creator dizini artık markalar için giriş + ödeme onayı gerektiriyor
        # (bkz. CanViewCreatorDirectory) — anonim erişim 401 döner.
        url = reverse("creators:creator-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_creator_can_view_directory_but_not_own_card(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("creators:creator-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {c["user_id"] for c in response.data["results"]}
        self.assertIn(self.other_creator_user.id, returned_ids)
        self.assertNotIn(self.creator_user.id, returned_ids)

    def test_brand_without_paid_access_is_forbidden(self):
        from apps.brands.models import Brand

        brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        Brand.objects.filter(user=brand_user).update(has_paid_access=False)
        self.client.force_authenticate(brand_user)
        url = reverse("creators:creator-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_with_paid_access_can_view_directory(self):
        from apps.brands.models import Brand

        brand_user = User.objects.create_user(email="brand2@example.com", password="StrongPass123", role=Role.BRAND)
        Brand.objects.filter(user=brand_user).update(has_paid_access=True)
        self.client.force_authenticate(brand_user)
        url = reverse("creators:creator-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreatorDirectoryAccessTests(APITestCase):
    """Creator dizini erişimi: hafta içi ödeme şartı, hafta sonu ücretsiz."""

    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        User.objects.create_user(email="listed@example.com", password="StrongPass123", role=Role.CREATOR)
        self.url = reverse("creators:creator-list")

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_unpaid_brand_is_blocked_on_a_paid_day(self):
        self.client.force_authenticate(self.brand_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "PAID_ACCESS_REQUIRED")

    @override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[0, 1, 2, 3, 4, 5, 6])
    def test_unpaid_brand_gets_free_access_during_the_free_period(self):
        self.client.force_authenticate(self.brand_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_paid_brand_has_access(self):
        brand = self.brand_user.brand
        brand.has_paid_access = True
        brand.save(update_fields=["has_paid_access"])
        self.client.force_authenticate(self.brand_user)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_expired_paid_access_is_rejected(self):
        brand = self.brand_user.brand
        brand.has_paid_access = True
        brand.paid_access_until = timezone.now() - timezone.timedelta(days=1)
        brand.save(update_fields=["has_paid_access", "paid_access_until"])
        self.client.force_authenticate(self.brand_user)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_grant_paid_access_extends_from_the_current_expiry(self):
        brand = self.brand_user.brand
        first = brand.grant_paid_access(30)
        second = brand.grant_paid_access(30)
        self.assertGreater(second, first)
        self.assertTrue(brand.paid_access_active)

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_anonymous_access_is_always_blocked(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)


class CreatorPackagePricingTests(APITestCase):
    """Paket fiyatı hafta sonu gizlenir, hafta içi görünür."""

    def setUp(self):
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        CreatorPackage.objects.create(
            creator=self.creator_user.creator, title="Reels paketi", price="1500.00", turnaround_days=5
        )

    @override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[0, 1, 2, 3, 4, 5, 6])
    def test_price_is_hidden_during_the_free_period(self):
        response = self.client.get(reverse("creators:creator-detail", args=[self.creator_user.creator.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["packages"][0]["price"])

    @override_settings(BILLING_FREE_PERIOD_ENABLED=False)
    def test_price_is_visible_during_the_paid_period(self):
        response = self.client.get(reverse("creators:creator-detail", args=[self.creator_user.creator.pk]))
        self.assertEqual(response.data["packages"][0]["price"], "1500.00")

    @override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[0, 1, 2, 3, 4, 5, 6])
    def test_package_can_be_created_without_a_price_during_the_free_period(self):
        self.client.force_authenticate(self.creator_user)
        response = self.client.post(reverse("creators:creator-package-list"), {"title": "Ücretsiz paket"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
