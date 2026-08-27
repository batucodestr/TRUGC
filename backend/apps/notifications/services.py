"""Diğer uygulamaların views/serializers import etmeden bildirim oluşturabilmesi için ince bir servis katmanı."""
from .models import Notification, NotificationType


def notify_user(*, user, title, body="", notification_type=NotificationType.SYSTEM, link=""):
    return Notification.objects.create(
        user=user, title=title, body=body, notification_type=notification_type, link=link
    )
