from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile, User, VerificationStatus

ROLE_GROUP_NAMES = {
    "creator": "Creators",
    "brand": "Brands",
    "moderator": "Moderators",
    "admin": "Admins",
}


@receiver(post_save, sender=User)
def create_related_records(sender, instance, created, **kwargs):
    if not created:
        return

    Profile.objects.get_or_create(user=instance)
    VerificationStatus.objects.get_or_create(user=instance)

    group_name = ROLE_GROUP_NAMES.get(instance.role)
    if group_name:
        group, _ = Group.objects.get_or_create(name=group_name)
        instance.groups.add(group)
