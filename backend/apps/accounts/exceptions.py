import logging

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

# Machine-readable code + production-safe Turkish message per HTTP status.
# Never derived from the exception's own message — that can leak internals
# (query fragments, file paths) for anything DRF didn't already sanitize.
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
    Consistent JSON error envelope for every response DRF returns:
        { "error": true, "code": "NOT_FOUND", "message": "Kaynak bulunamadı.", "fields": {...}? }

    `fields` is only present for 400s where DRF's default handler produced
    per-field validation errors (a ModelSerializer's normal shape); anything
    else collapses to a single safe `message` — no exception text, stack
    trace, or internal detail ever reaches the response in production.
    """
    if isinstance(exc, Http404):
        exc = APIException("Not found.")
        exc.status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, PermissionDenied) and not hasattr(exc, "status_code"):
        exc.status_code = status.HTTP_403_FORBIDDEN

    response = drf_exception_handler(exc, context)

    if response is None:
        # Not an APIException DRF recognizes — a genuine unhandled bug. Log the
        # full exception server-side (with traceback) for diagnosis, but the
        # client only ever sees the generic envelope below.
        request = context.get("request")
        logger.exception("Unhandled exception in %s", getattr(request, "path", "<unknown path>"), exc_info=exc)
        return Response({"error": True, "code": _SERVER_CODE, "message": _SERVER_MESSAGE}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    code, message = _STATUS_CODE_MAP.get(response.status_code, (_DEFAULT_CODE, _DEFAULT_MESSAGE))
    payload = {"error": True, "code": code, "message": message}

    # Field-keyed validation errors (e.g. {"email": ["This field is required."]})
    # have no top-level "detail" key — surface them under `fields` so the
    # frontend can highlight specific inputs instead of only showing `message`.
    if isinstance(response.data, dict) and "detail" not in response.data:
        fields = {k: (v if isinstance(v, list) else [v]) for k, v in response.data.items()}
        payload["fields"] = {k: [str(item) for item in v] for k, v in fields.items()}

    response.data = payload
    return response


def error_response(code: str, message: str, http_status: int) -> Response:
    """For the handful of views that construct an error Response directly
    instead of raising (bypassing custom_exception_handler above) — keeps
    those on the same envelope shape rather than a bare {"detail": ...}."""
    return Response({"error": True, "code": code, "message": message}, status=http_status)
