import secrets
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class TransactionStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    HELD_IN_ESCROW = "held_in_escrow", _("Held in escrow")
    RELEASED = "released", _("Released")
    REFUNDED = "refunded", _("Refunded")
    FAILED = "failed", _("Failed")


class Transaction(models.Model):
    """
    A payment moving from a brand to a creator for an accepted application.
    Provider-agnostic by design (provider/provider_reference) so a real gateway
    (Stripe Connect, etc.) can be plugged in later without a schema change.
    """

    application = models.ForeignKey(
        "applications.Application", on_delete=models.PROTECT, related_name="transactions"
    )
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments_made")
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments_received")

    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    currency = models.CharField(max_length=3, default="TRY")
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING, db_index=True)

    provider = models.CharField(max_length=50, blank=True, help_text="e.g. 'stripe'. Empty while unintegrated.")
    provider_reference = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments_transaction"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"Transaction<{self.pk}:{self.amount}{self.currency}:{self.status}>"


# ---------------------------------------------------------------------------
# Sanal POS (bkz. apps/payments/pos/)
# ---------------------------------------------------------------------------
class PaymentPurpose(models.TextChoices):
    BRAND_ACCESS = "brand_access", _("Brand directory access")
    CAMPAIGN_ESCROW = "campaign_escrow", _("Campaign escrow funding")


class PosPaymentStatus(models.TextChoices):
    CREATED = "created", _("Created")
    PENDING = "pending", _("Pending at provider")
    PAID = "paid", _("Paid")
    FAILED = "failed", _("Failed")
    CANCELLED = "cancelled", _("Cancelled")


def generate_merchant_oid() -> str:
    """Bankaya gönderilen sipariş numarası.

    Sağlayıcıların çoğu (PayTR dahil) yalnızca harf+rakam kabul eder ve aynı
    numaranın tekrar kullanılmasını reddeder; bu yüzden her ödeme denemesi
    kendi rastgele numarasını alır. Tahmin edilemez olması ayrıca callback
    uçlarının dışarıdan sipariş numarası denenerek yoklanmasını zorlaştırır.
    """
    return f"TRUGC{secrets.token_hex(10).upper()}"


class PosPayment(models.Model):
    """Sanal POS üzerinden başlatılan tek bir ödeme denemesi.

    **Kart verisi burada tutulmaz ve hiçbir zaman bu sunucuya uğramaz**:
    entegrasyon, sağlayıcının kendi barındırdığı 3D Secure ödeme sayfasına
    yönlendirme (hosted checkout) modeliyle çalışır, dolayısıyla kart numarası
    / CVV uygulamaya hiç girmez. Burada yalnızca sipariş referansı, tutar,
    durum ve sağlayıcının kart dışı yanıt alanları saklanır.
    """

    merchant_oid = models.CharField(max_length=64, unique=True, default=generate_merchant_oid, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pos_payments")
    purpose = models.CharField(max_length=32, choices=PaymentPurpose.choices)

    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="TRY")
    status = models.CharField(max_length=20, choices=PosPaymentStatus.choices, default=PosPaymentStatus.CREATED, db_index=True)

    provider = models.CharField(max_length=50)
    provider_reference = models.CharField(max_length=255, blank=True)

    # Marka erişim paketi satın alındığında kaç gün erişim açılacağı.
    access_days = models.PositiveIntegerField(default=0)
    # Kampanya emanetini fonlayan bir ödemeyse ilgili emanet kaydı.
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="pos_payments"
    )

    client_ip = models.GenericIPAddressField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    # Sağlayıcının kart DIŞI yanıt alanları (işlem no, hata kodu, taksit bilgisi).
    provider_payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments_pos_payment"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "purpose"])]

    def __str__(self):
        return f"PosPayment<{self.merchant_oid}:{self.amount}{self.currency}:{self.status}>"

    @property
    def is_settled(self) -> bool:
        return self.status in (PosPaymentStatus.PAID, PosPaymentStatus.FAILED, PosPaymentStatus.CANCELLED)


# ---------------------------------------------------------------------------
# Bakiye (cüzdan) ve üyelik paketi
# ---------------------------------------------------------------------------
# Otomatik tahsilat (sanal POS) henüz açık olmadığı için ödemeler havale/EFT
# ile alınıp admin tarafından elle işleniyor. Admin iki şey yapar: kullanıcının
# bakiyesine para ekler ve kullanıcıya bir üyelik paketi tanımlar. Bu iki
# işlemin de kalıcı ve denetlenebilir olması gerekir — bakiye tek bir sayı
# olarak tutulmaz, her değişiklik bir WalletEntry satırı bırakır.


class Wallet(models.Model):
    """Kullanıcının TL bakiyesi.

    ``balance`` türetilmiş bir alandır: doğru değer her zaman WalletEntry
    satırlarının toplamıdır, bu alan onun önbelleğidir. İkisi yalnızca
    ``apps/payments/wallet.py`` içindeki servis fonksiyonları üzerinden, tek
    bir transaction içinde ve satır kilidiyle güncellenir.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )
    currency = models.CharField(max_length=3, default="TRY")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_wallet"

    def __str__(self):
        return f"Wallet<{self.user_id}:{self.balance}{self.currency}>"


class WalletEntryKind(models.TextChoices):
    ADMIN_CREDIT = "admin_credit", _("Admin tarafından yükleme")
    ADMIN_DEBIT = "admin_debit", _("Admin tarafından düşüm")
    PACKAGE_PURCHASE = "package_purchase", _("Paket satın alma")
    REFUND = "refund", _("İade")


class WalletEntry(models.Model):
    """Bakiye defteri: her hareket için tek satır, silinmez.

    ``amount`` işaretlidir (+ yükleme, − düşüm). ``balance_after``, hareketin
    uygulandığı andaki bakiyeyi dondurur; böylece geçmiş bir kayıt sonradan
    yapılan işlemlerden etkilenmeden okunabilir.
    """

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="entries")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    kind = models.CharField(max_length=32, choices=WalletEntryKind.choices, db_index=True)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_entries_created"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "payments_wallet_entry"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"WalletEntry<{self.wallet_id}:{self.amount}:{self.kind}>"


class Membership(models.Model):
    """Kullanıcının aktif üyelik paketi.

    Paket adı/süre etiketi ve başvuru hakkı, atama anında katalogdan
    **kopyalanır** (bkz. apps/payments/packages.py). Katalogdaki fiyat veya
    hak sayısı sonradan değişse bile kullanıcının satın aldığı paketin
    koşulları değişmez.

    Kullanıcı başına tek satır: paket değiştirmek yeni bir satır açmaz, bu
    satırı günceller. Geçmiş, bakiye defterinde ve AdminActionLog'da kalır.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="membership")
    package_code = models.CharField(max_length=32, blank=True, db_index=True)
    package_name = models.CharField(max_length=64, blank=True)
    tier_code = models.CharField(max_length=16, blank=True)
    tier_label = models.CharField(max_length=32, blank=True)
    #: Paketin kapsadığı başvuru hakkı; ``None`` sınırsız demektir.
    application_quota = models.PositiveIntegerField(null=True, blank=True)
    applications_used = models.PositiveIntegerField(default=0)
    #: Markanın aynı anda yayında tutabileceği kampanya sayısı; ``None``
    #: sınırsız. Creator paketlerinde 0'dır (kampanya açamazlar).
    campaign_quota = models.PositiveIntegerField(null=True, blank=True, default=0)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="memberships_assigned"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_membership"

    def __str__(self):
        return f"Membership<{self.user_id}:{self.package_code or 'none'}>"

    @property
    def is_active(self) -> bool:
        if not self.package_code or self.expires_at is None:
            return False
        return self.expires_at > timezone.now()

    @property
    def days_remaining(self) -> int:
        """Kalan tam gün sayısı; süresi dolmuşsa 0."""
        if not self.is_active or self.expires_at is None:
            return 0
        delta = self.expires_at - timezone.now()
        return max(delta.days, 0)

    @property
    def remaining_applications(self) -> int | None:
        """Kalan başvuru hakkı; sınırsız pakette ``None``."""
        if self.application_quota is None:
            return None
        return max(self.application_quota - self.applications_used, 0)

    @property
    def has_application_slot(self) -> bool:
        """Paket aktif ve hak kalmış mı?"""
        if not self.is_active:
            return False
        remaining = self.remaining_applications
        return remaining is None or remaining > 0
