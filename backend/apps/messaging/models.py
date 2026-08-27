from django.conf import settings
from django.db import models

from apps.common.validators import message_attachment_extension_validator, validate_message_attachment_size


class Conversation(models.Model):
    """Tam olarak iki taraf arasındaki bir konuşma, isteğe bağlı olarak bir kampanyayla ilişkilendirilebilir."""

    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="conversations")
    campaign = models.ForeignKey(
        "campaigns.Campaign", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "messaging_conversation"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Conversation<{self.pk}>"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    is_flagged = models.BooleanField(default=False, help_text="Flagged as spam/abuse by a moderator.")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "messaging_message"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message<{self.pk}:{self.sender_id}>"


class Attachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(
        upload_to="message_attachments/%Y/%m/",
        validators=[message_attachment_extension_validator, validate_message_attachment_size],
    )
    file_name = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messaging_attachment"

    def __str__(self):
        return self.file_name or self.file.name
