from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Creator, SocialAccount


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
