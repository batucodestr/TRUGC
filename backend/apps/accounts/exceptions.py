import logging

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

# Her HTTP durum kodu için makine tarafından okunabilir bir kod + production'a
# uygun Türkçe mesaj. Asla istisnanın kendi mesajından türetilmez — bu, DRF'nin
# henüz temizlemediği içerikler için dahili bilgileri (sorgu parçaları, dosya
# yolları) sızdırabilir.
_STATUS_CODE_MAP = {
    status.HTTP_400_BAD_REQUEST: ("VALIDATION_ERROR", "Gönderilen bilgilerde bir hata var."),
    status.HTTP_401_UNAUTHORIZED: ("UNAUTHORIZED", "Bu işlem için giriş yapmanız gerekiyor."),
    status.HTTP_403_FORBIDDEN: ("FORBIDDEN", "Bu işlemi gerçekleştirme yetkiniz bulunmuyor."),
    status.HTTP_404_NOT_FOUND: ("NOT_FOUND", "Kaynak bulunamadı."),
    status.HTTP_405_METHOD_NOT_ALLOWED: ("METHOD_NOT_ALLOWED", "Bu işlem desteklenmiyor."),
    status.HTTP_406_NOT_ACCEPTABLE: ("NOT_ACCEPTABLE", "İstek karşılanamadı."),
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: ("UNSUPPORTED_MEDIA_TYPE", "Desteklenmeyen içerik türü."),
    status.HTTP_429_TOO_MANY_REQUESTS: ("RATE_LIMITED", "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin."),
}
_DEFAULT_CODE, _DEFAULT_MESSAGE = "ERROR", "Bir hata oluştu."
_SERVER_CODE, _SERVER_MESSAGE = "SERVER_ERROR", "Sunucuda beklenmeyen bir hata oluştu."


def custom_exception_handler(exc, context):
    """
    DRF'nin döndürdüğü her yanıt için tutarlı bir JSON hata zarfı:
        { "error": true, "code": "NOT_FOUND", "message": "Kaynak bulunamadı.", "fields": {...}? }

    `fields` yalnızca DRF'nin varsayılan handler'ının alan bazlı doğrulama
    hataları ürettiği 400'lerde bulunur (bir ModelSerializer'ın olağan şekli);
    diğer tüm durumlar güvenli tek bir `message`'a indirgenir — production'da
    hiçbir istisna metni, stack trace veya dahili detay yanıta ulaşmaz.
    """
    if isinstance(exc, Http404):
        exc = APIException("Not found.")
        exc.status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, PermissionDenied) and not hasattr(exc, "status_code"):
        exc.status_code = status.HTTP_403_FORBIDDEN

    response = drf_exception_handler(exc, context)

    if response is None:
        # DRF'nin tanıdığı bir APIException değil — gerçek, ele alınmamış bir hata.
        # Tanı için sunucu tarafında (traceback ile) tam istisnayı logla, ancak
        # istemci her zaman aşağıdaki genel zarfı görür.
        request = context.get("request")
        logger.exception("Unhandled exception in %s", getattr(request, "path", "<unknown path>"), exc_info=exc)
        return Response({"error": True, "code": _SERVER_CODE, "message": _SERVER_MESSAGE}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    code, message = _STATUS_CODE_MAP.get(response.status_code, (_DEFAULT_CODE, _DEFAULT_MESSAGE))
    payload = {"error": True, "code": code, "message": message}

    # Alan bazlı doğrulama hatalarının (ör. {"email": ["This field is required."]})
    # üst seviyede bir "detail" anahtarı yoktur — bunları `fields` altında
    # sunuyoruz ki frontend yalnızca `message` göstermek yerine ilgili alanları
    # vurgulayabilsin.
    if isinstance(response.data, dict) and "detail" not in response.data:
        fields = {k: (v if isinstance(v, list) else [v]) for k, v in response.data.items()}
        payload["fields"] = {k: [str(item) for item in v] for k, v in fields.items()}

    response.data = payload
    return response


def error_response(code: str, message: str, http_status: int) -> Response:
    """Hata yükseltmek yerine doğrudan bir Response oluşturan az sayıdaki view için
    (yukarıdaki custom_exception_handler'ı atlar) — bunları çıplak bir
    {"detail": ...} yerine aynı zarf şekliyle döndürmeyi sağlar."""
    return Response({"error": True, "code": code, "message": message}, status=http_status)
