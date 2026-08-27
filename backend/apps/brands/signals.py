from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Role, User

from .models import Brand


@receiver(post_save, sender=User)
def create_brand_profile(sender, instance, created, **kwargs):
    if created and instance.role == Role.BRAND:
        Brand.objects.get_or_create(user=instance, defaults={"company_name": instance.email.split("@")[0]})
