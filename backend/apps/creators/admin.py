from django.contrib import admin

from .models import Category, Creator, CreatorPackage, PortfolioItem, SocialAccount


class SocialAccountInline(admin.TabularInline):
    model = SocialAccount
    extra = 0


class PortfolioItemInline(admin.TabularInline):
    model = PortfolioItem
    extra = 0


class CreatorPackageInline(admin.TabularInline):
    model = CreatorPackage
    extra = 0


@admin.register(Creator)
class CreatorAdmin(admin.ModelAdmin):
    list_display = ["display_name", "user", "is_verified", "is_available", "created_at"]
    list_filter = ["is_verified", "is_available", "categories"]
    search_fields = ["display_name", "user__email", "bio"]
    autocomplete_fields = ["user"]
    filter_horizontal = ["categories"]
    inlines = [SocialAccountInline, PortfolioItemInline, CreatorPackageInline]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ["creator", "platform", "handle", "followers_count", "engagement_rate", "is_verified"]
    list_filter = ["platform", "is_verified"]
    search_fields = ["handle", "creator__display_name"]
    autocomplete_fields = ["creator"]
