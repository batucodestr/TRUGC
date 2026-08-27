from rest_framework import serializers

from .models import Brand


class BrandSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Brand
        fields = [
            "id",
            "user_id",
            "email",
            "company_name",
            "logo",
            "cover",
            "website",
            "industry",
            "company_size",
            "description",
            "headquarters",
            "founded_year",
            "is_verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at", "updated_at"]
