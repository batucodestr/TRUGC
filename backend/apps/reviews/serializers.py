from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign

from .models import Review

User = get_user_model()


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_email = serializers.EmailField(source="reviewer.email", read_only=True)
    campaign_id = serializers.PrimaryKeyRelatedField(source="campaign", queryset=Campaign.objects.all())
    reviewee_id = serializers.PrimaryKeyRelatedField(source="reviewee", queryset=User.objects.all())

    class Meta:
        model = Review
        fields = [
            "id",
            "campaign_id",
            "reviewer_email",
            "reviewee_id",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reviewer_email", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        campaign = attrs["campaign"]
        reviewee = attrs["reviewee"]
        reviewer = request.user

        if reviewee == reviewer:
            raise serializers.ValidationError("You cannot review yourself.")

        is_brand_owner = campaign.brand.user_id == reviewer.id
        has_accepted_application = Application.objects.filter(
            campaign=campaign, status=ApplicationStatus.ACCEPTED
        )
        if is_brand_owner:
            if not has_accepted_application.filter(creator__user=reviewee).exists():
                raise serializers.ValidationError("You may only review creators accepted into this campaign.")
        else:
            if not has_accepted_application.filter(creator__user=reviewer).exists():
                raise serializers.ValidationError("You were not an accepted creator on this campaign.")
            if campaign.brand.user_id != reviewee.id:
                raise serializers.ValidationError("You may only review the brand that ran this campaign.")

        return attrs

    def create(self, validated_data):
        validated_data["reviewer"] = self.context["request"].user
        return super().create(validated_data)
