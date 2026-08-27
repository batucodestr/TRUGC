from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["event_type", "actor", "target_content_type", "target_id", "created_at"]
    list_filter = ["event_type", "target_content_type"]
    search_fields = ["actor__email"]
    readonly_fields = ["created_at"]
