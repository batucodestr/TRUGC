from apps.accounts.permissions import IsOwner


class IsCreatorOwner(IsOwner):
    """A creator can only edit its own profile, social accounts, and portfolio items."""

    owner_field_default = "user"


class IsCreatorOwnerViaCreator(IsOwner):
    """For nested resources (social accounts, portfolio items) reached via `.creator.user`."""

    owner_field_default = "creator.user"
