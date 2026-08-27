from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["id", "target_type", "target_id", "reporter", "status", "created_at"]
    list_filter = ["status", "target_type"]
    search_fields = ["reporter__email", "reason"]
    autocomplete_fields = ["reporter", "resolved_by"]
    readonly_fields = ["created_at"]
