#!/bin/sh
# Applies database migrations and the seed. Runs in the `migrate` service on
# every `docker compose up`, before the website starts.
#
#   supabase/migrations/*.sql  run once each, in name order, each in one
#                              transaction. Applied names are kept in
#                              app_meta.migrations.
#   supabase/seed/*.sql        run every time. They only insert what is
#                              missing, so changes from the admin panel stay.
set -eu

export PGHOST="${PGHOST:-db}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-postgres}"

DIR="${MIGRATIONS_DIR:-/supabase}"
PSQL="psql -v ON_ERROR_STOP=1 -q -X"

# Supabase Auth creates its tables on start-up; profiles references auth.users.
tries=0
until [ "$($PSQL -tAc "select to_regclass('auth.users') is not null")" = "t" ]; do
  tries=$((tries + 1))
  if [ "$tries" -gt 60 ]; then
    echo "auth.users does not exist after 60 s; is the auth service running?" >&2
    exit 1
  fi
  sleep 1
done

$PSQL -c "create schema if not exists app_meta;
  create table if not exists app_meta.migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );"

for file in "$DIR"/migrations/*.sql; do
  [ -e "$file" ] || continue
  name=$(basename "$file")
  done_already=$($PSQL -tAc "select 1 from app_meta.migrations where name = '$name'")
  if [ -z "$done_already" ]; then
    echo "migrate: $name"
    tmp=$(mktemp)
    cat "$file" > "$tmp"
    printf "\ninsert into app_meta.migrations (name) values ('%s');\n" "$name" >> "$tmp"
    $PSQL --single-transaction -f "$tmp"
    rm -f "$tmp"
  fi
done

for file in "$DIR"/seed/*.sql; do
  [ -e "$file" ] || continue
  echo "seed: $(basename "$file")"
  $PSQL --single-transaction -f "$file"
done

# PostgREST caches the schema; tell it to reload after a change.
$PSQL -c "notify pgrst, 'reload schema';"
echo "migrate: done"
