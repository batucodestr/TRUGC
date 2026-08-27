from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.exceptions import error_response
from apps.accounts.permissions import IsBrand
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import Transaction, TransactionStatus
from .serializers import TransactionSerializer


class TransactionViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Brands initiate escrow transactions for accepted applications on their campaigns.
    Both parties (payer/payee) and staff can view. Release/refund are moderated actions.
    """

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.select_related("application", "payer", "payee")
        if user.is_staff or user.role in ("admin", "moderator"):
            return queryset
        return queryset.filter(Q(payer=user) | Q(payee=user))

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBrand()]
        return super().get_permissions()

    def perform_create(self, serializer):
        transaction = serializer.save(status=TransactionStatus.HELD_IN_ESCROW)
        notify_user(
            user=transaction.payee,
            title="Payment held in escrow",
            body=f"{transaction.amount} {transaction.currency} has been placed in escrow for your work.",
            notification_type=NotificationType.PAYMENT,
        )

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        transaction = self.get_object()
        if transaction.payer_id != request.user.id and not (request.user.is_staff or request.user.role in ("admin", "moderator")):
            raise PermissionDenied("Only the payer or a moderator can release funds.")
        if transaction.status != TransactionStatus.HELD_IN_ESCROW:
            return error_response("VALIDATION_ERROR", "Yalnızca emanetteki işlemler serbest bırakılabilir.", 400)
        transaction.status = TransactionStatus.RELEASED
        transaction.released_at = timezone.now()
        transaction.save(update_fields=["status", "released_at"])
        notify_user(
            user=transaction.payee,
            title="Payment released",
            body=f"{transaction.amount} {transaction.currency} has been released to you.",
            notification_type=NotificationType.PAYMENT,
        )
        return Response(TransactionSerializer(transaction).data)
