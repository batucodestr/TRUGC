from django.db import connection
from django.http import JsonResponse

from django_redis import get_redis_connection


def healthz(request):
    """Liveness/readiness probe for Docker healthchecks and scripts/healthcheck.sh."""
    checks = {}

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001 - report any failure, not just connection errors
        checks["database"] = f"error: {exc}"

    try:
        redis_conn = get_redis_connection("default")
        redis_conn.ping()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {exc}"

    healthy = all(v == "ok" for v in checks.values())
    return JsonResponse({"status": "ok" if healthy else "error", "checks": checks}, status=200 if healthy else 503)
