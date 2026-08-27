import csv
import datetime

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role, User, VerificationStatus
from apps.accounts.permissions import IsAdminRole, IsBrand, IsCreator, IsModerator
from apps.applications.models import Application, ApplicationStatus
from apps.campaigns.models import Campaign, CampaignStatus
from apps.creators.models import Category
from apps.payments.models import Transaction, TransactionStatus
from apps.reports.models import Report, ReportStatus
from apps.reviews.models import Review

from .models import Event, EventType
from .serializers import AdminDashboardSerializer, BrandDashboardSerializer, CreatorDashboardSerializer


class BrandDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsBrand]

    def get(self, request):
        brand = request.user.brand
        campaigns = brand.campaigns.all()
        applications = Application.objects.filter(campaign__brand=brand)
        avg_rating = Review.objects.filter(reviewee=request.user).aggregate(avg=Avg("rating"))["avg"] or 0
        total_budget = campaigns.filter(status__in=[CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS]).aggregate(
            total=Sum("budget_max")
        )["total"] or 0

        data = {
            "active_campaigns": campaigns.filter(status=CampaignStatus.PUBLISHED).count(),
            "total_campaigns": campaigns.count(),
            "total_applicants": applications.count(),
            "accepted_applicants": applications.filter(status=ApplicationStatus.ACCEPTED).count(),
            "total_budget_committed": float(total_budget),
            "average_rating": round(avg_rating, 2),
        }
        return Response(BrandDashboardSerializer(data).data)


class CreatorDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsCreator]

    def get(self, request):
        creator = request.user.creator
        applications = Application.objects.filter(creator=creator)
        avg_rating = Review.objects.filter(reviewee=request.user).aggregate(avg=Avg("rating"))["avg"] or 0
        earnings = Transaction.objects.filter(payee=request.user, status=TransactionStatus.RELEASED).aggregate(
            total=Sum("amount")
        )["total"] or 0
        profile_views = Event.objects.filter(
            event_type=EventType.PROFILE_VIEW, target_content_type="creator", target_id=creator.id
        ).count()

        data = {
            "collaborations": applications.filter(status=ApplicationStatus.ACCEPTED).count(),
            "total_applications_sent": applications.count(),
            "profile_views": profile_views,
            "earnings": float(earnings),
            "total_followers": creator.total_followers,
            "average_engagement_rate": creator.average_engagement_rate,
            "average_rating": round(avg_rating, 2),
        }
        return Response(CreatorDashboardSerializer(data).data)


def _registration_trend(days=30):
    """Son `days` gün için günlük gerçek kayıt sayıları, sıfırla doldurulmuş (sahte enterpolasyon yok)."""
    since = timezone.now() - datetime.timedelta(days=days - 1)
    rows = (
        User.objects.filter(date_joined__gte=since)
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(count=Count("id"))
    )
    counts_by_day = {row["day"]: row["count"] for row in rows}
    today = timezone.now().date()
    return [
        {"date": (today - datetime.timedelta(days=offset)).isoformat(), "count": counts_by_day.get(today - datetime.timedelta(days=offset), 0)}
        for offset in range(days - 1, -1, -1)
    ]


def _admin_dashboard_data():
    today = timezone.now().date()
    last_24h = timezone.now() - datetime.timedelta(hours=24)

    campaign_breakdown = {row["status"]: row["count"] for row in Campaign.objects.values("status").annotate(count=Count("id"))}
    application_breakdown = {
        row["status"]: row["count"] for row in Application.objects.values("status").annotate(count=Count("id"))
    }
    top_categories = list(
        Category.objects.annotate(creator_count=Count("creators")).order_by("-creator_count").values("name", "creator_count")[:8]
    )

    return {
        "total_users": User.objects.count(),
        "total_creators": User.objects.filter(role=Role.CREATOR).count(),
        "total_brands": User.objects.filter(role=Role.BRAND).count(),
        "total_campaigns": Campaign.objects.count(),
        "published_campaigns": Campaign.objects.filter(status=CampaignStatus.PUBLISHED).count(),
        "total_applications": Application.objects.count(),
        "pending_verifications": VerificationStatus.objects.filter(status=VerificationStatus.Status.PENDING).count(),
        "new_reports": Report.objects.filter(status=ReportStatus.OPEN).count(),
        "today_registrations": User.objects.filter(date_joined__date=today).count(),
        "last_24h_logins": User.objects.filter(last_login__gte=last_24h).count(),
        "registration_trend": _registration_trend(),
        "campaign_status_breakdown": campaign_breakdown,
        "application_status_breakdown": application_breakdown,
        "top_categories": [{"name": c["name"], "count": c["creator_count"]} for c in top_categories],
    }


class AdminDashboardView(APIView):
    """Adminler/moderatörler için platform genelindeki metrikler."""

    permission_classes = [IsAuthenticated, (IsAdminRole | IsModerator)]

    def get(self, request):
        return Response(AdminDashboardSerializer(_admin_dashboard_data()).data)


class AdminAnalyticsExportView(APIView):
    """/manage analitik ekranı için 30 günlük kayıt trendinin CSV dışa aktarımı."""

    permission_classes = [IsAuthenticated, (IsAdminRole | IsModerator)]

    def get(self, request):
        data = _admin_dashboard_data()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="trugc-analitik-{timezone.now().date().isoformat()}.csv"'
        writer = csv.writer(response)
        writer.writerow(["Tarih", "Yeni Kayıt"])
        for row in data["registration_trend"]:
            writer.writerow([row["date"], row["count"]])
        writer.writerow([])
        writer.writerow(["Metrik", "Değer"])
        for key in (
            "total_users",
            "total_creators",
            "total_brands",
            "total_campaigns",
            "published_campaigns",
            "total_applications",
            "pending_verifications",
            "new_reports",
        ):
            writer.writerow([key, data[key]])
        return response
