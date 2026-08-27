from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Notification
from .services import notify_user


class NotificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="StrongPass123", role=Role.CREATOR)
        self.other_user = User.objects.create_user(email="other@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_user_only_sees_own_notifications(self):
        notify_user(user=self.user, title="Hello")
        notify_user(user=self.other_user, title="Not yours")
        self.client.force_authenticate(self.user)
        url = reverse("notifications:notification-list")
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)

    def test_mark_read(self):
        notification = notify_user(user=self.user, title="Hello")
        self.client.force_authenticate(self.user)
        url = reverse("notifications:notification-mark-read", args=[notification.pk])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
