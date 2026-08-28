from django.contrib import admin

from .models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["company_name", "user", "industry", "company_size", "is_verified", "has_paid_access", "created_at"]
    list_filter = ["industry", "company_size", "is_verified", "has_paid_access"]
    list_editable = ["has_paid_access"]
    search_fields = ["company_name", "user__email", "website"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]
