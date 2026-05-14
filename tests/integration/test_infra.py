"""End-to-end infra smoke test.

Verifies the contract that the rest of the platform builds on:
- Postgres is reachable, migrations applied (schema_migrations populated).
- RLS is actually enabled on the shipments table (the load-bearing claim
  of migration 011_hardening_rls.sql).
- Audit logs are append-only — the trigger from 011 rejects UPDATE/DELETE.
- Redis ping/setex/get round-trip works.

These checks would have caught two of the bugs the audit found before they
shipped:
- create_all replacing migrations would leave schema_migrations empty.
- A deploy that skipped migrations would have RLS disabled on shipments.
"""

import psycopg


def test_postgres_reachable(postgres_dsn: str):
    with psycopg.connect(postgres_dsn) as conn:
        result = conn.execute("SELECT 1").fetchone()
        assert result == (1,)


def test_migrations_applied(postgres_dsn: str):
    """schema_migrations should contain every .sql under infra/db/migrations.
    The exact list is brittle, so just assert the count is non-zero AND
    that the load-bearing 011_hardening_rls.sql ran.
    """
    with psycopg.connect(postgres_dsn) as conn:
        rows = conn.execute(
            "SELECT filename FROM schema_migrations ORDER BY filename"
        ).fetchall()
    filenames = {r[0] for r in rows}
    assert "011_hardening_rls.sql" in filenames, (
        f"011_hardening_rls.sql missing from schema_migrations: {filenames}"
    )
    assert len(filenames) >= 11, f"Too few migrations applied: {filenames}"


def test_rls_enabled_on_shipments(postgres_dsn: str):
    with psycopg.connect(postgres_dsn) as conn:
        row = conn.execute(
            "SELECT relrowsecurity FROM pg_class WHERE relname = 'shipments'"
        ).fetchone()
        assert row is not None, "shipments table does not exist"
        assert row[0] is True, "RLS is NOT enabled on shipments — 011_hardening_rls.sql did not run"


def test_tenant_isolation_policy_exists(postgres_dsn: str):
    with psycopg.connect(postgres_dsn) as conn:
        row = conn.execute(
            "SELECT polname FROM pg_policy WHERE polrelid = 'shipments'::regclass"
        ).fetchone()
        assert row is not None, "No RLS policy on shipments — 011_hardening_rls.sql did not run"


def test_audit_logs_are_append_only(postgres_dsn: str):
    """The trigger from 011 should raise on UPDATE/DELETE of audit_logs."""
    with psycopg.connect(postgres_dsn) as conn:
        # Insert a row we'll attempt to update.
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audit_logs (topic, payload) VALUES ('test.append_only', '{}'::jsonb) RETURNING id"
            )
            row_id = cur.fetchone()[0]
            conn.commit()

        # UPDATE must raise.
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE audit_logs SET topic = 'tampered' WHERE id = %s",
                    (row_id,),
                )
            update_succeeded = True
        except psycopg.errors.RaiseException:
            update_succeeded = False
        finally:
            conn.rollback()
        assert not update_succeeded, "audit_logs UPDATE was not blocked by the immutability trigger"

        # DELETE must raise.
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM audit_logs WHERE id = %s", (row_id,))
            delete_succeeded = True
        except psycopg.errors.RaiseException:
            delete_succeeded = False
        finally:
            conn.rollback()
        assert not delete_succeeded, "audit_logs DELETE was not blocked by the immutability trigger"


def test_redis_roundtrip(redis_client):
    redis_client.setex("integration:smoke", 60, "ok")
    assert redis_client.get("integration:smoke") == b"ok"
