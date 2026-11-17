#!/bin/sh
# Database tests: the booking rules and the roles.
#
#   docker compose run --rm --entrypoint sh migrate /scripts/test.sh
#
# Each file in supabase/tests runs in a transaction that is rolled back.
# The race test then lets two sessions grab the same plot at the same time.
set -eu

export PGHOST="${PGHOST:-db}" PGUSER="${PGUSER:-postgres}" PGDATABASE="${PGDATABASE:-postgres}"
DIR="${MIGRATIONS_DIR:-/supabase}"
PSQL="psql -v ON_ERROR_STOP=1 -q -X"

for file in "$DIR"/tests/*.sql; do
  echo "test: $(basename "$file")"
  { echo "begin;"; cat "$file"; echo "rollback;"; } | $PSQL
done

echo "test: race for the same plot"
token() { cat /proc/sys/kernel/random/uuid; }
# Clean slate for the race dates, in case an earlier run was interrupted.
$PSQL -c "delete from public.reservations where plot_id = 'T40' and stay && '[2030-09-20,2030-09-23)'::daterange"
race() {
  # Each session waits until the same wall-clock moment, then holds T40.
  $PSQL -tA -c "select pg_sleep(1.5 - extract(epoch from clock_timestamp())::numeric % 1);
    select public.place_hold('T40', '2030-09-20', '2030-09-23', '$(token)')->>'status';" | tail -n 1
}
race > /tmp/race1 & race > /tmp/race2 & race > /tmp/race3 &
wait
results=$(cat /tmp/race1 /tmp/race2 /tmp/race3 | sort | tr '\n' ' ')
$PSQL -c "delete from public.reservations where plot_id = 'T40' and stay && '[2030-09-20,2030-09-23)'::daterange"
echo "  results: $results"
held=$(cat /tmp/race1 /tmp/race2 /tmp/race3 | grep -c '^held$' || true)
taken=$(cat /tmp/race1 /tmp/race2 /tmp/race3 | grep -c '^taken$' || true)
if [ "$held" -ne 1 ] || [ "$taken" -ne 2 ]; then
  echo "FAIL: expected exactly one winner" >&2
  exit 1
fi
echo "all database tests passed"
