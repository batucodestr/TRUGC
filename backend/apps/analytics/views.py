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


def _trend_pct(current: int, previous: int):
    """Önceki döneme göre yüzde değişim; önceki dönem 0 ise anlamlı bir yüzde yoktur (None)."""
    if previous <= 0:
        return None
    return round((current - previous) * 100 / previous)


def _brand_reach(brand, since=None, until=None) -> int:
    """Kabul edilen creator'ların toplam takipçisi (tahmini erişim)."""
    qs = Application.objects.filter(campaign__brand=brand, status=ApplicationStatus.ACCEPTED, awaiting_payment=False)
    if since is not None:
        qs = qs.filter(reviewed_at__gte=since)
    if until is not None:
        qs = qs.filter(reviewed_at__lt=until)
    total = 0
    for app in qs.select_related("creator").prefetch_related("creator__social_accounts"):
        total += app.creator.total_followers
    return total


class BrandDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsBrand]

    def get(self, request):
        brand = request.user.brand
        campaigns = brand.campaigns.all()
        applications = Application.objects.filter(campaign__brand=brand, awaiting_payment=False)
        avg_rating = Review.objects.filter(reviewee=request.user).aggregate(avg=Avg("rating"))["avg"] or 0
        total_budget = campaigns.filter(status__in=[CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS]).aggregate(
            total=Sum("budget_max")
        )["total"] or 0

        now = timezone.now()
        d30, d60 = now - datetime.timedelta(days=30), now - datetime.timedelta(days=60)
        recent_apps = applications.filter(created_at__gte=d30).count()
        prev_apps = applications.filter(created_at__gte=d60, created_at__lt=d30).count()
        recent_acc = applications.filter(status=ApplicationStatus.ACCEPTED, reviewed_at__gte=d30).count()
        prev_acc = applications.filter(status=ApplicationStatus.ACCEPTED, reviewed_at__gte=d60, reviewed_at__lt=d30).count()
        # Günlük birikimli tahmini erişim (son 30 gün): her gün o güne kadar kabul edilenlerin takipçi toplamı.
        accepted = list(
            applications.filter(status=ApplicationStatus.ACCEPTED, reviewed_at__isnull=False)
            .select_related("creator")
            .prefetch_related("creator__social_accounts")
        )
        base = sum(a.creator.total_followers for a in accepted if a.reviewed_at < d30)
        by_day = {}
        for a in accepted:
            if a.reviewed_at >= d30:
                by_day[a.reviewed_at.date()] = by_day.get(a.reviewed_at.date(), 0) + a.creator.total_followers
        series, running = [], base
        for offset in range(29, -1, -1):
            day = (now - datetime.timedelta(days=offset)).date()
            running += by_day.get(day, 0)
            series.append({"date": day.isoformat(), "reach": running})

        data = {
            "estimated_reach": running,
            "reach_series": series,
            "applicants_trend_pct": _trend_pct(recent_apps, prev_apps),
            "accepted_trend_pct": _trend_pct(recent_acc, prev_acc),
            "active_campaigns_delta": campaigns.filter(status=CampaignStatus.PUBLISHED, created_at__gte=d30).count(),
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

        from apps.collaborations.models import Collaboration, CollaborationStatus
        from apps.payments.models import CreatorEarning, CreatorEarningStatus

        now = timezone.now()
        d30, d60 = now - datetime.timedelta(days=30), now - datetime.timedelta(days=60)
        live = CreatorEarning.objects.filter(creator_user=request.user).exclude(status=CreatorEarningStatus.CANCELLED)
        new_earnings = live.aggregate(total=Sum("amount"))["total"] or 0
        this_month = live.filter(created_at__gte=d30).aggregate(total=Sum("amount"))["total"] or 0
        prev_month = live.filter(created_at__gte=d60, created_at__lt=d30).aggregate(total=Sum("amount"))["total"] or 0
        monthly = []
        for back in range(5, -1, -1):
            first = (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - datetime.timedelta(days=30 * back)).replace(day=1)
            nxt = (first + datetime.timedelta(days=32)).replace(day=1)
            total = live.filter(created_at__gte=first, created_at__lt=nxt).aggregate(t=Sum("amount"))["t"] or 0
            monthly.append({"month": first.strftime("%Y-%m"), "total": float(total)})
        accounts = list(creator.social_accounts.all())
        reach = sum(a.reach_count for a in accounts) or creator.total_followers
        profile = request.user.profile
        checks = {
            "basic": bool(creator.display_name and creator.bio and getattr(profile, "avatar", None)),
            "social": bool(accounts),
            "portfolio": creator.portfolio_items.count() >= 3,
            "stats": any(a.provider_user_id for a in accounts),
        }
        completion = {"percent": 25 * sum(checks.values()), **checks}
        recent_apps = applications.filter(created_at__gte=d30).count()
        prev_apps = applications.filter(created_at__gte=d60, created_at__lt=d30).count()

        data = {
            "active_collaborations": Collaboration.objects.filter(creator=creator).exclude(
                status__in=[CollaborationStatus.PAID, CollaborationStatus.CANCELLED]
            ).count(),
            "total_reach": reach,
            "earnings_this_month": float(this_month),
            "earnings_trend_pct": _trend_pct(int(this_month), int(prev_month)),
            "monthly_earnings": monthly,
            "applications_trend_pct": _trend_pct(recent_apps, prev_apps),
            "profile_completion": completion,
            "collaborations": applications.filter(status=ApplicationStatus.ACCEPTED).count(),
            "total_applications_sent": applications.count(),
            "profile_views": profile_views,
            "earnings": float(earnings) + float(new_earnings),
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
