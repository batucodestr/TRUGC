from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Role, User

from .models import Creator


@receiver(post_save, sender=User)
def create_creator_profile(sender, instance, created, **kwargs):
    if created and instance.role == Role.CREATOR:
        Creator.objects.get_or_create(user=instance, defaults={"display_name": instance.email.split("@")[0]})
