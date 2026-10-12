"""Ödeme bildirimi akışı: kullanıcı "ödedim" der → admin onaylar.

Sanal POS açılana kadar para havale/EFT ile geliyor ve platform ödemeyi kendi
göremiyor. Akış şu:

1. Creator kampanyaya başvurur.
2. Ödeme ekranına yönlendirilir; paketini seçip "Ödemeyi yaptım" der.
3. Burada bir ``PaymentDeclaration`` açılır ve **adminlere sırasıyla iki
   bildirim** gider: önce "ödeme bildirimi geldi", sonra "yeni kampanya
   başvurusu".
4. Admin dekontu görünce onaylar; onay anında bakiye yüklenir ve paket
   tanımlanır.

Bildirimde bulunmak tek başına hiçbir hak kazandırmaz — bakiyeye ve pakete
dokunan tek yer ``approve_declaration``'dır.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Role
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import PaymentDeclaration, PaymentDeclarationStatus, WalletEntryKind
from .packages import resolve
from .wallet import WalletError, adjust_balance, assign_membership


def _staff_recipients():
    """Bildirim gidecek yetkili hesaplar: admin + moderatör + staff.

    Sonuç listeye çevrilir: bildirimler iki tur hâlinde ve **sırayla**
    oluşturulacağı için queryset'in iki kez sorgulanması istenmez.
    """
    User = get_user_model()
    return list(
        User.objects.filter(is_active=True)
        .filter(Q(role__in=[Role.ADMIN, Role.MODERATOR]) | Q(is_staff=True) | Q(is_superuser=True))
        .distinct()
    )


@transaction.atomic
def create_declaration(*, user, package_code, tier_code, application=None, sender_note=""):
    """Ödeme bildirimi açar ve adminleri sırasıyla bilgilendirir.

    Bildirim sırası bilinçlidir: önce ödeme, sonra başvuru. Admin paneli
    bildirimleri en yeniden eskiye listelediği için başvuru bildirimi üstte,
    ödeme bildirimi hemen altında görünür; ikisi tek bir olayın iki parçası
    olarak okunur.
    """
    resolved = resolve(package_code, tier_code)
    if resolved is None:
        raise WalletError("Geçersiz paket veya süre.")
    package, tier = resolved

    declaration = PaymentDeclaration.objects.create(
        user=user,
        application=application,
        package_code=package.code,
        package_name=package.name,
        tier_code=tier.code,
        tier_label=tier.label,
        amount=tier.price,
        sender_note=sender_note,
    )

    who = getattr(getattr(user, "profile", None), "full_name", "") or user.email
    recipients = _staff_recipients()

    # 1) Önce ödeme bildirimi.
    for staff in recipients:
        notify_user(
            user=staff,
            title="Ödeme bildirimi geldi",
            body=f"{who}, {package.name} · {tier.label} paketi için {tier.price} TL ödeme bildiriminde bulundu.",
            notification_type=NotificationType.PAYMENT,
            link="/manage/payments",
        )

    # 2) Sonra, bildirim bir başvurunun ardından yapıldıysa başvuru bildirimi.
    if application is not None:
        for staff in recipients:
            notify_user(
                user=staff,
                title="Yeni kampanya başvurusu",
                body=f"{who}, \"{application.campaign.title}\" kampanyasına başvurdu.",
                notification_type=NotificationType.APPLICATION,
                link="/manage/applications",
            )

    return declaration


@transaction.atomic
def approve_declaration(declaration: PaymentDeclaration, *, actor, note="", assign_package=True):
    """Bildirimi onaylar: bakiyeyi yükler ve (istenirse) paketi tanımlar.

    Para ÖNCE bakiyeye yüklenir, paket SONRA bu bakiyeden satılır; böylece
    cüzdan defteri "şu kadar para geldi, şu kadarı şu pakete gitti" diye
    okunur. İkisi tek transaction içindedir.
    """
    if declaration.status != PaymentDeclarationStatus.PENDING:
        raise WalletError("Bu bildirim zaten sonuçlandırılmış.")

    adjust_balance(
        declaration.user,
        declaration.amount,
        kind=WalletEntryKind.ADMIN_CREDIT,
        note=note or f"Ödeme bildirimi onayı · {declaration.package_name} {declaration.tier_label}",
        actor=actor,
    )

    if assign_package:
        assign_membership(
            declaration.user,
            declaration.package_code,
            declaration.tier_code,
            actor=actor,
            charge_wallet=True,
            note=f"{declaration.package_name} · {declaration.tier_label}",
        )

    declaration.status = PaymentDeclarationStatus.APPROVED
    declaration.review_note = note
    declaration.reviewed_by = actor
    declaration.reviewed_at = timezone.now()
    declaration.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at"])

    notify_user(
        user=declaration.user,
        title="Ödemeniz onaylandı",
        body=f"{declaration.package_name} · {declaration.tier_label} paketiniz hesabınıza tanımlandı.",
        notification_type=NotificationType.PAYMENT,
        link="/dashboard",
    )
    return declaration


@transaction.atomic
def reject_declaration(declaration: PaymentDeclaration, *, actor, note=""):
    """Bildirimi reddeder. Bakiyeye dokunulmaz — zaten hiç yüklenmemişti."""
    if declaration.status != PaymentDeclarationStatus.PENDING:
        raise WalletError("Bu bildirim zaten sonuçlandırılmış.")

    declaration.status = PaymentDeclarationStatus.REJECTED
    declaration.review_note = note
    declaration.reviewed_by = actor
    declaration.reviewed_at = timezone.now()
    declaration.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at"])

    notify_user(
        user=declaration.user,
        title="Ödeme bildiriminiz onaylanamadı",
        body=note or "Ödemeniz hesabımıza ulaşmadı. Lütfen çağrı destek hattımızdan bize ulaşın.",
        notification_type=NotificationType.PAYMENT,
        link="/fiyatlandirma",
    )
    return declaration
