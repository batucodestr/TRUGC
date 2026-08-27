from rest_framework.permissions import BasePermission


class IsConversationParticipant(BasePermission):
    message = "You are not a participant in this conversation."

    def has_object_permission(self, request, view, obj):
        conversation = obj if hasattr(obj, "participants") else obj.conversation
        return conversation.participants.filter(pk=request.user.pk).exists()
