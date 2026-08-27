from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from .models import Notification, NotificationType


@shared_task
def broadcast_notification(role, title, body, link=""):
    """Admin yayını (/manage) — hedeflenen her kullanıcı için bir Notification oluşturur.
    `role`, tek bir rolü hedeflemek için bir Role değeridir, ya da tüm aktif
    kullanıcılar için "all". .delay() ile kuyruğa alındığında hemen çalışır,
    planlı gönderimler için .apply_async(eta=...) ile kuyruğa alındığında ise
    ileride belirtilen zamanda çalışır."""
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
    """Bir bildirim için en iyi çaba (best-effort) e-posta gönderimi. Fire-and-forget olarak çağrılması güvenlidir."""
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
