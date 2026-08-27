from django.contrib import admin

from .models import Attachment, Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sender", "body", "created_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "campaign", "created_at", "updated_at"]
    search_fields = ["participants__email", "campaign__title"]
    filter_horizontal = ["participants"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "sender", "is_read", "created_at"]
    list_filter = ["is_read"]
    search_fields = ["sender__email", "body"]
    autocomplete_fields = ["conversation", "sender"]


admin.site.register(Attachment)
