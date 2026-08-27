from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Campaign, CampaignStatus


class CampaignTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.other_brand_user = User.objects.create_user(
            email="other-brand@example.com", password="StrongPass123", role=Role.BRAND
        )
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.payload = {
            "title": "Summer UGC Push",
            "description": "Need 5 short-form videos.",
            "platform": "tiktok",
            "budget_min": "100.00",
            "budget_max": "500.00",
            "deadline": (timezone.now() + timezone.timedelta(days=30)).isoformat(),
        }

    def test_only_brand_can_create_campaign(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("campaigns:campaign-list")
        response = self.client.post(url, self.payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_can_create_campaign(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("campaigns:campaign-list")
        response = self.client.post(url, self.payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Campaign.objects.count(), 1)
        self.assertEqual(Campaign.objects.first().brand, self.brand_user.brand)

    def test_brand_cannot_edit_others_campaign(self):
        # Published so it's visible to other brands (list/retrieve scope) - this isolates
        # the ownership check from the visibility check covered by the test below.
        campaign = Campaign.objects.create(
            brand=self.brand_user.brand, status=CampaignStatus.PUBLISHED, **self._model_payload()
        )
        self.client.force_authenticate(self.other_brand_user)
        url = reverse("campaigns:campaign-detail", args=[campaign.pk])
        response = self.client.patch(url, {"title": "Hijacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_cannot_see_or_edit_others_draft_campaign(self):
        campaign = Campaign.objects.create(
            brand=self.brand_user.brand, status=CampaignStatus.DRAFT, **self._model_payload()
        )
        self.client.force_authenticate(self.other_brand_user)
        url = reverse("campaigns:campaign-detail", args=[campaign.pk])
        response = self.client.patch(url, {"title": "Hijacked"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_users_only_see_published_campaigns(self):
        Campaign.objects.create(brand=self.brand_user.brand, status=CampaignStatus.DRAFT, **self._model_payload())
        Campaign.objects.create(brand=self.brand_user.brand, status=CampaignStatus.PUBLISHED, **self._model_payload())
        url = reverse("campaigns:campaign-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)

    def test_budget_min_cannot_exceed_budget_max(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("campaigns:campaign-list")
        payload = {**self.payload, "budget_min": "600.00", "budget_max": "500.00"}
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_date_cannot_be_after_deadline(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("campaigns:campaign-list")
        payload = {
            **self.payload,
            "start_date": (timezone.now() + timezone.timedelta(days=40)).isoformat(),
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def _model_payload(self):
        return {
            "title": "Test Campaign",
            "description": "desc",
            "platform": "tiktok",
            "budget_min": 100,
            "budget_max": 500,
            "deadline": timezone.now() + timezone.timedelta(days=30),
        }


class CampaignRequirementTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.other_brand_user = User.objects.create_user(
            email="other-brand@example.com", password="StrongPass123", role=Role.BRAND
        )
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Test Campaign",
            description="desc",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timezone.timedelta(days=30),
        )

    def test_owner_can_add_deliverable(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("campaigns:campaign-requirement-list", args=[self.campaign.pk])
        response = self.client.post(url, {"description": "2x Instagram Reels", "platform": "instagram", "quantity": 2})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.campaign.deliverables.count(), 1)

    def test_non_owner_cannot_add_deliverable(self):
        self.client.force_authenticate(self.other_brand_user)
        url = reverse("campaigns:campaign-requirement-list", args=[self.campaign.pk])
        response = self.client.post(url, {"description": "Hijacked deliverable"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.campaign.deliverables.count(), 0)
