#!/bin/sh
# Dumps the Postgres database via `docker compose exec db pg_dump`, stores it
# under postgres/backups/, and prunes anything older than the last 7 backups.
#
# Usage: ./scripts/backup.sh
# Restore: gunzip -c postgres/backups/<file>.sql.gz | docker compose exec -T db \
#            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

set -eu

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./.env
fi

POSTGRES_USER="${POSTGRES_USER:-collably}"
POSTGRES_DB="${POSTGRES_DB:-collably}"

BACKUP_DIR="postgres/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/collably-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up database '$POSTGRES_DB' to $BACKUP_FILE ..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
echo "Backup written: $BACKUP_FILE"

echo "Pruning backups older than the last 7 ..."
ls -1t "$BACKUP_DIR"/collably-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f --

echo "Done. Current backups:"
ls -1t "$BACKUP_DIR"/collably-*.sql.gz 2>/dev/null
