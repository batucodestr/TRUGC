from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "creators"

router = DefaultRouter()
router.register("me/social-accounts", views.SocialAccountViewSet, basename="social-account")
router.register("me/portfolio", views.PortfolioItemViewSet, basename="portfolio-item")
router.register("me/packages", views.CreatorPackageViewSet, basename="creator-package")

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    path("", views.CreatorListView.as_view(), name="creator-list"),
    path("me/", views.MyCreatorView.as_view(), name="my-creator"),
    path("", include(router.urls)),
    path("<int:pk>/manage/", views.CreatorAdminDetailView.as_view(), name="creator-admin-detail"),
    path("<int:pk>/", views.CreatorDetailView.as_view(), name="creator-detail"),
]
