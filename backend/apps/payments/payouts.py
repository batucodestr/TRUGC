"""Creator hak edişinin PayTR pazaryeri (alt üye işyeri) üzerinden aktarılması.

PayTR'de para tutma/dağıtma işlemi PayTR'nin kendi pazaryeri altyapısındadır.
``PAYTR_PLATFORM_TRANSFER_ENABLED`` kapalıyken (varsayılan) hak ediş
"ödenebilir" kalır ve admin, PayTR panelinden yaptığı transferi
``mark_earning_paid`` ile işaretler. Açıkken ``try_automatic_payout``
PayTR'ye transfer talebi gönderir.

NOT: PayTR "Platform Transfer" API'si ayrı bir sözleşme/yetki gerektirir ve
istek alanları PayTR'nin size verdiği dokümana göre doğrulanmalıdır; bu
nedenle otomatik transfer adaptörü bilerek korumalıdır (aşağıya bakın).
"""

from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class PayoutNotConfigured(Exception):
    pass


def try_automatic_payout(earning) -> bool:
    """Otomatik transfer açık ve creator'ın alt üye işyeri tanımlıysa dener; aksi halde sessizce çıkar."""
    if not getattr(settings, "PAYTR_PLATFORM_TRANSFER_ENABLED", False):
        return False
    profile = getattr(earning.creator_user, "payout_profile", None)
    if profile is None or not profile.paytr_submerchant_id:
        logger.info("Hak ediş %s için alt üye işyeri tanımlı değil; elle ödenecek.", earning.pk)
        return False
    # Gerçek PayTR Platform Transfer çağrısı PayTR'nin size verdiği API
    # dokümanıyla (endpoint + imza alanları) bağlanmalıdır. Uydurma bir istek
    # göndermek yerine açıkça başarısız oluruz; hak ediş ödenebilir kalır.
    logger.warning("PayTR Platform Transfer adaptörü henüz PayTR dokümanına bağlanmadı (hak ediş %s).", earning.pk)
    return False
