from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Brand


class BrandProfileTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.other_brand_user = User.objects.create_user(
            email="other@example.com", password="StrongPass123", role=Role.BRAND
        )

    def test_brand_auto_created_on_signup(self):
        self.assertTrue(Brand.objects.filter(user=self.brand_user).exists())

    def test_brand_can_update_own_profile(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("brands:my-brand")
        response = self.client.patch(url, {"company_name": "Acme Inc"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company_name"], "Acme Inc")

    def test_brand_cannot_update_other_brand_profile(self):
        self.client.force_authenticate(self.other_brand_user)
        url = reverse("brands:brand-detail", args=[self.brand_user.brand.pk])
        response = self.client.patch(url, {"company_name": "Hijacked"})
        self.assertIn(response.status_code, (status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN))

    def test_public_brand_list_is_accessible_without_auth(self):
        url = reverse("brands:brand-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
