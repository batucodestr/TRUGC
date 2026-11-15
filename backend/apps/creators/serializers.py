from decimal import Decimal

from django.utils import timezone

from rest_framework import serializers

from apps.common import pricing
from apps.common.serializers import FreePeriodPricingMixin

from .models import Category, Creator, CreatorPackage, PortfolioItem, SocialAccount


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class SocialAccountSerializer(serializers.ModelSerializer):
    """Sosyal hesap.

    OAuth ile bağlanmış hesapların (``oauth_verified``) takipçi/etkileşim
    değerleri **yalnızca resmî API'den** gelir; creator bunları elle
    değiştiremez. Elle eklenen hesaplar doğrulanmamış sayılır.
    """

    oauth_verified = serializers.SerializerMethodField()

    class Meta:
        model = SocialAccount
        fields = [
            "id",
            "platform",
            "handle",
            "profile_url",
            "followers_count",
            "engagement_rate",
            "reach_count",
            "is_verified",
            "oauth_verified",
            "last_synced_at",
        ]
        read_only_fields = ["id", "is_verified", "reach_count", "last_synced_at"]

    def get_oauth_verified(self, obj):
        return bool(obj.provider_user_id)

    def validate(self, attrs):
        if self.instance is not None and self.instance.provider_user_id:
            for locked in ("followers_count", "engagement_rate", "handle", "platform"):
                attrs.pop(locked, None)
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_staff = bool(user and user.is_authenticated and (user.is_staff or getattr(user, "role", "") in ("admin", "moderator")))
        if is_staff:
            data["is_suspicious"] = instance.is_suspicious
            data["flag_reason"] = instance.flag_reason
        return data


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = ["id", "kind", "title", "description", "media", "external_url", "platform", "created_at"]
        read_only_fields = ["id", "created_at"]


class CreatorPackageSerializer(FreePeriodPricingMixin, serializers.ModelSerializer):
    """Creator'ın yayınladığı hizmet paketi.

    Ücretsiz dönemde paket fiyatı yanıtta gizlenir ve yeni paket fiyat
    zorunluluğu olmadan (0 ile) oluşturulabilir — hafta sonu kullanıcıya
    hiçbir fiyat gösterilmez.
    """

    price_fields = ("price",)

    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = CreatorPackage
        fields = ["id", "title", "description", "price", "deliverables", "turnaround_days", "is_popular", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if pricing.is_free_period():
            attrs["price"] = Decimal("0")
        elif attrs.get("price") is None and getattr(self.instance, "price", None) is None:
            raise serializers.ValidationError({"price": "Bu alan zorunludur."})
        elif attrs.get("price") is None:
            attrs.pop("price", None)
        return attrs


class CreatorSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    avatar = serializers.ImageField(source="user.profile.avatar", read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        source="categories", queryset=Category.objects.all(), many=True, write_only=True, required=False
    )
    social_accounts = SocialAccountSerializer(many=True, read_only=True)
    portfolio_items = PortfolioItemSerializer(many=True, read_only=True)
    packages = CreatorPackageSerializer(many=True, read_only=True)
    total_followers = serializers.IntegerField(read_only=True)
    average_engagement_rate = serializers.FloatField(read_only=True)
    # Güven göstergeleri: tamamlanan iş, zamanında teslim oranı, marka puanı.
    completed_jobs = serializers.SerializerMethodField()
    on_time_rate = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()

    def _stats(self, obj):
        cache = self.context.setdefault("_creator_stats", {})
        if obj.pk not in cache:
            from django.db.models import Avg

            from apps.collaborations.services import creator_stats
            from apps.reviews.models import Review

            stats = creator_stats(obj)
            agg = Review.objects.filter(reviewee_id=obj.user_id).aggregate(avg=Avg("rating"))
            stats["average_rating"] = round(agg["avg"], 2) if agg["avg"] else None
            stats["review_count"] = Review.objects.filter(reviewee_id=obj.user_id).count()
            cache[obj.pk] = stats
        return cache[obj.pk]

    def get_completed_jobs(self, obj):
        return self._stats(obj)["completed_jobs"]

    def get_on_time_rate(self, obj):
        return self._stats(obj)["on_time_rate"]

    def get_average_rating(self, obj):
        return self._stats(obj)["average_rating"]

    def get_review_count(self, obj):
        return self._stats(obj)["review_count"]

    def get_is_premium(self, obj):
        from apps.payments.membership import PREMIUM_CREATOR_CODE
        from apps.payments.models import Membership

        return Membership.objects.filter(user_id=obj.user_id, package_code=PREMIUM_CREATOR_CODE).exclude(
            expires_at__isnull=True
        ).filter(expires_at__gt=timezone.now()).exists()

    class Meta:
        model = Creator
        fields = [
            "id",
            "user_id",
            "email",
            "avatar",
            "display_name",
            "bio",
            "cover",
            "categories",
            "category_ids",
            "is_verified",
            "is_available",
            "social_accounts",
            "portfolio_items",
            "packages",
            "total_followers",
            "average_engagement_rate",
            "completed_jobs",
            "on_time_rate",
            "average_rating",
            "review_count",
            "is_premium",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at", "updated_at"]
