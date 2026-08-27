from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["campaign", "reviewer", "reviewee", "rating", "created_at"]
    list_filter = ["rating"]
    search_fields = ["reviewer__email", "reviewee__email", "campaign__title", "comment"]
    autocomplete_fields = ["campaign", "reviewer", "reviewee"]
    readonly_fields = ["created_at", "updated_at"]
