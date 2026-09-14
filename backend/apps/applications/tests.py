from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.campaigns.models import Campaign, CampaignStatus

from .models import Application, ApplicationStatus


class ApplicationTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.other_creator_user = User.objects.create_user(
            email="other-creator@example.com", password="StrongPass123", role=Role.CREATOR
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

    def test_creator_can_apply(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("applications:application-list")
        response = self.client.post(url, {"campaign_id": self.campaign.pk, "message": "Pick me!"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_brand_cannot_apply(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("applications:application-list")
        response = self.client.post(url, {"campaign_id": self.campaign.pk, "message": "Pick me!"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_can_accept_application(self):
        application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(self.brand_user)
        url = reverse("applications:application-accept", args=[application.pk])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.ACCEPTED)

    def test_admin_can_accept_application(self):
        # Regresyon: IsApplicationParty.has_object_permission bir staff bypass'ı
        # olmadan yalnızca gerçek creator/marka'ya izin veriyordu, bu yüzden bir
        # admin'in get_object() çağrısı _set_status()'un kendi (doğru) staff
        # kontrolüne hiç ulaşmadan 403 alıyordu — /manage/applications'taki
        # "Onayla" butonu admin/moderatör hesapları için sessizce başarısız oluyordu.
        admin_user = User.objects.create_user(email="admin@example.com", password="StrongPass123", role=Role.ADMIN)
        application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(admin_user)
        url = reverse("applications:application-accept", args=[application.pk])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.ACCEPTED)

    def test_moderator_can_reject_and_hold_application(self):
        moderator_user = User.objects.create_user(email="mod@example.com", password="StrongPass123", role=Role.MODERATOR)
        application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(moderator_user)

        reject_url = reverse("applications:application-reject", args=[application.pk])
        response = self.client.post(reject_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.REJECTED)

        hold_url = reverse("applications:application-hold", args=[application.pk])
        response = self.client.post(hold_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.PENDING)

    def test_unrelated_creator_cannot_accept_application(self):
        # get_queryset() zaten ilgisiz kullanıcılar için başvuruyu görünür
        # kümeden çıkarır, bu yüzden get_object() burada (has_object_permission
        # hiç çalışmadan) 404 döner — kaynağın var olduğunu ilgisiz taraflara
        # sızdırmayan, 403'ten daha güvenli bir davranış.
        application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(self.other_creator_user)
        url = reverse("applications:application-accept", args=[application.pk])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.PENDING)

    def test_other_creator_cannot_see_application(self):
        Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(self.other_creator_user)
        url = reverse("applications:application-list")
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 0)

    def test_creator_can_withdraw_application(self):
        application = Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")
        self.client.force_authenticate(self.creator_user)
        url = reverse("applications:application-detail", args=[application.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.WITHDRAWN)
