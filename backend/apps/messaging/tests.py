from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from django.utils import timezone

from apps.accounts.models import Role, User
from apps.applications.models import Application
from apps.campaigns.models import Campaign, CampaignStatus
from apps.common.testing import onboard
from apps.notifications.models import Notification, NotificationType

from .models import Attachment, Conversation


class MessagingTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.stranger = User.objects.create_user(email="stranger@example.com", password="StrongPass123", role=Role.CREATOR)
        # Yeni görüşme başlatmak (işe alım hunisinin ilk adımı) zorunlu
        # kullanıcı akışını gerektirir.
        onboard(self.brand_user)
        onboard(self.creator_user)
        onboard(self.stranger)

    def test_create_conversation(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-list")
        response = self.client.post(url, {"participant_ids": [self.creator_user.pk]})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.first().participants.count(), 2)

    def test_cannot_create_conversation_with_only_self(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-list")
        response = self.client.post(url, {"participant_ids": [self.brand_user.pk]})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Conversation.objects.exists())

    def test_cannot_create_conversation_with_only_self_and_duplicates(self):
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-list")
        response = self.client.post(url, {"participant_ids": [self.brand_user.pk, self.brand_user.pk]})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Conversation.objects.exists())

    def test_send_and_list_messages(self):
        conversation = Conversation.objects.create()
        conversation.participants.set([self.brand_user, self.creator_user])
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-messages", args=[conversation.pk])
        response = self.client.post(url, {"body": "Hello there"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.creator_user)
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)

    def test_send_message_with_attachment(self):
        conversation = Conversation.objects.create()
        conversation.participants.set([self.brand_user, self.creator_user])
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-messages", args=[conversation.pk])
        upload = SimpleUploadedFile("brief.pdf", b"%PDF-1.4 fake pdf content", content_type="application/pdf")

        response = self.client.post(url, {"body": "See attached brief", "attachment": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Attachment.objects.count(), 1)
        self.assertEqual(len(response.data["attachments"]), 1)
        self.assertEqual(response.data["attachments"][0]["file_name"], "brief.pdf")

    def test_message_attachment_rejects_disallowed_extension(self):
        conversation = Conversation.objects.create()
        conversation.participants.set([self.brand_user, self.creator_user])
        self.client.force_authenticate(self.brand_user)
        url = reverse("messaging:conversation-messages", args=[conversation.pk])
        upload = SimpleUploadedFile("virus.exe", b"not really an exe", content_type="application/octet-stream")

        response = self.client.post(url, {"body": "nope", "attachment": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Attachment.objects.count(), 0)

    def test_stranger_cannot_access_conversation_messages(self):
        conversation = Conversation.objects.create()
        conversation.participants.set([self.brand_user, self.creator_user])
        self.client.force_authenticate(self.stranger)
        url = reverse("messaging:conversation-messages", args=[conversation.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

# ---------------------------------------------------------------------------
# Başvurudan mesaja: markanın müşteri şikâyetine konu olan uçtan uca yol
# ---------------------------------------------------------------------------
# "Kampanya açtım, başvuru yaptılar, mesaj atamıyorum": markanın elindeki tek
# veri başvuru satırıydı ve o satır creator'ın kullanıcı kimliğini taşımıyordu.
# Bu test, başvuru yanıtından alınan kimlikle konuşmanın açılıp mesajın
# gittiğini ve karşı tarafın bildirim aldığını bir arada doğrular.
class ApplicationToConversationTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(
            email="convbrand@example.com", password="StrongPass123", role=Role.BRAND
        )
        self.creator_user = User.objects.create_user(
            email="convcreator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        onboard(self.brand_user)
        onboard(self.creator_user)
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Mesaj Kampanyası",
            description="d",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timezone.timedelta(days=30),
            status=CampaignStatus.PUBLISHED,
        )
        Application.objects.create(creator=self.creator_user.creator, campaign=self.campaign, message="hi")

    def test_brand_can_message_an_applicant_using_the_application_payload(self):
        self.client.force_authenticate(self.brand_user)
        row = self.client.get(reverse("applications:application-list")).data["results"][0]

        created = self.client.post(
            reverse("messaging:conversation-list"),
            {"participant_ids": [row["creator_user_id"]], "campaign": row["campaign"]},
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        conversation_id = created.data["id"]

        sent = self.client.post(
            reverse("messaging:conversation-messages", kwargs={"conversation_pk": conversation_id}),
            {"body": "Merhaba, kampanya hakkında konuşalım."},
        )
        self.assertEqual(sent.status_code, status.HTTP_201_CREATED)

        # Creator hem konuşmayı hem bildirimi görmeli.
        self.client.force_authenticate(self.creator_user)
        inbox = self.client.get(reverse("messaging:conversation-list"))
        self.assertEqual(inbox.data["count"], 1)
        self.assertTrue(
            Notification.objects.filter(user=self.creator_user, notification_type=NotificationType.MESSAGE).exists()
        )

    def test_clicking_message_twice_reuses_the_same_conversation(self):
        # Satırdaki düğmeye tekrar basmak sohbet listesini çoğaltmamalı.
        self.client.force_authenticate(self.brand_user)
        payload = {"participant_ids": [self.creator_user.pk], "campaign": self.campaign.pk}
        first = self.client.post(reverse("messaging:conversation-list"), payload)
        second = self.client.post(reverse("messaging:conversation-list"), payload)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Conversation.objects.count(), 1)
