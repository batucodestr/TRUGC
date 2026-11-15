from rest_framework import serializers


class BrandDashboardSerializer(serializers.Serializer):
    active_campaigns = serializers.IntegerField()
    total_campaigns = serializers.IntegerField()
    total_applicants = serializers.IntegerField()
    accepted_applicants = serializers.IntegerField()
    total_budget_committed = serializers.FloatField()
    average_rating = serializers.FloatField()
    # Panel grafiği ve değişim yüzdeleri (son 30 gün / önceki 30 gün).
    estimated_reach = serializers.IntegerField()
    reach_series = serializers.ListField(child=serializers.DictField())
    applicants_trend_pct = serializers.IntegerField(allow_null=True)
    accepted_trend_pct = serializers.IntegerField(allow_null=True)
    active_campaigns_delta = serializers.IntegerField()


class CreatorDashboardSerializer(serializers.Serializer):
    collaborations = serializers.IntegerField()
    total_applications_sent = serializers.IntegerField()
    profile_views = serializers.IntegerField()
    earnings = serializers.FloatField()
    total_followers = serializers.IntegerField()
    average_engagement_rate = serializers.FloatField()
    average_rating = serializers.FloatField()
    active_collaborations = serializers.IntegerField()
    total_reach = serializers.IntegerField()
    earnings_this_month = serializers.FloatField()
    earnings_trend_pct = serializers.IntegerField(allow_null=True)
    monthly_earnings = serializers.ListField(child=serializers.DictField())
    applications_trend_pct = serializers.IntegerField(allow_null=True)
    profile_completion = serializers.DictField()


class AdminDashboardSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_creators = serializers.IntegerField()
    total_brands = serializers.IntegerField()
    total_campaigns = serializers.IntegerField()
    published_campaigns = serializers.IntegerField()
    total_applications = serializers.IntegerField()
    pending_verifications = serializers.IntegerField()
    new_reports = serializers.IntegerField()
    today_registrations = serializers.IntegerField()
    last_24h_logins = serializers.IntegerField()
    registration_trend = serializers.ListField(child=serializers.DictField())
    campaign_status_breakdown = serializers.DictField()
    application_status_breakdown = serializers.DictField()
    top_categories = serializers.ListField(child=serializers.DictField())
