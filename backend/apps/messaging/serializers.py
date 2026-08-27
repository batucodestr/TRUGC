from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.common.validators import message_attachment_extension_validator, validate_message_attachment_size

from .models import Attachment, Conversation, Message

User = get_user_model()


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "file_name", "content_type", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    # Write-only: lets a single multipart POST create the message and its one
    # attachment together, since Attachment has no separate writable endpoint
    # (MVP scope — one attachment per message is enough for the current UI).
    attachment = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[message_attachment_extension_validator, validate_message_attachment_size],
    )

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender_email", "body", "is_read", "is_flagged", "attachments", "attachment", "created_at"]
        read_only_fields = ["id", "conversation", "sender_email", "is_read", "is_flagged", "attachments", "created_at"]

    def validate(self, attrs):
        if not attrs.get("body") and not attrs.get("attachment"):
            raise serializers.ValidationError("A message needs a body or an attachment.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        attachment_file = validated_data.pop("attachment", None)
        validated_data["conversation"] = self.context["conversation"]
        validated_data["sender"] = request.user
        message = super().create(validated_data)
        if attachment_file:
            Attachment.objects.create(
                message=message,
                file=attachment_file,
                file_name=attachment_file.name,
                content_type=getattr(attachment_file, "content_type", ""),
            )
        return message


class AdminConversationSerializer(serializers.ModelSerializer):
    """Read-only oversight view for /manage — every conversation platform-wide, not just the caller's own."""

    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "participants", "campaign", "message_count", "last_message", "created_at", "updated_at"]
        read_only_fields = fields

    def get_participants(self, obj):
        return [{"id": u.id, "email": u.email, "role": u.role} for u in obj.participants.all()]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last).data if last else None


class ConversationSerializer(serializers.ModelSerializer):
    participant_ids = serializers.PrimaryKeyRelatedField(
        source="participants", queryset=User.objects.all(), many=True, write_only=True
    )
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "participants", "participant_ids", "campaign", "last_message", "created_at", "updated_at"]
        read_only_fields = ["id", "participants", "last_message", "created_at", "updated_at"]

    def get_participants(self, obj):
        return [{"id": u.id, "email": u.email, "role": u.role} for u in obj.participants.all()]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last).data if last else None

    def create(self, validated_data):
        request = self.context["request"]
        participants = set(validated_data.pop("participants"))
        participants.add(request.user)
        if len(participants) < 2:
            raise serializers.ValidationError({"participant_ids": "A conversation needs at least two participants."})
        conversation = Conversation.objects.create(**validated_data)
        conversation.participants.set(participants)
        return conversation
