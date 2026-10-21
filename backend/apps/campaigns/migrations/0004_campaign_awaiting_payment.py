from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("campaigns", "0003_alter_campaignmedia_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="campaign",
            name="awaiting_payment",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Paketi olmayan markanın yayınlamak istediği ilan; ödeme onaylanınca otomatik yayına girer.",
            ),
        ),
    ]
