from django.contrib import admin

from .models import PosPayment, Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "application", "payer", "payee", "amount", "currency", "status", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["payer__email", "payee__email", "provider_reference"]
    autocomplete_fields = ["application", "payer", "payee"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(PosPayment)
class PosPaymentAdmin(admin.ModelAdmin):
    """Sanal POS denetim görünümü. Kayıtlar yalnızca okunur: ödeme durumu
    sağlayıcının doğrulanmış bildirimiyle değişir, elle değiştirilmemelidir."""

    list_display = ["merchant_oid", "user", "purpose", "amount", "currency", "status", "provider", "created_at", "paid_at"]
    list_filter = ["status", "purpose", "provider", "currency"]
    search_fields = ["merchant_oid", "user__email", "provider_reference"]
    autocomplete_fields = ["user", "transaction"]
    readonly_fields = [
        "merchant_oid",
        "user",
        "purpose",
        "amount",
        "currency",
        "status",
        "provider",
        "provider_reference",
        "access_days",
        "transaction",
        "client_ip",
        "failure_reason",
        "provider_payload",
        "created_at",
        "updated_at",
        "paid_at",
    ]

    def has_add_permission(self, request):
        return False
