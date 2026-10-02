from django.db import migrations
from django.db.models import F


def backfill_email_verified_at(apps, schema_editor):
    """Zaten doğrulanmış hesaplara bir zaman damgası ver.

    ``email_verified_at`` yeni bir denetim alanıdır; bu alan eklenmeden önce
    doğrulanmış kullanıcılar için gerçek doğrulama anı bilinmiyor, dolayısıyla
    en yakın bilinen üst sınır olan kayıt tarihi kullanılır. Alan yalnızca
    raporlama/denetim amaçlıdır — erişim kontrolü ``email_verified`` üzerinden
    yapılır, bu yüzden geriye dönük bu yaklaşım hiçbir yetkiyi etkilemez.
    """
    User = apps.get_model("accounts", "User")
    User.objects.filter(email_verified=True, email_verified_at__isnull=True).update(
        email_verified_at=F("date_joined")
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_user_email_verified_at_alter_profile_avatar"),
    ]

    operations = [
        migrations.RunPython(backfill_email_verified_at, migrations.RunPython.noop),
    ]
