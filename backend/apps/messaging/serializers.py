from django.contrib.auth import get_user_model
from django.db import models
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
    # Yalnızca yazma amaçlı: tek bir multipart POST'un mesajı ve tek ekini
    # birlikte oluşturmasını sağlar, çünkü Attachment'ın ayrı bir yazılabilir
    # endpoint'i yok (MVP kapsamı — mevcut arayüz için mesaj başına bir ek yeterli).
    attachment = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[message_attachment_extension_validator, validate_message_attachment_size],
    )

    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_email",
            "sender_name",
            "body",
            "is_read",
            "is_flagged",
            "is_edited",
            "edited_at",
            "attachments",
            "attachment",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_email",
            "sender_name",
            "is_read",
            "is_flagged",
            "is_edited",
            "edited_at",
            "attachments",
            "created_at",
        ]

    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    def get_sender_name(self, obj):
        full_name = getattr(getattr(obj.sender, "profile", None), "full_name", "")
        return full_name or obj.sender.email

    def validate(self, attrs):
        # PATCH (edit) çağrılarında ek/gövde zorunlu değildir — bu yalnızca
        # ilk oluşturmada geçerlidir.
        if self.instance is None and not attrs.get("body") and not attrs.get("attachment"):
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
    """/manage için salt okunur denetim görünümü — sadece çağıranın değil, platform genelindeki tüm konuşmalar."""

    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "participants", "campaign", "message_count", "last_message", "created_at", "updated_at"]
        read_only_fields = fields

    def get_participants(self, obj):
        return [_serialize_participant(u) for u in obj.participants.all()]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last).data if last else None


def _serialize_participant(user):
    full_name = getattr(getattr(user, "profile", None), "full_name", "")
    return {"id": user.id, "email": user.email, "name": full_name or user.email, "role": user.role}


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
        return [_serialize_participant(u) for u in obj.participants.all()]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last).data if last else None

    def create(self, validated_data):
        request = self.context["request"]
        participants = set(validated_data.pop("participants"))

        # participant_ids'te yalnızca çağıranın kendi id'si gönderilmiş olsa bile
        # (ör. kendi profiline "mesaj gönder" denemesi) bunu açıkça reddet —
        # request.user'ı eklemeden önce kontrol ederek "en az 2 katılımcı"
        # kuralının yan etkisine güvenmek yerine net bir hata mesajı veriyoruz.
        if participants <= {request.user}:
            raise serializers.ValidationError({"participant_ids": "Kendinize mesaj gönderemezsiniz."})

        participants.add(request.user)
        if len(participants) < 2:
            raise serializers.ValidationError({"participant_ids": "Bir konuşmanın en az iki katılımcısı olmalıdır."})

        campaign = validated_data.get("campaign")
        # Aynı katılımcı kümesi (ve aynı kampanya) için tekrar "iletişime geç"
        # tıklandığında her seferinde yeni bir konuşma açmak yerine var olanı
        # bul — aksi halde her tıklama chat listesinde ayrı bir satır oluşturur.
        existing = (
            Conversation.objects.annotate(participant_count=models.Count("participants"))
            .filter(campaign=campaign, participant_count=len(participants))
        )
        for candidate in existing:
            if set(candidate.participants.values_list("pk", flat=True)) == {p.pk for p in participants}:
                return candidate

        conversation = Conversation.objects.create(**validated_data)
        conversation.participants.set(participants)
        return conversation
