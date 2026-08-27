from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus


class ReviewTests(APITestCase):
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
        Application.objects.create(
            creator=self.creator_user.creator, campaign=self.campaign, message="hi", status=ApplicationStatus.ACCEPTED
        )

    def test_brand_can_review_accepted_creator(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("reviews:review-list")
        response = self.client.post(
            url, {"campaign_id": self.campaign.pk, "reviewee_id": self.creator_user.pk, "rating": 5, "comment": "Great!"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_brand_cannot_review_non_accepted_creator(self):
        other_creator = User.objects.create_user(email="other@example.com", password="StrongPass123", role=Role.CREATOR)
        self.client.force_authenticate(self.brand_user)
        url = reverse("reviews:review-list")
        response = self.client.post(
            url, {"campaign_id": self.campaign.pk, "reviewee_id": other_creator.pk, "rating": 5, "comment": "Great!"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviews_are_publicly_readable(self):
        url = reverse("reviews:review-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
