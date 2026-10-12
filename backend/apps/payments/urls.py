from django.urls import path, re_path
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
    # Bakiye ve üyelik paketi
    path("me/wallet/", views.MyWalletView.as_view(), name="my-wallet"),
    path("admin/packages/", views.PackageCatalogView.as_view(), name="package-catalog"),
    path("admin/users/<int:pk>/wallet/", views.UserWalletView.as_view(), name="user-wallet"),
    path("admin/users/<int:pk>/membership/", views.UserMembershipView.as_view(), name="user-membership"),
    # Ödeme bildirimi ("ödemeyi yaptım") ve admin onayı
    path("declarations/", views.PaymentDeclarationListCreateView.as_view(), name="declaration-list"),
    # decision yalnızca approve|reject olabilir; serbest bir <str:> yerine
    # kalıbı burada daraltmak, view'a hiç ulaşmayan yazım hatalarını 404'e
    # çevirir (sessizce "reddet" gibi davranmaz).
    re_path(
        r"^declarations/(?P<pk>\d+)/(?P<decision>approve|reject)/$",
        views.PaymentDeclarationReviewView.as_view(),
        name="declaration-review",
    ),
    path("pos/<str:merchant_oid>/", views.PosPaymentDetailView.as_view(), name="pos-payment-detail"),
    *router.urls,
]
