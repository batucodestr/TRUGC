#!/bin/sh
# Verifies frontend, backend, Postgres, and Redis are all reachable and
# reports failures clearly. Exits non-zero if anything is unhealthy.
#
# Usage: ./scripts/healthcheck.sh

set -u

cd "$(dirname "$0")/.."

FAILED=0

check() {
  name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "[OK]   $name"
  else
    echo "[FAIL] $name"
    FAILED=1
  fi
}

check "Postgres (pg_isready)" docker compose exec -T db pg_isready -U "${POSTGRES_USER:-collably}"
check "Redis (PING)" docker compose exec -T redis redis-cli ping
check "Backend (/healthz/)" docker compose exec -T backend python -c "
import urllib.request, sys
sys.exit(0 if urllib.request.urlopen('http://localhost:8000/healthz/').status == 200 else 1)
"
check "Frontend (/)" docker compose exec -T frontend node -e "
require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))
"

if [ "$FAILED" -eq 0 ]; then
  echo "All services healthy."
else
  echo "One or more services are unhealthy — see [FAIL] lines above."
fi

exit "$FAILED"
