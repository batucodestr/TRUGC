from rest_framework import serializers

from .models import Category, Creator, CreatorPackage, PortfolioItem, SocialAccount


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class SocialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = [
            "id",
            "platform",
            "handle",
            "profile_url",
            "followers_count",
            "engagement_rate",
            "is_verified",
        ]
        read_only_fields = ["id", "is_verified"]


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = ["id", "kind", "title", "description", "media", "external_url", "platform", "created_at"]
        read_only_fields = ["id", "created_at"]


class CreatorPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorPackage
        fields = ["id", "title", "description", "price", "deliverables", "turnaround_days", "is_popular", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at", "updated_at"]
