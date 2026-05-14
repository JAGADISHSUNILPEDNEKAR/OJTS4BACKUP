#!/usr/bin/env bash
# Apply SQL migrations in infra/db/migrations/ to the target Postgres.
#
# Tracks applied migrations in a `schema_migrations` table so the script is
# idempotent — running it twice is a no-op after the first run.
#
# Connection: either set DATABASE_URL (preferred) or the standard PG* env vars
# (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE). Exits non-zero on any
# failure so CI can gate the deploy on it.
#
# Local usage:
#   DATABASE_URL=postgresql://origin:origin@localhost:5432/origin \
#     ./infra/db/run_migrations.sh
#
# CI usage: the deploy workflow exports DATABASE_URL from a secret and invokes
# this script before building images.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
    echo "error: migrations directory not found at ${MIGRATIONS_DIR}" >&2
    exit 1
fi

# psql honors DATABASE_URL as its first positional arg, or falls back to PG*.
PSQL_TARGET=()
if [[ -n "${DATABASE_URL:-}" ]]; then
    PSQL_TARGET=("${DATABASE_URL}")
fi

psql_exec() {
    psql "${PSQL_TARGET[@]}" \
        --no-psqlrc \
        --quiet \
        --tuples-only \
        --no-align \
        --set ON_ERROR_STOP=1 \
        "$@"
}

# TimescaleDB (and the stock postgres image) briefly accepts connections during
# initdb, then restarts the postmaster — `pg_isready` can flip green during the
# first phase while the second-phase startup still rejects clients with
# `FATAL: the database system is starting up`. Retry a trivial SELECT until the
# server accepts real queries before we begin migrating.
echo "==> Waiting for postgres to accept queries"
for attempt in $(seq 1 60); do
    if psql_exec -c 'SELECT 1' >/dev/null 2>&1; then
        break
    fi
    if [[ ${attempt} -eq 60 ]]; then
        echo "error: postgres did not become ready within 60 attempts" >&2
        exit 1
    fi
    sleep 1
done

echo "==> Ensuring schema_migrations table exists"
psql_exec -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
"

# Read already-applied migrations into a set for fast lookup.
APPLIED="$(psql_exec -c 'SELECT filename FROM schema_migrations ORDER BY filename;')"

applied_set=" "
while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    applied_set+="${line} "
done <<< "${APPLIED}"

# Find migrations and sort numerically (001_, 002_, ...).
shopt -s nullglob
MIGRATIONS=("${MIGRATIONS_DIR}"/*.sql)
shopt -u nullglob

if [[ ${#MIGRATIONS[@]} -eq 0 ]]; then
    echo "no migrations found in ${MIGRATIONS_DIR}"
    exit 0
fi

# Sort by filename so 001_ runs before 002_, etc.
IFS=$'\n' MIGRATIONS=($(printf '%s\n' "${MIGRATIONS[@]}" | sort))
unset IFS

pending=0
for path in "${MIGRATIONS[@]}"; do
    fname="$(basename "${path}")"
    if [[ "${applied_set}" == *" ${fname} "* ]]; then
        echo "    skip ${fname} (already applied)"
        continue
    fi
    pending=$((pending + 1))
    echo "==> Applying ${fname}"
    # Wrap each migration in a transaction so a failure rolls back cleanly.
    # We register the migration in schema_migrations in the SAME transaction
    # so we never end up with applied DDL but no ledger row.
    psql_exec \
        --single-transaction \
        --file "${path}" \
        -c "INSERT INTO schema_migrations (filename) VALUES ('${fname}');"
done

if [[ ${pending} -eq 0 ]]; then
    echo "==> Database is up to date"
else
    echo "==> Applied ${pending} migration(s)"
fi
