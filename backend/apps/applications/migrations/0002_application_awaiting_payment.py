from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="application",
            name="awaiting_payment",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Creator'ın aktif paketi yokken yapılan başvuru; ödeme onaylanana kadar markaya gösterilmez.",
            ),
        ),
    ]
