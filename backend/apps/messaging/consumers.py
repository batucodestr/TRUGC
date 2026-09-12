from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import Conversation, Message


class ConversationConsumer(AsyncJsonWebsocketConsumer):
    """Her konuşma için tek bir oda. Yeni mesajları, yazıyor göstergelerini,
    okundu bilgisini ve iki katılımcı için hafif çevrimiçi durumu yönetir."""

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"conversation_{self.conversation_id}"
        user = self.scope.get("user")

        if not user or not user.is_authenticated or not await self._is_participant(user):
            await self.close(code=4403)
            return

        self.user = user
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.presence", "user_id": user.id, "status": "online"}
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            if hasattr(self, "user"):
                await self.channel_layer.group_send(
                    self.group_name, {"type": "chat.presence", "user_id": self.user.id, "status": "offline"}
                )

    async def receive_json(self, content, **kwargs):
        message_type = content.get("type")

        if message_type == "message":
            body = (content.get("body") or "").strip()
            if not body:
                return
            message = await self._create_message(body)
            await self.channel_layer.group_send(self.group_name, {"type": "chat.message", "message": message})
            await self._notify_other_participants(body)

        elif message_type == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "chat.typing", "user_id": self.user.id, "is_typing": bool(content.get("is_typing"))},
            )

        elif message_type == "read":
            await self._mark_read()
            await self.channel_layer.group_send(self.group_name, {"type": "chat.read", "user_id": self.user.id})

        elif message_type == "edit":
            message_id = content.get("id")
            body = (content.get("body") or "").strip()
            if not message_id or not body:
                return
            updated = await self._edit_message(message_id, body)
            if updated:
                await self.channel_layer.group_send(self.group_name, {"type": "chat.edit", "message": updated})

        elif message_type == "delete":
            message_id = content.get("id")
            if not message_id:
                return
            deleted = await self._delete_message(message_id)
            if deleted:
                await self.channel_layer.group_send(
                    self.group_name, {"type": "chat.delete", "message_id": int(message_id)}
                )

    # --- grup olay işleyicileri ("type" ile dağıtılır, noktalar -> alt çizgi) ---

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    async def chat_edit(self, event):
        await self.send_json({"type": "edit", "message": event["message"]})

    async def chat_delete(self, event):
        await self.send_json({"type": "delete", "message_id": event["message_id"]})

    async def chat_typing(self, event):
        if event["user_id"] == self.user.id:
            return
        await self.send_json({"type": "typing", "user_id": event["user_id"], "is_typing": event["is_typing"]})

    async def chat_read(self, event):
        await self.send_json({"type": "read", "user_id": event["user_id"]})

    async def chat_presence(self, event):
        if event["user_id"] == self.user.id:
            return
        await self.send_json({"type": "presence", "user_id": event["user_id"], "status": event["status"]})

    # --- veritabanı yardımcıları ---

    @database_sync_to_async
    def _is_participant(self, user):
        return Conversation.objects.filter(pk=self.conversation_id, participants=user).exists()

    @database_sync_to_async
    def _create_message(self, body):
        message = Message.objects.create(conversation_id=self.conversation_id, sender=self.user, body=body)
        full_name = getattr(getattr(self.user, "profile", None), "full_name", "")
        return {
            "id": message.id,
            "conversation": int(self.conversation_id),
            "sender_id": self.user.id,
            "sender_email": self.user.email,
            "sender_name": full_name or self.user.email,
            "body": message.body,
            "is_read": message.is_read,
            "is_edited": False,
            "edited_at": None,
            "attachments": [],
            "created_at": message.created_at.isoformat(),
        }

    @database_sync_to_async
    def _mark_read(self):
        Message.objects.filter(conversation_id=self.conversation_id, is_read=False).exclude(sender=self.user).update(
            is_read=True
        )

    @database_sync_to_async
    def _edit_message(self, message_id, body):
        # Yalnızca kendi mesajını düzenleyebilir — bkz. views.MessageViewSet._check_is_sender
        # ile aynı kural, burada WS yolu için tekrarlanıyor.
        updated = Message.objects.filter(pk=message_id, conversation_id=self.conversation_id, sender=self.user).update(
            body=body, is_edited=True, edited_at=timezone.now()
        )
        if not updated:
            return None
        return {
            "id": int(message_id),
            "conversation": int(self.conversation_id),
            "body": body,
            "is_edited": True,
        }

    @database_sync_to_async
    def _delete_message(self, message_id):
        deleted, _ = Message.objects.filter(
            pk=message_id, conversation_id=self.conversation_id, sender=self.user
        ).delete()
        return bool(deleted)

    @database_sync_to_async
    def _notify_other_participants(self, body):
        conversation = Conversation.objects.prefetch_related("participants").get(pk=self.conversation_id)
        for participant in conversation.participants.exclude(pk=self.user.pk):
            notify_user(
                user=participant,
                title="New message",
                body=body[:200],
                notification_type=NotificationType.MESSAGE,
            )
