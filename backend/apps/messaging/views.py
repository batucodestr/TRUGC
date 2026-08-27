from django.db.models import Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import log_admin_action
from apps.accounts.permissions import IsAdminRole, IsModerator
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import Conversation, Message
from .permissions import IsConversationParticipant
from .serializers import AdminConversationSerializer, ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).prefetch_related("participants", "messages")


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]
    http_method_names = ["get", "post", "head", "options"]

    def get_conversation(self):
        conversation = get_object_or_404(Conversation, pk=self.kwargs["conversation_pk"])
        self.check_object_permissions(self.request, conversation)
        return conversation

    def get_queryset(self):
        return Message.objects.filter(conversation_id=self.kwargs["conversation_pk"]).select_related("sender").prefetch_related(
            "attachments"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["conversation"] = self.get_conversation()
        return context

    def perform_create(self, serializer):
        conversation = self.get_conversation()
        message = serializer.save()
        for participant in conversation.participants.exclude(pk=self.request.user.pk):
            notify_user(
                user=participant,
                title="New message",
                body=message.body[:200],
                notification_type=NotificationType.MESSAGE,
            )


class AdminConversationListView(generics.ListAPIView):
    """/manage için platform genelinde mesaj denetimi — sadece çağıranın değil, tüm konuşmalar."""

    serializer_class = AdminConversationSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def get_queryset(self):
        return (
            Conversation.objects.prefetch_related("participants", "messages")
            .annotate(message_count=Count("messages"))
            .order_by("-updated_at")
        )


class AdminConversationMessagesView(generics.ListAPIView):
    """/manage moderasyon detay görünümü için bir konuşmadaki her mesaj."""

    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def get_queryset(self):
        return Message.objects.filter(conversation_id=self.kwargs["conversation_pk"]).select_related("sender").prefetch_related(
            "attachments"
        )


class AdminMessageActionView(APIView):
    """Tek bir mesaj üzerinde moderasyon işlemleri: spam olarak işaretle veya doğrudan sil."""

    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        message.is_flagged = True
        message.save(update_fields=["is_flagged"])
        log_admin_action(request.user, "message.flag", "message", pk, message.body[:100])
        return Response(MessageSerializer(message).data)

    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        log_admin_action(request.user, "message.delete", "message", pk, message.body[:100])
        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
