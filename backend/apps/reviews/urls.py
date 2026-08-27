from rest_framework.routers import DefaultRouter

from . import views

app_name = "reviews"

router = DefaultRouter()
router.register("", views.ReviewViewSet, basename="review")

urlpatterns = router.urls
