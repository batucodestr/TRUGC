from django.contrib import admin

from .models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["company_name", "user", "industry", "company_size", "is_verified", "created_at"]
    list_filter = ["industry", "company_size", "is_verified"]
    search_fields = ["company_name", "user__email", "website"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]
