"""Periyodik görevleri (django-celery-beat) idempotent olarak kaydeder.

    python manage.py setup_schedules
"""

import json

from django.core.management.base import BaseCommand
from django_celery_beat.models import IntervalSchedule, PeriodicTask

TASKS = [
    # (ad, görev, her kaç dakika)
    ("Üyelik süresi kontrolü", "apps.notifications.tasks.expire_memberships_task", 15),
    ("Sosyal hesap istatistik yenileme", "apps.notifications.tasks.refresh_social_accounts_task", 60 * 24),
]


class Command(BaseCommand):
    help = "Celery beat periyodik görevlerini oluşturur/günceller."

    def handle(self, *args, **options):
        for name, task, minutes in TASKS:
            schedule, _ = IntervalSchedule.objects.get_or_create(every=minutes, period=IntervalSchedule.MINUTES)
            PeriodicTask.objects.update_or_create(
                name=name, defaults={"task": task, "interval": schedule, "enabled": True, "args": json.dumps([])}
            )
            self.stdout.write(f"✓ {name} (her {minutes} dk)")
