from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("brand/dashboard/", views.BrandDashboardView.as_view(), name="brand-dashboard"),
    path("creator/dashboard/", views.CreatorDashboardView.as_view(), name="creator-dashboard"),
    path("admin/dashboard/", views.AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/export/", views.AdminAnalyticsExportView.as_view(), name="admin-export"),
]
