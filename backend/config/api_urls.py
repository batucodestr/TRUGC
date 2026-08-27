from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("brands/", include("apps.brands.urls")),
    path("creators/", include("apps.creators.urls")),
    path("campaigns/", include("apps.campaigns.urls")),
    path("applications/", include("apps.applications.urls")),
    path("messages/", include("apps.messaging.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("payments/", include("apps.payments.urls")),
    path("reports/", include("apps.reports.urls")),
]
