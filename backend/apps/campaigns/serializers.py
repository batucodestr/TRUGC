from rest_framework import serializers

from apps.creators.models import Category
from apps.creators.serializers import CategorySerializer

from .models import Campaign, CampaignMedia, CampaignRequirement


class CampaignMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignMedia
        fields = ["id", "file", "caption", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class CampaignRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRequirement
        fields = ["id", "description", "platform", "quantity", "order"]
        read_only_fields = ["id"]


class CampaignSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.company_name", read_only=True)
    brand_id = serializers.IntegerField(source="brand.id", read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        source="categories", queryset=Category.objects.all(), many=True, write_only=True, required=False
    )
    media_files = CampaignMediaSerializer(many=True, read_only=True)
    deliverables = CampaignRequirementSerializer(many=True, read_only=True)
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "brand_id",
            "brand_name",
            "title",
            "description",
            "categories",
            "category_ids",
            "platform",
            "budget_min",
            "budget_max",
            "requirements",
            "deliverables",
            "start_date",
            "deadline",
            "status",
            "is_open",
            "media_files",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        budget_min = attrs.get("budget_min", getattr(self.instance, "budget_min", None))
        budget_max = attrs.get("budget_max", getattr(self.instance, "budget_max", None))
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise serializers.ValidationError({"budget_max": "Must be greater than or equal to budget_min."})

        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        if start_date is not None and deadline is not None and start_date > deadline:
            raise serializers.ValidationError({"deadline": "Must be on or after the start_date."})

        return attrs

    def create(self, validated_data):
        validated_data["brand"] = self.context["request"].user.brand
        return super().create(validated_data)
