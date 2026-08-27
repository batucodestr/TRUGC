from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "messaging"

router = DefaultRouter()
router.register("", views.ConversationViewSet, basename="conversation")

message_list = views.MessageViewSet.as_view({"get": "list", "post": "create"})
message_detail = views.MessageViewSet.as_view({"get": "retrieve"})

urlpatterns = [
    path("admin/conversations/", views.AdminConversationListView.as_view(), name="admin-conversation-list"),
    path(
        "admin/conversations/<int:conversation_pk>/messages/",
        views.AdminConversationMessagesView.as_view(),
        name="admin-conversation-messages",
    ),
    path("admin/messages/<int:pk>/", views.AdminMessageActionView.as_view(), name="admin-message-action"),
    path("<int:conversation_pk>/messages/", message_list, name="conversation-messages"),
    path("<int:conversation_pk>/messages/<int:pk>/", message_detail, name="conversation-message-detail"),
] + router.urls
