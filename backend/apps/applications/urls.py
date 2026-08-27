from rest_framework.routers import DefaultRouter

from . import views

app_name = "applications"

router = DefaultRouter()
router.register("", views.ApplicationViewSet, basename="application")

urlpatterns = router.urls
