from rest_framework import serializers

from apps.applications.models import Application, ApplicationStatus

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    application_id = serializers.PrimaryKeyRelatedField(
        source="application", queryset=Application.objects.filter(status=ApplicationStatus.ACCEPTED)
    )
    payee_email = serializers.EmailField(source="payee.email", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "application_id",
            "payee_email",
            "amount",
            "currency",
            "status",
            "provider",
            "provider_reference",
            "created_at",
            "updated_at",
            "released_at",
        ]
        read_only_fields = ["id", "status", "provider", "provider_reference", "created_at", "updated_at", "released_at"]

    def validate_application_id(self, application):
        request = self.context["request"]
        if application.campaign.brand.user_id != request.user.id:
            raise serializers.ValidationError("You may only pay for your own campaign's applications.")
        return application

    def create(self, validated_data):
        application = validated_data["application"]
        validated_data["payer"] = self.context["request"].user
        validated_data["payee"] = application.creator.user
        return super().create(validated_data)
