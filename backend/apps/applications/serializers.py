from django.utils import timezone
from rest_framework import serializers

from apps.campaigns.models import Campaign, CampaignStatus
from apps.common import pricing
from apps.common.serializers import FreePeriodPricingMixin

from .models import Application, ApplicationStatus


class ApplicationSerializer(FreePeriodPricingMixin, serializers.ModelSerializer):
    """Başvuru (iş alma) serializer'ı.

    Ücretsiz dönemde teklif edilen ücret alanı devre dışıdır: creator işi
    ücretsiz alır, istemciden gelen ``proposed_rate`` yok sayılır ve yanıtta
    ücret bilgisi dönmez.
    """

    price_fields = ("proposed_rate",)

    creator_name = serializers.SerializerMethodField()
    campaign_title = serializers.CharField(source="campaign.title", read_only=True)
    brand_id = serializers.IntegerField(source="campaign.brand_id", read_only=True)
    brand_name = serializers.CharField(source="campaign.brand.company_name", read_only=True)
    campaign_id = serializers.PrimaryKeyRelatedField(
        source="campaign", queryset=Campaign.objects.filter(status=CampaignStatus.PUBLISHED), write_only=True
    )
    # Okumada kampanyanın kimliği. ``campaign_id`` yazma amaçlı olduğu için
    # ayrı bir alan gerekir: bu olmadan ne marka ne creator başvurudan
    # kampanyaya gidebiliyordu.
    campaign = serializers.PrimaryKeyRelatedField(read_only=True)

    # Konuşma açmak için **kullanıcı** kimlikleri şarttır (POST /messaging/
    # participant_ids kullanıcı id'si bekler). Bunlar dönmediği sürece marka
    # başvuran creator'a, creator da markaya mesaj atamıyordu: başvurular
    # listesindeki mesaj düğmesi boş bir sohbet sayfasına gidiyordu.
    creator_id = serializers.IntegerField(source="creator.id", read_only=True)
    creator_user_id = serializers.IntegerField(source="creator.user_id", read_only=True)
    creator_avatar = serializers.ImageField(source="creator.user.profile.avatar", read_only=True)
    brand_user_id = serializers.IntegerField(source="campaign.brand.user_id", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "creator_id",
            "creator_user_id",
            "creator_name",
            "creator_avatar",
            "campaign",
            "campaign_id",
            "campaign_title",
            "brand_id",
            "brand_name",
            "brand_user_id",
            "message",
            "proposed_rate",
            "status",
            "awaiting_payment",
            "created_at",
            "updated_at",
            "reviewed_at",
        ]
        read_only_fields = ["id", "status", "awaiting_payment", "created_at", "updated_at", "reviewed_at"]

    def get_creator_name(self, obj):
        """Görünen ad; boşsa profil adına, o da boşsa e-postaya düşer.

        Önceden doğrudan ``creator.display_name`` dönüyordu: adını henüz
        girmemiş creator'lar markanın başvuru listesinde boş satır olarak
        görünüyordu.
        """
        creator = obj.creator
        profile = getattr(creator.user, "profile", None)
        return creator.display_name or getattr(profile, "full_name", "") or creator.user.email

    def validate_campaign_id(self, campaign):
        if not campaign.is_open:
            raise serializers.ValidationError("This campaign is not accepting applications.")
        # (creator, campaign) model düzeyinde benzersizdir, ancak `creator`
        # istemciden gelmediği için DRF bunun için otomatik bir doğrulayıcı
        # üretemez: kontrol olmadan ikinci başvuru veritabanı hatasına düşer
        # ve kullanıcı "aynı kampanyaya zaten başvurdunuz" yerine 500 görürdü
        # (ör. "Başvur" düğmesine iki kez basmak).
        if self.instance is None:
            creator = getattr(self.context["request"].user, "creator", None)
            if creator and Application.objects.filter(creator=creator, campaign=campaign).exists():
                raise serializers.ValidationError("Bu kampanyaya zaten başvurdunuz.")
        return campaign

    def validate(self, attrs):
        if pricing.is_free_period():
            if self.instance is None:
                # Hafta sonu YAPILAN başvuru ücretsizdir — teklif edilen ücret
                # kaydedilmez.
                attrs["proposed_rate"] = None
            else:
                # Mevcut bir başvuru hafta sonu güncellenirken ücret alanına
                # dokunulmaz: ne yeni değer yazılır ne de hafta içi girilmiş
                # değer silinir.
                attrs.pop("proposed_rate", None)
        return attrs

    def create(self, validated_data):
        validated_data["creator"] = self.context["request"].user.creator
        return super().create(validated_data)


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """Sahibi olan markanın bir başvuruyu kabul/red etmesi için kullanılır."""

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
