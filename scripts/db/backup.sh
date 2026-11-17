#!/bin/sh
# Nightly backup: the whole database (pg_dump, custom format) plus the
# uploaded photos. Keeps the last 14 of each in /backups.
#
#   on the server, by the `backup` service in compose.prod.yaml
#   by hand: docker compose -f compose.prod.yaml run --rm backup sh /scripts/backup.sh
#
# Copy /backups off the server too (see docs/handover.md, "Backups").
set -eu

export PGHOST="${PGHOST:-db}" PGUSER="${PGUSER:-postgres}" PGDATABASE="${PGDATABASE:-postgres}"
OUT="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP:-14}"
stamp=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$OUT"

pg_dump -Fc -f "$OUT/db-$stamp.dump.part"
mv "$OUT/db-$stamp.dump.part" "$OUT/db-$stamp.dump"
if [ -d /storage ]; then
  tar -czf "$OUT/storage-$stamp.tar.gz.part" -C /storage .
  mv "$OUT/storage-$stamp.tar.gz.part" "$OUT/storage-$stamp.tar.gz"
fi

# Keep the newest $KEEP of each kind.
for kind in db storage; do
  ls -1t "$OUT"/$kind-* 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old"; done
done
echo "backup: $OUT/db-$stamp.dump ($(du -h "$OUT/db-$stamp.dump" | cut -f1))"
