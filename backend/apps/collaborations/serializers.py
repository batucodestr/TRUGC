from rest_framework import serializers

from .models import Collaboration, ContentSubmission, StatusLog


class ContentSubmissionSerializer(serializers.ModelSerializer):
    # Teslim dosyası herkese açık değildir: isteyene özel, süreli imzalı adres.
    file = serializers.SerializerMethodField()

    def get_file(self, obj):
        from apps.common import signed_files

        if not obj.file:
            return None
        request = self.context.get("request")
        return signed_files.url_for(signed_files.KIND_SUBMISSION, obj.pk, getattr(request, "user", None))

    class Meta:
        model = ContentSubmission
        fields = ["id", "revision_number", "file", "url", "note", "status", "feedback", "created_at", "reviewed_at"]
        read_only_fields = fields


class StatusLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = StatusLog
        fields = ["id", "entity_type", "entity_id", "from_status", "to_status", "actor_email", "note", "created_at"]


class CollaborationSerializer(serializers.ModelSerializer):
    campaign_title = serializers.CharField(source="campaign.title", read_only=True)
    brand_name = serializers.CharField(source="brand.company_name", read_only=True)
    brand_user_id = serializers.IntegerField(source="brand.user_id", read_only=True)
    creator_name = serializers.SerializerMethodField()
    creator_user_id = serializers.IntegerField(source="creator.user_id", read_only=True)
    submissions = ContentSubmissionSerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    charge = serializers.SerializerMethodField()

    class Meta:
        model = Collaboration
        fields = [
            "id", "application", "campaign", "campaign_title", "brand", "brand_name", "brand_user_id",
            "creator", "creator_name", "creator_user_id", "status", "status_display", "agreed_amount", "due_at",
            "first_delivered_at", "approved_at", "paid_at", "delivered_on_time", "payment_status", "charge",
            "submissions", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_creator_name(self, obj):
        return obj.creator.display_name or obj.creator.user.email

    def get_payment_status(self, obj):
        payment = obj.brand_payments.order_by("-created_at").first()
        return payment.status if payment else None

    def get_charge(self, obj):
        """Markaya gösterilen sunucu hesaplı tutar dökümü (bütçe + %10 komisyon)."""
        from apps.payments.ledger import charge_breakdown

        b = charge_breakdown(obj.agreed_amount)
        return {k: str(v) for k, v in b.items()}
