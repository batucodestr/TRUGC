from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

GROUP_NAMES = ["Creators", "Brands", "Moderators", "Admins"]


class Command(BaseCommand):
    help = "Ensures the base role groups (Creators, Brands, Moderators, Admins) exist."

    def handle(self, *args, **options):
        for name in GROUP_NAMES:
            _, created = Group.objects.get_or_create(name=name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created group '{name}'"))
            else:
                self.stdout.write(f"Group '{name}' already exists")
