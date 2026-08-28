from rest_framework.permissions import BasePermission

from apps.accounts.models import Role
from apps.accounts.permissions import IsOwner


class IsCreatorOwner(IsOwner):
    """Bir creator yalnızca kendi profilini, sosyal medya hesaplarını ve portföy öğelerini düzenleyebilir."""

    owner_field_default = "user"


class IsCreatorOwnerViaCreator(IsOwner):
    """`.creator.user` üzerinden ulaşılan iç içe kaynaklar (sosyal medya hesapları, portföy öğeleri) için."""

    owner_field_default = "creator.user"


class CanViewCreatorDirectory(BasePermission):
    """Creator dizinini (liste görünümü) yalnızca giriş yapmış kullanıcılara,
    ve marka rolündeyse yalnızca ödemesi admin tarafından onaylanmış markalara açar.
    Tek bir creator'ın profil detay sayfası bilinçli olarak bu kısıtlamaya tabi
    değildir (CreatorDetailView hâlâ AllowAny) — yalnızca toplu keşif/listeleme
    kilitlenir."""

    message = "İçerik üreticilerini görüntülemek için giriş yapmanız ve markanızın ödeme onayının tamamlanmış olması gerekir."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == Role.BRAND:
            from apps.brands.models import Brand

            # getattr(user, "brand", ...) üzerinden gidersek, bu User nesnesinin
            # .brand ilişkisi daha önce (ör. kayıt sırasındaki post_save sinyali
            # zincirinde, Brand satırı henüz oluşmadan) bir kez erişilmiş ve
            # Python tarafında cache'lenmiş olabilir; sonraki bir has_paid_access
            # güncellemesi (ör. admin panelindeki toplu .update()) bu cache'i
            # geçersiz kılmaz. Bunun yerine her seferinde taze bir sorgu atarız.
            return Brand.objects.filter(user_id=user.id, has_paid_access=True).exists()
        return True
