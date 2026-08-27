from django.contrib import admin

from .models import Campaign, CampaignMedia, CampaignRequirement


class CampaignMediaInline(admin.TabularInline):
    model = CampaignMedia
    extra = 0


class CampaignRequirementInline(admin.TabularInline):
    model = CampaignRequirement
    extra = 0


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ["title", "brand", "platform", "status", "budget_min", "budget_max", "start_date", "deadline"]
    list_filter = ["status", "platform", "categories"]
    search_fields = ["title", "description", "brand__company_name"]
    autocomplete_fields = ["brand"]
    filter_horizontal = ["categories"]
    inlines = [CampaignRequirementInline, CampaignMediaInline]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "deadline"
