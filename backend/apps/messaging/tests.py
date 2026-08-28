from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User

from .models import Attachment, Conversation


class MessagingTests(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.stranger = User.objects.create_user(email="stranger@example.com", password="StrongPass123", role=Role.CREATOR)

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
