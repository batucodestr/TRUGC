from django.utils import timezone
from rest_framework import serializers

from apps.campaigns.models import Campaign, CampaignStatus

from .models import Application, ApplicationStatus


class ApplicationSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source="creator.display_name", read_only=True)
    campaign_title = serializers.CharField(source="campaign.title", read_only=True)
    brand_id = serializers.IntegerField(source="campaign.brand_id", read_only=True)
    campaign_id = serializers.PrimaryKeyRelatedField(
        source="campaign", queryset=Campaign.objects.filter(status=CampaignStatus.PUBLISHED), write_only=True
    )

    class Meta:
        model = Application
        fields = [
            "id",
            "creator_name",
            "campaign_id",
            "campaign_title",
            "brand_id",
            "message",
            "proposed_rate",
            "status",
            "created_at",
            "updated_at",
            "reviewed_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at", "reviewed_at"]

    def validate_campaign_id(self, campaign):
        if not campaign.is_open:
            raise serializers.ValidationError("This campaign is not accepting applications.")
        return campaign

    def create(self, validated_data):
        validated_data["creator"] = self.context["request"].user.creator
        return super().create(validated_data)


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """Used by the owning brand to accept/reject an application."""

    class Meta:
        model = Application
        fields = ["status"]

    def validate_status(self, value):
        if value not in (ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED):
            raise serializers.ValidationError("Brands may only set status to accepted or rejected.")
        return value

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.reviewed_at = timezone.now()
        instance.save(update_fields=["status", "reviewed_at"])
        return instance
