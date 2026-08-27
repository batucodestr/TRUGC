from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions

from apps.accounts.permissions import IsAdminRole, IsModerator

from .models import Brand
from .permissions import IsBrandOwner
from .serializers import BrandSerializer


class BrandListView(generics.ListAPIView):
    """Public directory of brands, filterable by industry."""

    queryset = Brand.objects.select_related("user").all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["industry", "company_size", "is_verified"]
    search_fields = ["company_name", "description"]
    ordering_fields = ["created_at", "company_name"]


class BrandDetailView(generics.RetrieveAPIView):
    """Public brand profile page."""

    queryset = Brand.objects.select_related("user").all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"


class MyBrandView(generics.RetrieveUpdateAPIView):
    """The authenticated brand user's own company profile."""

    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticated, IsBrandOwner]
    owner_field = "user"

    def get_object(self):
        obj = self.request.user.brand
        self.check_object_permissions(self.request, obj)
        return obj


class BrandAdminDetailView(generics.RetrieveUpdateAPIView):
    """Admin/moderator edit access to any brand's profile from /manage."""

    queryset = Brand.objects.select_related("user").all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]
    lookup_field = "pk"
