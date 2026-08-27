from rest_framework.routers import DefaultRouter

from . import views

app_name = "payments"

router = DefaultRouter()
router.register("transactions", views.TransactionViewSet, basename="transaction")

urlpatterns = router.urls
