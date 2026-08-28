from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, viewsets
from rest_framework.response import Response

from apps.analytics.models import Event, EventType

from apps.accounts.models import Role
from apps.accounts.permissions import IsAdminRole, IsModerator

from .models import Category, Creator, CreatorPackage, PortfolioItem, SocialAccount
from .permissions import CanViewCreatorDirectory, IsCreatorOwner, IsCreatorOwnerViaCreator
from .serializers import (
    CategorySerializer,
    CreatorPackageSerializer,
    CreatorSerializer,
    PortfolioItemSerializer,
    SocialAccountSerializer,
)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CreatorListView(generics.ListAPIView):
    """Kategori/platform/uygunluğa göre filtrelenebilen genel creator dizini."""

    queryset = Creator.objects.select_related("user", "user__profile").prefetch_related("categories", "social_accounts").all()
    serializer_class = CreatorSerializer
    permission_classes = [CanViewCreatorDirectory]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_verified", "is_available", "categories", "social_accounts__platform"]
    search_fields = ["display_name", "bio"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Bir creator (frontend zaten bu listeye erişemez, ama API'yi doğrudan
        # çağırsa bile) kendi kartını bu dizinde asla görmemeli.
        user = self.request.user
        if user.is_authenticated and user.role == Role.CREATOR:
            qs = qs.exclude(user_id=user.id)
        return qs


class CreatorDetailView(generics.RetrieveAPIView):
    queryset = Creator.objects.select_related("user", "user__profile").prefetch_related("categories", "social_accounts", "portfolio_items")
    serializer_class = CreatorSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not request.user.is_authenticated or request.user.id != instance.user_id:
            Event.objects.create(
                event_type=EventType.PROFILE_VIEW,
                actor=request.user if request.user.is_authenticated else None,
                target_content_type="creator",
                target_id=instance.pk,
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyCreatorView(generics.RetrieveUpdateAPIView):
    serializer_class = CreatorSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOwner]
    owner_field = "user"

    def get_object(self):
        obj = self.request.user.creator
        self.check_object_permissions(self.request, obj)
        return obj


class CreatorAdminDetailView(generics.RetrieveUpdateAPIView):
    """/manage üzerinden herhangi bir creator profiline admin/moderatör düzenleme erişimi."""

    queryset = Creator.objects.select_related("user", "user__profile").prefetch_related(
        "categories", "social_accounts", "portfolio_items", "packages"
    )
    serializer_class = CreatorSerializer
    permission_classes = [permissions.IsAuthenticated, (IsAdminRole | IsModerator)]
    lookup_field = "pk"


class SocialAccountViewSet(viewsets.ModelViewSet):
    """Giriş yapmış creator'ın bağlı sosyal medya hesaplarını yönetir."""

    serializer_class = SocialAccountSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOwnerViaCreator]

    def get_queryset(self):
        return SocialAccount.objects.filter(creator__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user.creator)


class PortfolioItemViewSet(viewsets.ModelViewSet):
    """Giriş yapmış creator'ın portföy öğelerini yönetir."""

    serializer_class = PortfolioItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOwnerViaCreator]

    def get_queryset(self):
        return PortfolioItem.objects.filter(creator__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user.creator)


class CreatorPackageViewSet(viewsets.ModelViewSet):
    """Giriş yapmış creator'ın fiyatlandırma paketlerini yönetir."""

    serializer_class = CreatorPackageSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOwnerViaCreator]

    def get_queryset(self):
        return CreatorPackage.objects.filter(creator__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user.creator)
