"""Ücretlendirme durumuna duyarlı paylaşılan serializer davranışları.

"Hafta sonu fiyat göstermeme" kuralı yalnızca frontend'de uygulanamaz: API
yanıtında duran bir tutar, tarayıcı konsolundan, mobil istemciden veya
doğrudan curl ile görülebilir. Bu mixin, kuralı serializer katmanında —
yani verinin uygulamadan çıktığı tek noktada — uygular.
"""

from apps.common import pricing


class FreePeriodPricingMixin:
    """Ücretsiz dönemde fiyat alanlarını yanıttan düşürür ve yazmayı sıfırlar.

    * ``price_fields``: ücretsiz dönemde ``null`` olarak dönecek alan adları.
    * Her yanıta ``free_period`` bayrağı eklenir; istemci, ayrı bir istek
      atmadan o kaydın fiyatının neden boş olduğunu bilir.
    * Staff/moderatör/admin istekleri hariç tutulur (bkz.
      ``pricing.should_hide_prices``) — /manage panelinin raporlama ekranları
      hafta sonu da gerçek tutarları görmeye devam eder.
    """

    price_fields: tuple[str, ...] = ()

    @property
    def _request_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def hide_prices(self) -> bool:
        return pricing.should_hide_prices(self._request_user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        free = pricing.is_free_period()
        if free and self.hide_prices():
            for field in self.price_fields:
                if field in data:
                    data[field] = None
        if isinstance(data, dict):
            data["free_period"] = free
        return data
