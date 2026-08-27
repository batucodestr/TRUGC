from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Report, ReportStatus, ReportTargetType


class ReportTests(APITestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)
        self.other_user = User.objects.create_user(email="other@example.com", password="StrongPass123", role=Role.CREATOR)
        self.moderator = User.objects.create_user(email="mod@example.com", password="StrongPass123", role=Role.MODERATOR)

    def test_authenticated_user_can_file_a_report(self):
        self.client.force_authenticate(self.creator_user)
        response = self.client.post(
            reverse("reports:report-list"),
            {"target_type": ReportTargetType.CAMPAIGN, "target_id": 1, "reason": "Misleading offer"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = Report.objects.get()
        self.assertEqual(report.reporter, self.creator_user)
        self.assertEqual(report.status, ReportStatus.OPEN)

    def test_anonymous_user_cannot_file_a_report(self):
        response = self.client.post(
            reverse("reports:report-list"),
            {"target_type": ReportTargetType.CAMPAIGN, "target_id": 1, "reason": "Spam"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_list_reports(self):
        Report.objects.create(reporter=self.other_user, target_type=ReportTargetType.CREATOR, target_id=1, reason="x")
        self.client.force_authenticate(self.creator_user)
        response = self.client.get(reverse("reports:report-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_moderator_can_list_and_resolve_reports(self):
        report = Report.objects.create(reporter=self.other_user, target_type=ReportTargetType.CREATOR, target_id=1, reason="x")
        self.client.force_authenticate(self.moderator)

        list_response = self.client.get(reverse("reports:report-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 1)

        resolve_response = self.client.post(
            reverse("reports:report-resolve", args=[report.pk]), {"status": "resolved", "notes": "Handled"}
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, ReportStatus.RESOLVED)
        self.assertEqual(report.resolved_by, self.moderator)

    def test_creator_cannot_resolve_reports(self):
        report = Report.objects.create(reporter=self.other_user, target_type=ReportTargetType.CREATOR, target_id=1, reason="x")
        self.client.force_authenticate(self.creator_user)
        response = self.client.post(reverse("reports:report-resolve", args=[report.pk]), {"status": "resolved"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
