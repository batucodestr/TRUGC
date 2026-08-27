from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "campaigns"

router = DefaultRouter()
router.register("", views.CampaignViewSet, basename="campaign")

campaign_media_list = views.CampaignMediaViewSet.as_view({"get": "list", "post": "create"})
campaign_media_detail = views.CampaignMediaViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)
campaign_requirement_list = views.CampaignRequirementViewSet.as_view({"get": "list", "post": "create"})
campaign_requirement_detail = views.CampaignRequirementViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

urlpatterns = [
    path("<int:campaign_pk>/media/", campaign_media_list, name="campaign-media-list"),
    path("<int:campaign_pk>/media/<int:pk>/", campaign_media_detail, name="campaign-media-detail"),
    path("<int:campaign_pk>/deliverables/", campaign_requirement_list, name="campaign-requirement-list"),
    path("<int:campaign_pk>/deliverables/<int:pk>/", campaign_requirement_detail, name="campaign-requirement-detail"),
] + router.urls
