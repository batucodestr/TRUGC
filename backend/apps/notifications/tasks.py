from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from .models import Notification, NotificationType


@shared_task
def broadcast_notification(role, title, body, link=""):
    """Admin broadcast (/manage) — creates one Notification per targeted user.
    `role` is a Role value to target one role, or "all" for every active user.
    Runs immediately when queued with .delay(), or at a future time when
    queued with .apply_async(eta=...) for scheduled sends."""
    User = get_user_model()
    users = User.objects.filter(is_active=True)
    if role != "all":
        users = users.filter(role=role)
    Notification.objects.bulk_create(
        [
            Notification(user=user, title=title, body=body, notification_type=NotificationType.SYSTEM, link=link)
            for user in users
        ]
    )


@shared_task
def send_notification_email(notification_id):
    """Best-effort email delivery for a notification. Safe to call fire-and-forget."""
    try:
        notification = Notification.objects.select_related("user").get(pk=notification_id)
    except Notification.DoesNotExist:
        return
    send_mail(
        subject=notification.title,
        message=notification.body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[notification.user.email],
        fail_silently=True,
    )
