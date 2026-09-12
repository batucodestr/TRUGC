#!/bin/sh
set -e

echo "Waiting for database..."
python - <<'PYCODE'
import os
import sys
import time

import psycopg2

url = os.environ.get("DATABASE_URL", "")
if url:
    for attempt in range(30):
        try:
            psycopg2.connect(url)
            break
        except psycopg2.OperationalError:
            time.sleep(1)
    else:
        sys.exit("Database never became available")
PYCODE

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_groups

exec "$@"
