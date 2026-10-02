from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.campaigns.models import Campaign, CampaignStatus
from apps.common.testing import avatar_upload, onboard, png_bytes

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


class EmailVerificationFlowTests(APITestCase):
    """Kayıt → e-posta doğrulama akışı ve token'ın süreli/tek kullanımlık olması."""

    def setUp(self):
        self.user = User.objects.create_user(email="new@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_registration_sends_a_verification_email(self):
        mail.outbox.clear()
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "fresh@example.com",
                "password": "StrongPass123",
                "password_confirm": "StrongPass123",
                "role": Role.CREATOR,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/verify-email?uid=", mail.outbox[0].body)
        created = User.objects.get(email="fresh@example.com")
        self.assertFalse(created.email_verified)
        self.assertEqual(response.data["onboarding"]["next_step"], "verify_email")

    def test_valid_token_verifies_the_account(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)
        response = self.client.post(reverse("accounts:verify-email"), {"uid": uid, "token": token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)
        self.assertIsNotNone(self.user.email_verified_at)

    def test_token_cannot_be_replayed(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)
        self.client.post(reverse("accounts:verify-email"), {"uid": uid, "token": token})
        replay = self.client.post(reverse("accounts:verify-email"), {"uid": uid, "token": token})
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_token_is_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)
        # Geçerlilik süresini sıfıra indirerek "süresi dolmuş bağlantı" durumunu
        # simüle ediyoruz (token imzası hâlâ doğru, yalnızca zaman aşımı geçti).
        with self.settings(EMAIL_VERIFICATION_TIMEOUT_SECONDS=-1):
            response = self.client.post(reverse("accounts:verify-email"), {"uid": uid, "token": token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)

    def test_tampered_token_is_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(reverse("accounts:verify-email"), {"uid": uid, "token": "abc-deadbeef"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_requires_authentication(self):
        response = self.client.post(reverse("accounts:resend-verification-email"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resend_sends_a_new_link(self):
        mail.outbox.clear()
        self.client.force_authenticate(self.user)
        response = self.client.post(reverse("accounts:resend-verification-email"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)


class OnboardingStatusTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)

    def test_status_reports_email_step_first(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("accounts:my-onboarding"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["complete"])
        self.assertEqual(response.data["next_step"], "verify_email")

    def test_status_reports_photo_step_after_email(self):
        self.user.email_verified = True
        self.user.save(update_fields=["email_verified"])
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("accounts:my-onboarding"))
        self.assertEqual(response.data["next_step"], "upload_photo")

    def test_status_complete_after_both_steps(self):
        onboard(self.user)
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("accounts:my-onboarding"))
        self.assertTrue(response.data["complete"])
        self.assertIsNone(response.data["next_step"])


class ProfilePhotoTests(APITestCase):
    """Zorunlu profil fotoğrafı: yükleme, değiştirme ve güvenlik kontrolleri."""

    def setUp(self):
        self.user = User.objects.create_user(email="creator@example.com", password="StrongPass123", role=Role.CREATOR)
        self.user.email_verified = True
        self.user.save(update_fields=["email_verified"])
        self.client.force_authenticate(self.user)
        self.url = reverse("accounts:my-profile-photo")

    def test_upload_sets_the_photo_and_completes_onboarding(self):
        response = self.client.post(self.url, {"avatar": avatar_upload()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_photo"])
        self.assertTrue(response.data["onboarding"]["complete"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_profile_photo)

    def test_new_upload_replaces_the_previous_file(self):
        """Kullanıcı başına tek fotoğraf: yeni yükleme eskisini depolamadan da siler."""
        self.client.post(self.url, {"avatar": avatar_upload("first.png")}, format="multipart")
        profile = self.user.profile
        profile.refresh_from_db()
        first_name = profile.avatar.name
        storage = profile.avatar.storage
        self.assertTrue(storage.exists(first_name))

        self.client.post(self.url, {"avatar": avatar_upload("second.png")}, format="multipart")
        profile.refresh_from_db()
        self.assertNotEqual(profile.avatar.name, first_name)
        self.assertFalse(storage.exists(first_name))

    def test_non_image_payload_is_rejected(self):
        fake = SimpleUploadedFile("evil.png", b"<?php echo 'pwned'; ?>", content_type="image/png")
        response = self.client.post(self.url, {"avatar": fake}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.has_profile_photo)

    def test_disallowed_extension_is_rejected(self):
        svg = SimpleUploadedFile("logo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", content_type="image/svg+xml")
        response = self.client.post(self.url, {"avatar": svg}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_small_image_is_rejected(self):
        tiny = SimpleUploadedFile("tiny.png", png_bytes(40, 40), content_type="image/png")
        response = self.client.post(self.url, {"avatar": tiny}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_photo_cannot_be_cleared_through_the_profile_endpoint(self):
        onboard(self.user)
        response = self.client.patch(reverse("accounts:my-profile"), {"avatar": ""})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_profile_photo)

    def test_upload_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.post(self.url, {"avatar": avatar_upload()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class OnboardingGateTests(APITestCase):
    """Doğrulanmamış / fotoğrafsız kullanıcı iş verme-iş alma yapamaz."""

    def setUp(self):
        self.brand_user = User.objects.create_user(email="brand@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(
            email="creator@example.com", password="StrongPass123", role=Role.CREATOR
        )
        self.campaign_payload = {
            "title": "Gated campaign",
            "description": "desc",
            "platform": "tiktok",
            "budget_min": "100.00",
            "budget_max": "500.00",
            "deadline": (timezone.now() + timezone.timedelta(days=10)).isoformat(),
        }

    def test_unverified_email_blocks_campaign_creation(self):
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "EMAIL_NOT_VERIFIED")

    def test_missing_photo_blocks_campaign_creation(self):
        self.brand_user.email_verified = True
        self.brand_user.save(update_fields=["email_verified"])
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "PROFILE_PHOTO_REQUIRED")

    def test_completed_onboarding_allows_campaign_creation(self):
        onboard(self.brand_user)
        self.client.force_authenticate(self.brand_user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unverified_creator_cannot_apply(self):
        onboard(self.brand_user)
        campaign = Campaign.objects.create(
            brand=self.brand_user.brand,
            title="Open",
            description="desc",
            platform="tiktok",
            budget_min=100,
            budget_max=500,
            deadline=timezone.now() + timezone.timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )
        self.client.force_authenticate(self.creator_user)
        response = self.client.post(
            reverse("applications:application-list"), {"campaign_id": campaign.pk, "message": "hi"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "EMAIL_NOT_VERIFIED")

    def test_reading_is_never_blocked_by_onboarding(self):
        """Engel yalnızca iş verme/iş alma işlemlerinde — okuma her zaman açık."""
        self.client.force_authenticate(self.creator_user)
        self.assertEqual(self.client.get(reverse("campaigns:campaign-list")).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("applications:application-list")).status_code, status.HTTP_200_OK)

    def test_staff_is_exempt_from_onboarding_gate(self):
        admin = User.objects.create_superuser(email="admin@example.com", password="StrongPass123")
        self.client.force_authenticate(admin)
        response = self.client.get(reverse("accounts:my-onboarding"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProfilePhotoAppliesToNewAccountsOnlyTests(APITestCase):
    """Fotoğraf zorunluluğu yalnızca kural sonrası açılan hesaplar için geçerli.

    Mevcut kullanıcılar bir anda iş verme/iş alma dışında kalmamalı; buna karar
    veren şey kullanıcı başına tutulan ``profile_photo_required`` bayrağıdır
    (kural getirildiğinde var olan satırlar için ``False``'a çekildi).
    """

    def setUp(self):
        self.campaign_payload = {
            "title": "Eski hesap ilanı",
            "description": "desc",
            "platform": "tiktok",
            "budget_min": "100.00",
            "budget_max": "500.00",
            "deadline": (timezone.now() + timezone.timedelta(days=10)).isoformat(),
        }

    def _brand(self, *, photo_required):
        user = User.objects.create_user(
            email=f"brand-{photo_required}@example.com", password="StrongPass123", role=Role.BRAND
        )
        user.email_verified = True
        user.profile_photo_required = photo_required
        user.save(update_fields=["email_verified", "profile_photo_required"])
        return user

    def test_new_account_without_a_photo_is_blocked(self):
        user = self._brand(photo_required=True)
        self.client.force_authenticate(user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "PROFILE_PHOTO_REQUIRED")

    def test_grandfathered_account_without_a_photo_can_still_work(self):
        user = self._brand(photo_required=False)
        self.client.force_authenticate(user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_grandfathered_account_reports_onboarding_complete(self):
        user = self._brand(photo_required=False)
        self.client.force_authenticate(user)
        response = self.client.get(reverse("accounts:my-onboarding"))
        self.assertTrue(response.data["complete"])
        self.assertFalse(response.data["profile_photo_required"])
        self.assertIsNone(response.data["next_step"])

    def test_new_registration_requires_a_photo(self):
        """Kayıt ucundan açılan her yeni hesap zorunluluğa tabidir."""
        self.client.post(
            reverse("accounts:register"),
            {
                "email": "brand-new@example.com",
                "password": "StrongPass123",
                "password_confirm": "StrongPass123",
                "role": Role.BRAND,
            },
        )
        user = User.objects.get(email="brand-new@example.com")
        self.assertTrue(user.profile_photo_required)
        self.assertTrue(user.photo_is_required)

    def test_grandfathered_account_still_needs_a_verified_email(self):
        """Muafiyet yalnızca fotoğrafı kapsar; e-posta doğrulaması herkes için geçerli."""
        user = self._brand(photo_required=False)
        user.email_verified = False
        user.save(update_fields=["email_verified"])
        self.client.force_authenticate(user)
        response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "EMAIL_NOT_VERIFIED")

    def test_global_switch_still_disables_the_rule_for_everyone(self):
        user = self._brand(photo_required=True)
        self.client.force_authenticate(user)
        with self.settings(ONBOARDING_REQUIRE_PROFILE_PHOTO=False):
            response = self.client.post(reverse("campaigns:campaign-list"), self.campaign_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
