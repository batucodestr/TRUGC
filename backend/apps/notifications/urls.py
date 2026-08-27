from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "notifications"

router = DefaultRouter()
router.register("", views.NotificationViewSet, basename="notification")

urlpatterns = [
    path("admin/broadcast/", views.AdminBroadcastView.as_view(), name="admin-broadcast"),
] + router.urls
