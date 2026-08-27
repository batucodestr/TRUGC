from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, viewsets

from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import Review
from .serializers import ReviewSerializer


class ReviewViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Reviews are publicly readable (they build reputation) but only creatable by
    a verified party of the underlying campaign, enforced in the serializer.
    """

    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["campaign", "reviewee", "reviewer"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return Review.objects.select_related("reviewer", "reviewee", "campaign")

    def perform_create(self, serializer):
        review = serializer.save()
        notify_user(
            user=review.reviewee,
            title="You received a new review",
            body=f"{review.rating}/5: {review.comment[:150]}",
            notification_type=NotificationType.REVIEW,
        )
