from django.contrib import admin

from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["creator", "campaign", "status", "proposed_rate", "created_at", "reviewed_at"]
    list_filter = ["status"]
    search_fields = ["creator__display_name", "campaign__title"]
    autocomplete_fields = ["creator", "campaign"]
    readonly_fields = ["created_at", "updated_at"]
