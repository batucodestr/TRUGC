from apps.accounts.permissions import IsOwner


class IsBrandOwner(IsOwner):
    """Bir marka yalnızca kendi şirket profilini düzenleyebilir."""

    owner_field_default = "user"
