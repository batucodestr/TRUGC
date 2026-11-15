from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus
from apps.common.testing import onboard
from apps.messaging.models import Attachment, Conversation, UserBlock
from apps.payments import ledger, wallet
from apps.payments.membership import expire_memberships
from apps.payments.models import (
    CollaborationPayment,
    CreatorEarning,
    LedgerEntry,
    LedgerEntryType,
    Membership,
    PosPayment,
)

from .models import Collaboration, CollaborationStatus, StatusLog

PAID = dict(BILLING_FREE_PERIOD_ENABLED=False, POS_PROVIDER="sandbox", DEBUG=True)


class Base(APITestCase):
    def setUp(self):
        self.brand_user = User.objects.create_user(email="b@example.com", password="StrongPass123", role=Role.BRAND)
        self.creator_user = User.objects.create_user(email="c@example.com", password="StrongPass123", role=Role.CREATOR)
        self.admin = User.objects.create_user(email="a@example.com", password="StrongPass123", role=Role.ADMIN)
        for u in (self.brand_user, self.creator_user, self.admin):
            onboard(u)
        self.campaign = Campaign.objects.create(
            brand=self.brand_user.brand, title="Serum", description="d", platform="instagram",
            budget_min=1000, budget_max=1000, deadline=timezone.now() + timedelta(days=10),
            status=CampaignStatus.PUBLISHED,
        )

    def apply_and_accept(self):
        self.client.force_authenticate(self.creator_user)
        r = self.client.post(reverse("applications:application-list"), {"campaign_id": self.campaign.pk, "message": "hi"})
        assert r.status_code in (200, 201), r.data
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(reverse("applications:application-accept", args=[r.data["id"]]))
        assert r.status_code == 200, r.data
        return Collaboration.objects.get()


@override_settings(**PAID)
class CollaborationFlowTests(Base):
    def test_accept_starts_collaboration_and_campaign_in_progress(self):
        collab = self.apply_and_accept()
        self.assertEqual(collab.status, CollaborationStatus.AWAITING_CONTENT)
        self.assertEqual(collab.agreed_amount, Decimal("1000"))
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, CampaignStatus.IN_PROGRESS)
        # Her aşama denetim kaydında: başvuru, iş birliği, kampanya
        types = set(StatusLog.objects.values_list("entity_type", flat=True))
        self.assertEqual(types, {"application", "collaboration", "campaign"})

    def test_double_apply_is_idempotent_and_consumes_one_right(self):
        wallet.assign_membership(self.creator_user, "classic-creator", "3d")
        self.client.force_authenticate(self.creator_user)
        url = reverse("applications:application-list")
        a = self.client.post(url, {"campaign_id": self.campaign.pk, "message": "hi"})
        b = self.client.post(url, {"campaign_id": self.campaign.pk, "message": "hi"})
        self.assertEqual(a.status_code, 201)
        self.assertEqual(b.status_code, 200)
        self.assertEqual(Application.objects.count(), 1)
        self.assertEqual(Membership.objects.get(user=self.creator_user).applications_used, 1)

    def test_full_flow_pay_ledger_and_idempotent_callback(self):
        collab = self.apply_and_accept()
        # teslim → revizyon → tekrar teslim → onay
        self.client.force_authenticate(self.creator_user)
        r = self.client.post(reverse("collaborations:collaboration-submit", args=[collab.pk]), {"url": "https://x.co/v1"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(Collaboration.objects.get().delivered_on_time)
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(reverse("collaborations:collaboration-revision", args=[collab.pk]), {"feedback": "Logoyu büyüt"})
        self.assertEqual(r.data["status"], "revision")
        self.client.force_authenticate(self.creator_user)
        self.client.post(reverse("collaborations:collaboration-submit", args=[collab.pk]), {"url": "https://x.co/v2"})
        # ödeme onaydan önce başlatılamaz
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(reverse("payments:pos-checkout"), {"purpose": "collaboration", "collaboration_id": collab.pk})
        self.assertEqual(r.status_code, 400)
        self.client.post(reverse("collaborations:collaboration-approve", args=[collab.pk]))

        # Yetkisiz marka ödeme başlatamaz
        other = User.objects.create_user(email="o@example.com", password="StrongPass123", role=Role.BRAND)
        onboard(other)
        self.client.force_authenticate(other)
        r = self.client.post(reverse("payments:pos-checkout"), {"purpose": "collaboration", "collaboration_id": collab.pk})
        self.assertEqual(r.status_code, 400)

        # Tutar sunucuda hesaplanır: istemci amount gönderse de 1000 + %10 = 1100
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(
            reverse("payments:pos-checkout"),
            {"purpose": "collaboration", "collaboration_id": collab.pk, "amount": "1.00"},
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["amount"], "1100.00")
        oid = r.data["merchant_oid"]

        cb = reverse("payments:pos-callback", args=["sandbox"])
        self.assertEqual(self.client.post(cb, {"merchant_oid": oid, "status": "success"}).status_code, 200)
        self.client.post(cb, {"merchant_oid": oid, "status": "success"})  # yinelenen bildirim

        collab.refresh_from_db()
        self.assertEqual(collab.status, CollaborationStatus.PAID)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, CampaignStatus.COMPLETED)
        self.assertEqual(LedgerEntry.objects.filter(order_no=oid).count(), 3)  # tahsilat, komisyon, hak ediş
        commission = LedgerEntry.objects.get(entry_type=LedgerEntryType.PLATFORM_COMMISSION)
        self.assertEqual(commission.amount, Decimal("100.00"))
        earning = CreatorEarning.objects.get()
        self.assertEqual(earning.amount, Decimal("1000.00"))  # komisyon creator'dan kesilmedi
        self.assertEqual(CollaborationPayment.objects.get().total_amount, Decimal("1100.00"))

        # Hak ediş ödendi → ledger payout
        ledger.mark_earning_paid(earning, actor=self.admin, reference="TRF1")
        self.assertTrue(LedgerEntry.objects.filter(entry_type=LedgerEntryType.CREATOR_PAYOUT).exists())

    def test_failed_payment_does_not_pay(self):
        collab = self.apply_and_accept()
        collab.status = CollaborationStatus.APPROVED
        collab.save()
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(reverse("payments:pos-checkout"), {"purpose": "collaboration", "collaboration_id": collab.pk})
        self.client.post(reverse("payments:pos-callback", args=["sandbox"]), {"merchant_oid": r.data["merchant_oid"], "status": "failed"})
        collab.refresh_from_db()
        self.assertEqual(collab.status, CollaborationStatus.APPROVED)
        self.assertFalse(CreatorEarning.objects.exists())
        self.assertFalse(LedgerEntry.objects.exists())

    def test_refund_reverses_ledger_and_cancels_earning(self):
        collab = self.apply_and_accept()
        collab.status = CollaborationStatus.APPROVED
        collab.save()
        self.client.force_authenticate(self.brand_user)
        r = self.client.post(reverse("payments:pos-checkout"), {"purpose": "collaboration", "collaboration_id": collab.pk})
        self.client.post(reverse("payments:pos-callback", args=["sandbox"]), {"merchant_oid": r.data["merchant_oid"], "status": "success"})
        self.client.force_authenticate(self.admin)
        r = self.client.post(reverse("payments:admin-refund", args=["collaboration", collab.pk]), {"reason": "iptal"})
        self.assertEqual(r.status_code, 200, r.data)
        from django.db.models import Sum

        # Net etki sıfır; kayıtlar silinmedi, ters kayıtla düzeltildi.
        self.assertEqual(LedgerEntry.objects.filter(collaboration=collab).aggregate(s=Sum("amount"))["s"], Decimal("0.00"))
        self.assertEqual(LedgerEntry.objects.filter(collaboration=collab).count(), 6)
        self.assertEqual(CreatorEarning.objects.get().status, "cancelled")
        # ikinci iade reddedilir
        self.assertEqual(self.client.post(reverse("payments:admin-refund", args=["collaboration", collab.pk])).status_code, 400)

    def test_ledger_is_immutable(self):
        e = ledger.post(LedgerEntryType.MEMBERSHIP_PAYMENT, party=self.creator_user, party_role="creator", amount=10)
        with self.assertRaises(ValueError):
            e.amount = 5
            e.save()
        with self.assertRaises(ValueError):
            e.delete()
        with self.assertRaises(ValueError):
            LedgerEntry.objects.all().update(amount=1)

    def test_stats_and_review_gate(self):
        collab = self.apply_and_accept()
        review = {"campaign_id": self.campaign.pk, "reviewee_id": self.creator_user.pk, "rating": 5, "comment": "süper"}
        self.client.force_authenticate(self.brand_user)
        self.assertEqual(self.client.post(reverse("reviews:review-list"), review).status_code, 400)  # iş bitmedi
        collab.status = CollaborationStatus.APPROVED
        collab.delivered_on_time = True
        collab.save()
        self.assertEqual(self.client.post(reverse("reviews:review-list"), review).status_code, 201)
        self.assertEqual(self.client.post(reverse("reviews:review-list"), review).status_code, 400)  # çift yorum
        r = self.client.get(reverse("creators:creator-detail", args=[self.creator_user.creator.pk]))
        self.assertEqual(r.data["completed_jobs"], 1)
        self.assertEqual(r.data["on_time_rate"], 100)
        self.assertEqual(r.data["average_rating"], 5.0)


@override_settings(**PAID)
class CampaignApprovalTests(Base):
    @override_settings(CAMPAIGN_REQUIRES_APPROVAL=True)
    def test_review_flow_and_premium_visibility(self):
        self.client.force_authenticate(self.brand_user)
        payload = {
            "title": "Yeni", "description": "d", "platform": "tiktok", "budget_min": "100", "budget_max": "200",
            "deadline": (timezone.now() + timedelta(days=5)).isoformat(), "status": "published", "is_premium_only": True,
        }
        r = self.client.post(reverse("campaigns:campaign-list"), payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["status"], "in_review")
        cid = r.data["id"]
        # Marka kendi ilanını yayına alamaz
        r = self.client.patch(reverse("campaigns:campaign-detail", args=[cid]), {"status": "published"}, format="json")
        self.assertEqual(r.data["status"], "in_review")
        # Creator incelemedeki ilanı göremez
        self.client.force_authenticate(self.creator_user)
        self.assertEqual(self.client.get(reverse("campaigns:campaign-detail", args=[cid])).status_code, 404)
        # Admin onayı
        self.client.force_authenticate(self.admin)
        r = self.client.post(reverse("campaigns:campaign-approve", args=[cid]), {"note": "ok"}, format="json")
        self.assertEqual(r.data["status"], "published")
        self.assertTrue(StatusLog.objects.filter(entity_type="campaign", entity_id=cid, to_status="published").exists())
        # Premium kampanya: Classic/paketsiz creator görmez, Premium görür
        self.client.force_authenticate(self.creator_user)
        self.assertEqual(self.client.get(reverse("campaigns:campaign-detail", args=[cid])).status_code, 404)
        wallet.assign_membership(self.creator_user, "premium-creator", "3d")
        self.assertEqual(self.client.get(reverse("campaigns:campaign-detail", args=[cid])).status_code, 200)

    @override_settings(CAMPAIGN_REQUIRES_APPROVAL=True)
    def test_reject_requires_note(self):
        self.campaign.status = CampaignStatus.IN_REVIEW
        self.campaign.save()
        self.client.force_authenticate(self.admin)
        url = reverse("campaigns:campaign-reject", args=[self.campaign.pk])
        self.assertEqual(self.client.post(url, {}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url, {"note": "Uygunsuz"}, format="json").data["status"], "cancelled")


class MembershipRulesTests(Base):
    def test_upgrade_carries_remaining_applications(self):
        wallet.assign_membership(self.creator_user, "classic-creator", "3d")  # 3 hak
        Membership.objects.filter(user=self.creator_user).update(applications_used=1)  # 2 kaldı
        m = wallet.assign_membership(self.creator_user, "premium-creator", "weekly", carry_over=True)  # 20 hak
        self.assertEqual(m.application_quota, 22)
        self.assertEqual(m.applications_used, 0)
        self.assertEqual((m.expires_at - timezone.now()).days, 6)  # yeni paketin süresi şimdiden

    def test_renewal_stacks_time(self):
        m1 = wallet.assign_membership(self.creator_user, "classic-creator", "weekly")
        m2 = wallet.assign_membership(self.creator_user, "classic-creator", "weekly", carry_over=True)
        self.assertEqual(m2.expires_at - m1.expires_at, timedelta(days=7))
        self.assertEqual(m2.application_quota, 10 + 10)

    def test_admin_assign_still_resets(self):
        wallet.assign_membership(self.creator_user, "classic-creator", "3d")
        m = wallet.assign_membership(self.creator_user, "classic-creator", "3d")
        self.assertEqual(m.application_quota, 3)

    def test_expiry_task_ends_membership_and_notifies(self):
        wallet.assign_membership(self.creator_user, "classic-creator", "3d")
        Membership.objects.filter(user=self.creator_user).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(expire_memberships(), 1)
        m = Membership.objects.get(user=self.creator_user)
        self.assertEqual(m.package_code, "")
        self.assertFalse(m.is_active)
        self.assertTrue(self.creator_user.notifications.filter(title__icontains="sona erdi").exists())
        self.assertEqual(expire_memberships(), 0)


class SecureMessagingTests(Base):
    def setUp(self):
        super().setUp()
        self.conv = Conversation.objects.create()
        self.conv.participants.set([self.brand_user, self.creator_user])

    def _send(self, user, name, data, ctype):
        self.client.force_authenticate(user)
        up = SimpleUploadedFile(name, data, content_type=ctype)
        return self.client.post(reverse("messaging:conversation-messages", args=[self.conv.pk]), {"body": "x", "attachment": up}, format="multipart")

    def test_attachment_url_is_signed_and_participant_only(self):
        r = self._send(self.brand_user, "b.pdf", b"%PDF-1.4 hi", "application/pdf")
        self.assertEqual(r.status_code, 201, r.data)
        url = r.data["attachments"][0]["file"]
        self.assertTrue(url.startswith("/api/v1/files/"))
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/files/forged-token/").status_code, 404)
        # süresi dolmuş imza
        with mock.patch("apps.common.signed_files.MAX_AGE_SECONDS", -1):
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_video_allowed_and_content_sniffing(self):
        self.assertEqual(self._send(self.brand_user, "v.mp4", b"\x00\x00\x00\x18ftypmp42" + b"0" * 20, "video/mp4").status_code, 201)
        self.assertEqual(self._send(self.brand_user, "fake.png", b"not a png at all", "image/png").status_code, 400)

    def test_block_prevents_messages(self):
        self.client.force_authenticate(self.creator_user)
        self.client.post(reverse("messaging:block-list"), {"user_id": self.brand_user.pk}, format="json")
        self.assertTrue(UserBlock.objects.exists())
        r = self._send(self.brand_user, "b.pdf", b"%PDF-1.4", "application/pdf")
        self.assertEqual(r.status_code, 403)
        self.client.force_authenticate(self.creator_user)
        self.client.delete(reverse("messaging:block-detail", args=[self.brand_user.pk]))
        self.assertEqual(self._send(self.brand_user, "b.pdf", b"%PDF-1.4", "application/pdf").status_code, 201)


class SocialOAuthTests(Base):
    def test_state_is_bound_to_user_and_platform(self):
        from apps.creators.social.providers import SocialError
        from apps.creators.social.views import make_state, read_state

        state = make_state(self.creator_user, "instagram")
        read_state(state, self.creator_user, "instagram")
        with self.assertRaises(SocialError):
            read_state(state, self.brand_user, "instagram")
        with self.assertRaises(SocialError):
            read_state(state, self.creator_user, "tiktok")
        with self.assertRaises(SocialError):
            read_state("garbage", self.creator_user, "instagram")

    def test_unconfigured_connect_returns_503(self):
        self.client.force_authenticate(self.creator_user)
        r = self.client.get(reverse("creators:social-connect", args=["instagram"]))
        self.assertEqual(r.status_code, 503)

    @override_settings(INSTAGRAM_CLIENT_ID="id", INSTAGRAM_CLIENT_SECRET="sec")
    def test_callback_links_verified_account_and_badge(self):
        from apps.creators.social.providers import Profile, Tokens
        from apps.creators.social.views import make_state

        self.client.force_authenticate(self.creator_user)
        state = make_state(self.creator_user, "instagram")
        profile = Profile("ig-1", "ceren", "https://instagram.com/ceren", 85000, 5000, 4.2)
        with mock.patch("apps.creators.social.providers.InstagramProvider.exchange_code", return_value=Tokens("tok", expires_in=3600)), \
             mock.patch("apps.creators.social.providers.InstagramProvider.fetch_profile", return_value=profile):
            r = self.client.post(reverse("creators:social-callback", args=["instagram"]), {"code": "c", "state": state}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        creator = self.creator_user.creator
        creator.refresh_from_db()
        self.assertTrue(creator.is_verified)
        acc = creator.social_accounts.get()
        self.assertEqual(acc.followers_count, 85000)
        self.assertNotIn("tok", acc.access_token_enc)  # şifreli saklanır
        from apps.creators.social import crypto

        self.assertEqual(crypto.decrypt(acc.access_token_enc), "tok")
        # OAuth'lu hesabın takipçi sayısı elle değiştirilemez
        r = self.client.patch(reverse("creators:social-account-detail", args=[acc.pk]), {"followers_count": 9999999}, format="json")
        acc.refresh_from_db()
        self.assertEqual(acc.followers_count, 85000)
        # Aynı hesap başka creator'a bağlanamaz
        other = User.objects.create_user(email="c2@example.com", password="StrongPass123", role=Role.CREATOR)
        onboard(other)
        self.client.force_authenticate(other)
        state2 = make_state(other, "instagram")
        with mock.patch("apps.creators.social.providers.InstagramProvider.exchange_code", return_value=Tokens("t2")), \
             mock.patch("apps.creators.social.providers.InstagramProvider.fetch_profile", return_value=profile):
            r = self.client.post(reverse("creators:social-callback", args=["instagram"]), {"code": "c", "state": state2}, format="json")
        self.assertEqual(r.status_code, 409)

    def test_suspicious_follower_jump_flags_account(self):
        from apps.creators.models import SocialAccount
        from apps.creators.social.providers import Profile
        from apps.creators.social.sync import apply_profile

        acc = SocialAccount.objects.create(creator=self.creator_user.creator, platform="instagram", handle="x", followers_count=1000)
        apply_profile(acc, Profile("id", "x", "", 50000, 0, 2.0))
        acc.refresh_from_db()
        self.assertTrue(acc.is_suspicious)
        self.assertIn("sıçradı", acc.flag_reason)
        self.assertFalse(self.creator_user.creator.__class__.objects.get(pk=self.creator_user.creator.pk).is_verified)
        self.assertTrue(self.admin.notifications.filter(title="Şüpheli creator profili").exists())


@override_settings(**PAID)
class DashboardAnalyticsTests(Base):
    def test_brand_dashboard_reach_and_trends(self):
        from apps.creators.models import SocialAccount

        SocialAccount.objects.create(creator=self.creator_user.creator, platform="instagram", handle="c", followers_count=50000)
        self.apply_and_accept()
        self.client.force_authenticate(self.brand_user)
        r = self.client.get(reverse("analytics:brand-dashboard"))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["estimated_reach"], 50000)
        self.assertEqual(len(r.data["reach_series"]), 30)
        self.assertEqual(r.data["reach_series"][-1]["reach"], 50000)
        self.assertIsNone(r.data["accepted_trend_pct"])  # önceki dönem 0 → yüzde yok (uydurma yok)

    def test_creator_dashboard_completion_and_earnings(self):
        collab = self.apply_and_accept()
        CreatorEarning.objects.create(collaboration=collab, creator_user=self.creator_user, amount=2000)
        self.client.force_authenticate(self.creator_user)
        r = self.client.get(reverse("analytics:creator-dashboard"))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["active_collaborations"], 1)
        self.assertEqual(r.data["earnings_this_month"], 2000.0)
        self.assertEqual(len(r.data["monthly_earnings"]), 6)
        self.assertEqual(r.data["profile_completion"]["percent"], 0)
