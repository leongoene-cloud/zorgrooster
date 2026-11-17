#!/usr/bin/env bash
# Start een tijdelijke lokale Postgres 16 met het schema + seed, voor de RLS-tests.
# Gebruik: scripts/test-db/start.sh  →  daarna  npm run test:db
set -euo pipefail
cd "$(dirname "$0")/../.."

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${TEST_PGDATA:-/tmp/zorgrooster-testdb}"
PORT="${TEST_PGPORT:-54329}"
USER_NAME="$(whoami)"

RUN=""
[ "$USER_NAME" = "root" ] && RUN="runuser -u postgres --"   # Postgres weigert als root te draaien
SOCK=/tmp

if [ -f "$DATA/postmaster.pid" ]; then
  $RUN "$PGBIN/pg_ctl" -D "$DATA" stop -m fast >/dev/null || true
fi
rm -rf "$DATA"
mkdir -p "$DATA"
[ -n "$RUN" ] && chown postgres:postgres "$DATA"

$RUN "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $SOCK -c listen_addresses=localhost" -l "$DATA/log.txt" start >/dev/null

PSQL="psql -h localhost -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database zorgrooster_test"
$PSQL -d zorgrooster_test -f scripts/test-db/auth-stub.sql
for f in supabase/migrations/*.sql; do
  $PSQL -d zorgrooster_test -f "$f"
done
$PSQL -d zorgrooster_test -f supabase/seed.sql

echo "Test-database klaar: postgres://postgres@localhost:$PORT/zorgrooster_test"
