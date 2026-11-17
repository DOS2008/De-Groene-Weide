#!/bin/sh
# Restore test: loads the newest backup into a scratch database next to the
# real one, compares the row counts of the important tables, and drops the
# scratch database again. The live data is never touched.
#
#   docker compose -f compose.prod.yaml run --rm backup sh /scripts/restore-check.sh
#   (in development: docker compose run --rm -v ./backups:/backups --entrypoint sh migrate /scripts/restore-check.sh)
#
# Run it after setting up the server and then every few months; write the
# date in docs/handover.md.
set -eu

export PGHOST="${PGHOST:-db}" PGUSER="${PGUSER:-postgres}"
OUT="${BACKUP_DIR:-/backups}"
dump=$(ls -1t "$OUT"/db-*.dump 2>/dev/null | head -n 1 || true)
if [ -z "$dump" ]; then
  echo "restore-check: no backup in $OUT" >&2
  exit 1
fi
echo "restore-check: $dump"

psql -q -X -d postgres -c "drop database if exists restore_check" -c "create database restore_check"
# Some Supabase extensions (pg_cron, the event triggers) only live in the
# main database; their errors are expected. The counts below decide.
pg_restore --no-owner -d restore_check "$dump" > /tmp/restore.log 2>&1 || true

status=0
for table in reservations plots events messages texts media profiles; do
  live=$(psql -tAX -d postgres -c "select count(*) from public.$table")
  restored=$(psql -tAX -d restore_check -c "select count(*) from public.$table" 2>/dev/null || echo "missing")
  printf '  %-14s live %6s  restored %6s\n' "$table" "$live" "$restored"
  # The backup is older than the live data, so it may have fewer rows, but
  # never none when there is data, and the table must be there.
  if [ "$restored" = "missing" ] || { [ "$live" -gt 0 ] && [ "$restored" -eq 0 ]; }; then status=1; fi
done
users=$(psql -tAX -d restore_check -c "select count(*) from auth.users" 2>/dev/null || echo "missing")
echo "  auth.users     restored $users"
[ "$users" = "missing" ] && status=1

psql -q -X -d postgres -c "drop database restore_check"
if [ "$status" -ne 0 ]; then
  echo "restore-check: FAILED (see /tmp/restore.log in the container)" >&2
  exit 1
fi
echo "restore-check: OK"
