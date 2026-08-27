from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role, log_admin_action
from apps.accounts.permissions import IsAdminRole, IsModerator

from .models import Notification
from .serializers import NotificationSerializer
from .tasks import broadcast_notification


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Giriş yapmış kullanıcının kendi bildirimlerine salt okunur erişim."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({"detail": "Tüm bildirimler okundu olarak işaretlendi."})


VALID_BROADCAST_TARGETS = {"all", Role.CREATOR, Role.BRAND, Role.MODERATOR, Role.ADMIN}


class AdminBroadcastView(APIView):
    """/manage bildirim yönetimi: sistem bildirimi oluştur ve bir role veya
    herkese gönder. `scheduled_at` verilirse (gelecekteki bir ISO datetime),
    Celery ile o zamanda gönderilir; verilmezse hemen kuyruğa alınır."""

    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]

    def post(self, request):
        title = request.data.get("title", "").strip()
        body = request.data.get("body", "").strip()
        target = request.data.get("target", "all")
        link = request.data.get("link", "")
        scheduled_at_raw = request.data.get("scheduled_at")

        if not title or target not in VALID_BROADCAST_TARGETS:
            return Response({"error": True, "code": "VALIDATION_ERROR", "message": "Başlık ve geçerli bir hedef gereklidir."}, status=400)

        eta = None
        if scheduled_at_raw:
            eta = parse_datetime(scheduled_at_raw)
            if eta is None or eta <= timezone.now():
                return Response({"error": True, "code": "VALIDATION_ERROR", "message": "Planlanan zaman gelecekte olmalıdır."}, status=400)

        if eta:
            broadcast_notification.apply_async(args=[target, title, body, link], eta=eta)
        else:
            broadcast_notification.delay(target, title, body, link)

        log_admin_action(
            request.user,
            "notification.broadcast",
            "role" if target != "all" else "all",
            target,
            f"{title} (scheduled_at={scheduled_at_raw or 'now'})",
        )
        return Response({"queued": True, "target": target, "scheduled_at": scheduled_at_raw})
