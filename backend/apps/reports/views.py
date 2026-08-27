from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import log_admin_action
from apps.accounts.permissions import IsModerator

from .models import Report, ReportStatus
from .serializers import ReportResolveSerializer, ReportSerializer


class ReportViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Any authenticated user can file a report (create). Only moderators/admins
    can see the queue (list/retrieve) or resolve one — a reporter can't see
    other people's reports or the outcome of their own beyond having filed it.
    """

    serializer_class = ReportSerializer
    filterset_fields = ["status", "target_type"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsModerator()]

    def get_queryset(self):
        return Report.objects.select_related("reporter", "resolved_by").all()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsModerator])
    def resolve(self, request, pk=None):
        report = self.get_object()
        serializer = ReportResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report.status = ReportStatus.RESOLVED if serializer.validated_data["status"] == "resolved" else ReportStatus.DISMISSED
        report.resolution_notes = serializer.validated_data.get("notes", "")
        report.resolved_at = timezone.now()
        report.resolved_by = request.user
        report.save(update_fields=["status", "resolution_notes", "resolved_at", "resolved_by"])
        log_admin_action(request.user, f"report.{report.status}", "report", report.id, report.resolution_notes)

        return Response(ReportSerializer(report).data, status=status.HTTP_200_OK)
