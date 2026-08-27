from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "application", "payer", "payee", "amount", "currency", "status", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["payer__email", "payee__email", "provider_reference"]
    autocomplete_fields = ["application", "payer", "payee"]
    readonly_fields = ["created_at", "updated_at"]
