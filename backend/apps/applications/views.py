from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import IsBrand, IsCreator
from apps.notifications.services import notify_user

from .models import Application, ApplicationStatus
from .permissions import IsApplicationParty
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    Creator'lar kendi başvurularını oluşturur/listeler/geri çeker.
    Markalar kendi kampanyalarına gelen başvuruları listeler ve kabul/red eder.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsApplicationParty]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "campaign"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.select_related("creator", "creator__user", "campaign", "campaign__brand")
        if user.is_staff or user.role in ("admin", "moderator"):
            return queryset
        return queryset.filter(Q(creator__user=user) | Q(campaign__brand__user=user))

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsCreator()]
        if self.action in ("accept", "reject", "hold"):
            return [permissions.IsAuthenticated(), IsApplicationParty()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsCreator(), IsApplicationParty()]
        return super().get_permissions()

    def _is_staff_reviewer(self, request):
        return request.user.is_staff or request.user.role in ("admin", "moderator")

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "creator"):
            raise PermissionDenied("Only creators with a profile can apply to campaigns.")
        application = serializer.save()
        notify_user(
            user=application.campaign.brand.user,
            title="New application received",
            body=f"{application.creator.display_name or application.creator.user.email} applied to '{application.campaign.title}'.",
        )

    def perform_destroy(self, instance):
        if instance.creator.user_id != self.request.user.id:
            raise PermissionDenied("You can only withdraw your own application.")
        instance.status = ApplicationStatus.WITHDRAWN
        instance.save(update_fields=["status"])

    def _set_status(self, request, pk, new_status):
        application = self.get_object()
        if application.campaign.brand.user_id != request.user.id and not self._is_staff_reviewer(request):
            raise PermissionDenied("You do not own this campaign.")
        serializer = ApplicationStatusUpdateSerializer(application, data={"status": new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        notify_user(
            user=application.creator.user,
            title=f"Application {new_status}",
            body=f"Your application to '{application.campaign.title}' was {new_status}.",
        )
        return Response(ApplicationSerializer(application).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return self._set_status(request, pk, ApplicationStatus.ACCEPTED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._set_status(request, pk, ApplicationStatus.REJECTED)

    @action(detail=True, methods=["post"])
    def hold(self, request, pk=None):
        """Yalnızca admin: bir kararı yeniden inceleme için beklemede durumuna geri alır."""
        application = self.get_object()
        if not self._is_staff_reviewer(request):
            raise PermissionDenied("Only staff can put an application on hold.")
        application.status = ApplicationStatus.PENDING
        application.reviewed_at = None
        application.save(update_fields=["status", "reviewed_at"])
        return Response(ApplicationSerializer(application).data)
