from apps.accounts.permissions import IsOwner


class IsCreatorOwner(IsOwner):
    """Bir creator yalnızca kendi profilini, sosyal medya hesaplarını ve portföy öğelerini düzenleyebilir."""

    owner_field_default = "user"


class IsCreatorOwnerViaCreator(IsOwner):
    """`.creator.user` üzerinden ulaşılan iç içe kaynaklar (sosyal medya hesapları, portföy öğeleri) için."""

    owner_field_default = "creator.user"
