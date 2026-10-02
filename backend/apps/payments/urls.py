from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "payments"

router = DefaultRouter()
router.register("transactions", views.TransactionViewSet, basename="transaction")

urlpatterns = [
    # Ücretlendirme durumu — hafta sonu ücretsiz / hafta içi ücretli bilgisinin
    # tek kaynağı. Frontend fiyat alanlarını buna göre gizler.
    path("pricing/", views.PricingStateView.as_view(), name="pricing-state"),
    # Sanal POS
    path("pos/config/", views.PosConfigView.as_view(), name="pos-config"),
    path("pos/checkout/", views.PosCheckoutView.as_view(), name="pos-checkout"),
    path("pos/payments/", views.MyPosPaymentListView.as_view(), name="pos-payment-list"),
    path("pos/callback/<str:provider_name>/", views.PosCallbackView.as_view(), name="pos-callback"),
    path("pos/<str:merchant_oid>/", views.PosPaymentDetailView.as_view(), name="pos-payment-detail"),
    *router.urls,
]
