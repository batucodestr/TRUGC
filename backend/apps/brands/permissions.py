from apps.accounts.permissions import IsOwner


class IsBrandOwner(IsOwner):
    """A brand can only edit its own company profile."""

    owner_field_default = "user"
