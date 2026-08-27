from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus

from .models import TransactionStatus


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
