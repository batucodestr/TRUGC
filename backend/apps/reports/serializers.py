from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.EmailField(source="reporter.email", read_only=True)
    resolved_by_email = serializers.EmailField(source="resolved_by.email", read_only=True, default=None)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter_email",
            "target_type",
            "target_id",
            "reason",
            "status",
            "created_at",
            "resolved_at",
            "resolved_by_email",
            "resolution_notes",
        ]
        read_only_fields = ["id", "status", "created_at", "resolved_at", "resolution_notes"]

    def create(self, validated_data):
        validated_data["reporter"] = self.context["request"].user
        return super().create(validated_data)


class ReportResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["resolved", "dismissed"])
    notes = serializers.CharField(required=False, allow_blank=True)
