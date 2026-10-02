from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Accounts"

    def ready(self):
        import apps.accounts.checks  # noqa: F401  (sistem kontrollerini kaydeder)
        import apps.accounts.signals  # noqa: F401
