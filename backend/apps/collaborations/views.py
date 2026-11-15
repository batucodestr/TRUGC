from django.db.models import Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.exceptions import error_response
from apps.accounts.permissions import IsOnboarded

from . import services
from .models import Collaboration, StatusLog
from .serializers import CollaborationSerializer, StatusLogSerializer


def _is_staff(user) -> bool:
    return user.is_staff or getattr(user, "role", "") in ("admin", "moderator")


class CollaborationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Taraflar (marka/creator) yalnızca kendi iş birliklerini görür; staff hepsini."""

    serializer_class = CollaborationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "campaign"]

    def get_queryset(self):
        qs = Collaboration.objects.select_related("campaign", "brand", "creator", "creator__user").prefetch_related(
            "submissions"
        )
        user = self.request.user
        if _is_staff(user):
            return qs
        return qs.filter(Q(creator__user=user) | Q(brand__user=user))

    def _run(self, fn, *args, **kwargs):
        try:
            result = fn(*args, **kwargs)
        except services.CollaborationError as exc:
            return error_response("COLLABORATION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response(CollaborationSerializer(result if isinstance(result, Collaboration) else self.get_object()).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsOnboarded])
    def submit(self, request, pk=None):
        """Creator: içerik teslimi (dosya veya bağlantı)."""
        collab = self.get_object()
        return self._run(
            services.submit_content, collab, request.user,
            file=request.FILES.get("file"), url=request.data.get("url", ""), note=request.data.get("note", ""),
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._run(services.approve, self.get_object(), request.user)

    @action(detail=True, methods=["post"])
    def revision(self, request, pk=None):
        return self._run(services.request_revision, self.get_object(), request.user, feedback=request.data.get("feedback", ""))

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        collab = self.get_object()
        logs = StatusLog.objects.filter(entity_type=StatusLog.ENTITY_COLLABORATION, entity_id=collab.pk)
        return Response(StatusLogSerializer(logs, many=True).data)


class StatusLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Admin: tüm durum değişikliği denetim kaydı."""

    serializer_class = StatusLogSerializer
    filterset_fields = ["entity_type", "entity_id"]

    def get_permissions(self):
        from apps.accounts.permissions import IsAdminRole, IsModerator

        return [permissions.IsAuthenticated(), (IsAdminRole | IsModerator)()]

    def get_queryset(self):
        return StatusLog.objects.select_related("actor")
