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

    def test_public_creator_list_is_accessible_without_auth(self):
        url = reverse("creators:creator-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
