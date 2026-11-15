"""İş birliği yaşam döngüsü: başvuru kabulü → teslim → revizyon/onay → ödeme.

Kampanya durumları: Taslak → İncelemede → Yayında → Devam Ediyor → Tamamlandı / İptal.
İş birliği durumları: İçerik Bekleniyor → Teslim Edildi → Revizyon → Onaylandı → Ödendi.
Her geçiş ``StatusLog``'a yazılır.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignStatus
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .logging import log_status_change
from .models import Collaboration, CollaborationStatus, ContentSubmission, StatusLog, SubmissionStatus


class CollaborationError(Exception):
    """İş kuralı ihlali (yanlış durumda işlem, yetkisiz taraf vb.)."""


def set_campaign_status(campaign: Campaign, new: str, *, actor=None, note: str = "") -> None:
    old = campaign.status
    if old == new:
        return
    campaign.status = new
    campaign.save(update_fields=["status", "updated_at"])
    log_status_change(StatusLog.ENTITY_CAMPAIGN, campaign, old, new, actor=actor, note=note)


@transaction.atomic
def start_for_application(application, *, actor=None) -> Collaboration:
    """Kabul edilen başvuru için iş birliğini başlatır (idempotent)."""
    existing = Collaboration.objects.filter(application=application).first()
    if existing:
        return existing
    campaign = application.campaign
    amount = application.proposed_rate if application.proposed_rate else campaign.budget_max
    collab = Collaboration.objects.create(
        application=application,
        campaign=campaign,
        brand=campaign.brand,
        creator=application.creator,
        agreed_amount=amount or 0,
        due_at=campaign.deadline,
    )
    log_status_change(StatusLog.ENTITY_COLLABORATION, collab, "", collab.status, actor=actor, note="Başvuru kabul edildi")
    if campaign.status == CampaignStatus.PUBLISHED:
        set_campaign_status(campaign, CampaignStatus.IN_PROGRESS, actor=actor, note="İlk iş birliği başladı")
    notify_user(user=application.creator.user, title="İş birliği başladı",
                body=f"\"{campaign.title}\" için içerik teslimini bekliyoruz.",
                notification_type=NotificationType.CAMPAIGN, link="/dashboard/creator/collaborations")
    return collab


def _set(collab: Collaboration, new: str, *, actor, note: str = "") -> None:
    old = collab.status
    collab.status = new
    collab.save(update_fields=["status", "updated_at"])
    log_status_change(StatusLog.ENTITY_COLLABORATION, collab, old, new, actor=actor, note=note)


@transaction.atomic
def submit_content(collab: Collaboration, user, *, file=None, url: str = "", note: str = "") -> ContentSubmission:
    collab = Collaboration.objects.select_for_update().select_related("campaign__brand__user").get(pk=collab.pk)
    if collab.creator.user_id != user.id:
        raise CollaborationError("Bu iş birliğinin creator'ı siz değilsiniz.")
    if collab.status not in (CollaborationStatus.AWAITING_CONTENT, CollaborationStatus.REVISION):
        raise CollaborationError("Şu an içerik teslim edilemez.")
    if not file and not url:
        raise CollaborationError("Dosya yükleyin veya içerik bağlantısı girin.")

    revision = collab.submissions.count()
    submission = ContentSubmission.objects.create(
        collaboration=collab, revision_number=revision, file=file or "", url=url, note=note
    )
    now = timezone.now()
    if collab.first_delivered_at is None:
        collab.first_delivered_at = now
        collab.delivered_on_time = collab.due_at is None or now <= collab.due_at
        collab.save(update_fields=["first_delivered_at", "delivered_on_time", "updated_at"])
    _set(collab, CollaborationStatus.DELIVERED, actor=user, note="İçerik teslim edildi" if not revision else f"Revizyon {revision} teslim edildi")
    notify_user(user=collab.campaign.brand.user, title="İçerik teslim edildi",
                body=f"\"{collab.campaign.title}\" için içerik inceleme bekliyor.",
                notification_type=NotificationType.CAMPAIGN, link="/dashboard/brand/collaborations")
    return submission


def _brand_guard(collab: Collaboration, user, allowed: tuple[str, ...]) -> None:
    if collab.brand.user_id != user.id:
        raise CollaborationError("Bu iş birliği size ait değil.")
    if collab.status not in allowed:
        raise CollaborationError("Bu işlem için iş birliği uygun durumda değil.")


@transaction.atomic
def request_revision(collab: Collaboration, user, *, feedback: str) -> Collaboration:
    collab = Collaboration.objects.select_for_update().get(pk=collab.pk)
    _brand_guard(collab, user, (CollaborationStatus.DELIVERED,))
    if not feedback.strip():
        raise CollaborationError("Revizyon notu yazın.")
    latest = collab.submissions.filter(status=SubmissionStatus.SUBMITTED).first()
    if latest:
        latest.status = SubmissionStatus.REVISION_REQUESTED
        latest.feedback = feedback
        latest.reviewed_at = timezone.now()
        latest.save(update_fields=["status", "feedback", "reviewed_at"])
    _set(collab, CollaborationStatus.REVISION, actor=user, note=feedback[:200])
    notify_user(user=collab.creator.user, title="Revizyon istendi", body=feedback[:200],
                notification_type=NotificationType.CAMPAIGN, link="/dashboard/creator/collaborations")
    return collab


@transaction.atomic
def approve(collab: Collaboration, user) -> Collaboration:
    collab = Collaboration.objects.select_for_update().get(pk=collab.pk)
    _brand_guard(collab, user, (CollaborationStatus.DELIVERED,))
    latest = collab.submissions.filter(status=SubmissionStatus.SUBMITTED).first()
    if latest:
        latest.status = SubmissionStatus.APPROVED
        latest.reviewed_at = timezone.now()
        latest.save(update_fields=["status", "reviewed_at"])
    collab.approved_at = timezone.now()
    collab.save(update_fields=["approved_at", "updated_at"])
    _set(collab, CollaborationStatus.APPROVED, actor=user, note="İçerik onaylandı, ödeme bekleniyor")
    notify_user(user=collab.creator.user, title="İçeriğiniz onaylandı",
                body="Marka ödemeyi başlattığında hak edişiniz oluşacak.",
                notification_type=NotificationType.CAMPAIGN, link="/dashboard/creator/collaborations")
    return collab


def mark_paid(collab: Collaboration) -> None:
    """Marka ödemesi PayTR'de doğrulanınca çağrılır (idempotent)."""
    if collab.status == CollaborationStatus.PAID:
        return
    collab.paid_at = timezone.now()
    collab.save(update_fields=["paid_at", "updated_at"])
    _set(collab, CollaborationStatus.PAID, actor=None, note="Ödeme alındı")
    _complete_campaign_if_done(collab.campaign)


def cancel(collab: Collaboration, *, actor, note: str = "") -> None:
    if collab.status == CollaborationStatus.CANCELLED:
        return
    _set(collab, CollaborationStatus.CANCELLED, actor=actor, note=note)


def _complete_campaign_if_done(campaign: Campaign) -> None:
    """Tüm iş birlikleri ödenmiş/iptal ise kampanya otomatik 'Tamamlandı' olur."""
    active = campaign.collaborations.exclude(status__in=[CollaborationStatus.PAID, CollaborationStatus.CANCELLED])
    if campaign.collaborations.exists() and not active.exists() and campaign.status == CampaignStatus.IN_PROGRESS:
        set_campaign_status(campaign, CampaignStatus.COMPLETED, note="Tüm iş birlikleri tamamlandı")


def creator_stats(creator) -> dict:
    """Tamamlanan iş sayısı ve zamanında teslim oranı (herkese açık profil için)."""
    done = Collaboration.objects.filter(creator=creator, status__in=[CollaborationStatus.APPROVED, CollaborationStatus.PAID])
    completed = done.count()
    judged = done.exclude(delivered_on_time__isnull=True)
    judged_n = judged.count()
    on_time = judged.filter(delivered_on_time=True).count()
    return {
        "completed_jobs": completed,
        "on_time_rate": round(on_time * 100 / judged_n) if judged_n else None,
    }
