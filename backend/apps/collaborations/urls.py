from rest_framework.routers import DefaultRouter

from .views import CollaborationViewSet, StatusLogViewSet

app_name = "collaborations"

router = DefaultRouter()
router.register("status-logs", StatusLogViewSet, basename="status-log")
router.register("", CollaborationViewSet, basename="collaboration")

urlpatterns = router.urls
