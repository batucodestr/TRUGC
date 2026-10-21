from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user


def notify_brand_of_application(application) -> None:
    who = application.creator.display_name or application.creator.user.email
    notify_user(
        user=application.campaign.brand.user,
        title="Yeni başvuru aldınız",
        body=f"{who}, \"{application.campaign.title}\" kampanyanıza başvurdu.",
        notification_type=NotificationType.APPLICATION,
        link="/dashboard/brand/applications",
    )
