from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='currency',
            field=models.CharField(default='TRY', max_length=3),
        ),
    ]
