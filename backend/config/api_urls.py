from django.urls import include, path

from apps.common.views import SignedFileView

urlpatterns = [
    path("files/<str:token>/", SignedFileView.as_view(), name="signed-file"),
    path("auth/", include("apps.accounts.urls")),
    path("brands/", include("apps.brands.urls")),
    path("creators/", include("apps.creators.urls")),
    path("campaigns/", include("apps.campaigns.urls")),
    path("collaborations/", include("apps.collaborations.urls")),
    path("applications/", include("apps.applications.urls")),
    path("messages/", include("apps.messaging.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("payments/", include("apps.payments.urls")),
    path("reports/", include("apps.reports.urls")),
]
