from django.urls import path

from . import views

app_name = "brands"

urlpatterns = [
    path("", views.BrandListView.as_view(), name="brand-list"),
    path("me/", views.MyBrandView.as_view(), name="my-brand"),
    path("<int:pk>/manage/", views.BrandAdminDetailView.as_view(), name="brand-admin-detail"),
    path("<int:pk>/", views.BrandDetailView.as_view(), name="brand-detail"),
]
