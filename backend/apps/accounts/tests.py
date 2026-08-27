from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Role, User, VerificationStatus
from .tokens import email_verification_token


class RegistrationTests(APITestCase):
    def test_register_creator(self):
        url = reverse("accounts:register")
        payload = {
            "email": "creator@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "role": Role.CREATOR,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="creator@example.com").exists())

    def test_register_password_mismatch(self):
        url = reverse("accounts:register")
        payload = {
            "email": "brand@example.com",
            "password": "StrongPass123",
            "password_confirm": "Mismatch123",
            "role": Role.BRAND,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_self_register_as_admin(self):
        url = reverse("accounts:register")
        payload = {
            "email": "hacker@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "role": Role.ADMIN,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_login_returns_role_and_tokens(self):
        url = reverse("accounts:login")
        response = self.client.post(url, {"email": "creator@example.com", "password": "StrongPass123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.CREATOR)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_credentials(self):
        url = reverse("accounts:login")
        response = self.client.post(url, {"email": "creator@example.com", "password": "wrong"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_requires_authentication(self):
        url = reverse("accounts:me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_view_self(self):
        self.client.force_authenticate(self.user)
        url = reverse("accounts:me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "creator@example.com")


class RoleSignalTests(APITestCase):
    def test_profile_and_verification_created_on_signup(self):
        user = User.objects.create_user(email="new@example.com", password="StrongPass123", role=Role.BRAND)
        self.assertTrue(hasattr(user, "profile"))
        self.assertTrue(hasattr(user, "verification"))
        self.assertTrue(user.groups.filter(name="Brands").exists())


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="OldPass123", role=Role.CREATOR)

    def test_request_reset_always_returns_200_and_emails_existing_user(self):
        url = reverse("accounts:password-reset-request")
        response = self.client.post(url, {"email": "creator@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_request_reset_does_not_leak_unknown_email(self):
        url = reverse("accounts:password-reset-request")
        response = self.client.post(url, {"email": "nobody@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_reset_with_valid_token_changes_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse("accounts:password-reset-confirm")
        response = self.client.post(url, {"uid": uid, "token": token, "new_password": "BrandNewPass123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPass123"))

    def test_confirm_reset_with_invalid_token_fails(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        url = reverse("accounts:password-reset-confirm")
        response = self.client.post(url, {"uid": uid, "token": "bad-token", "new_password": "BrandNewPass123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EmailVerificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_register_sends_verification_email(self):
        url = reverse("accounts:register")
        response = self.client.post(
            url,
            {
                "email": "another@example.com",
                "password": "StrongPass123",
                "password_confirm": "StrongPass123",
                "role": Role.CREATOR,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)

    def test_confirm_verification_with_valid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)
        url = reverse("accounts:verify-email")
        response = self.client.post(url, {"uid": uid, "token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    def test_confirm_verification_twice_fails(self):
        self.user.email_verified = True
        self.user.save(update_fields=["email_verified"])
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)
        url = reverse("accounts:verify-email")
        response = self.client.post(url, {"uid": uid, "token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_requires_authentication(self):
        url = reverse("accounts:resend-verification-email")
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class VerificationModerationTests(APITestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.moderator = User.objects.create_user(
            email="mod@example.com", password="StrongPass123", role=Role.MODERATOR
        )
        self.creator_user.verification.status = VerificationStatus.Status.PENDING
        self.creator_user.verification.save(update_fields=["status"])

    def test_non_moderator_cannot_review(self):
        self.client.force_authenticate(self.creator_user)
        url = reverse("accounts:verification-review", args=[self.creator_user.verification.pk])
        response = self.client.post(url, {"decision": "approve"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_moderator_can_approve_verification(self):
        self.client.force_authenticate(self.moderator)
        url = reverse("accounts:verification-review", args=[self.creator_user.verification.pk])
        response = self.client.post(url, {"decision": "approve"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.creator_user.refresh_from_db()
        self.assertTrue(self.creator_user.is_verified)
        verification = VerificationStatus.objects.get(user=self.creator_user)
        self.assertEqual(verification.status, VerificationStatus.Status.VERIFIED)

    def test_moderator_sees_pending_queue(self):
        self.client.force_authenticate(self.moderator)
        url = reverse("accounts:verification-pending-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)


class ErrorEnvelopeTests(APITestCase):
    """Her hata yanıtının uyması gereken tutarlı { error, code, message } sözleşmesini sabitler."""

    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_401_envelope(self):
        response = self.client.get(reverse("accounts:me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], True)
        self.assertEqual(response.data["code"], "UNAUTHORIZED")
        self.assertTrue(response.data["message"])

    def test_403_envelope(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("accounts:verification-pending-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN")

    def test_404_envelope(self):
        moderator = User.objects.create_user(email="mod@example.com", password="StrongPass123", role=Role.MODERATOR)
        self.client.force_authenticate(moderator)
        response = self.client.post(reverse("accounts:verification-review", args=[999999]), {"decision": "approve"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND")

    def test_400_validation_envelope_has_fields(self):
        response = self.client.post(reverse("accounts:register"), {"email": "not-an-email", "role": "creator"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "VALIDATION_ERROR")
        self.assertIn("email", response.data["fields"])

    def test_error_body_never_contains_a_traceback(self):
        response = self.client.get(reverse("accounts:me"))
        body = str(response.data)
        self.assertNotIn("Traceback", body)
        self.assertNotIn(".py", body)
