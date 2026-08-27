from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus
from apps.payments.models import Transaction, TransactionStatus


class DashboardTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )

    def test_brand_dashboard_requires_brand_role(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("analytics:brand-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_dashboard_returns_stats(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("analytics:brand-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_campaigns", response.data)

    def test_creator_dashboard_returns_stats(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("analytics:creator-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_followers", response.data)

    def test_creator_dashboard_reflects_earnings_and_collaborations(self):
        campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Test Campaign",
            description="desc",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timezone.timedelta(days=30),
            status=CampaignStatus.PUBLISHED,
        )
        application = Application.objects.create(
            creator=self.creator_user.creator, campaign=campaign, message="hi", status=ApplicationStatus.ACCEPTED
        )
        Transaction.objects.create(
            application=application,
            payer=self.brand_user,
            payee=self.creator_user,
            amount="250.00",
            status=TransactionStatus.RELEASED,
        )
        self.client.force_authenticate(self.creator_user)
        url = reverse("analytics:creator-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["collaborations"], 1)
        self.assertEqual(response.data["earnings"], 250.0)

    def test_profile_view_increments_creator_dashboard(self):
        url = reverse("creators:creator-detail", args=[self.creator_user.creator.pk])
        self.client.get(url)  # anonymous view
        self.client.force_authenticate(self.creator_user)
        dashboard_url = reverse("analytics:creator-dashboard")
        response = self.client.get(dashboard_url)
        self.assertEqual(response.data["profile_views"], 1)


class AdminDashboardTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(email="admin@example.com", password="StrongPass123", role=Role.ADMIN)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )

    def test_non_admin_cannot_view_admin_dashboard(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("analytics:admin-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_admin_dashboard(self):
        self.client.force_authenticate(self.admin_user)
        url = reverse("analytics:admin-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_users", response.data)
        self.assertIn("pending_verifications", response.data)
