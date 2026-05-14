"""Fixtures for the end-to-end smoke test.

This test boots docker-compose (postgres + kafka + zookeeper +
audit-reporting-service + db-migrate) and exercises the
producer → Kafka broker → consumer → audit_logs DB path.

Run locally:
    docker compose up -d --build postgres kafka zookeeper db-migrate audit-reporting-service
    pip install -r tests/e2e/requirements.txt
    cd tests/e2e && pytest -v

The CI workflow (.github/workflows/ci.yml :: e2e-tests) does the same
inside a runner.
"""

import os
import time

import psycopg
import pytest
from confluent_kafka import Producer


@pytest.fixture(scope="session")
def postgres_dsn() -> str:
    dsn = os.environ.get(
        "E2E_DATABASE_URL",
        "postgresql://origin:password@localhost:5434/origin_db",
    )
    _wait_for(lambda: _ping_postgres(dsn), 60, f"postgres at {dsn}")
    return dsn


@pytest.fixture(scope="session")
def kafka_bootstrap() -> str:
    servers = os.environ.get("E2E_KAFKA_BOOTSTRAP", "localhost:29092")
    _wait_for(lambda: _ping_kafka(servers), 90, f"kafka at {servers}")
    return servers


@pytest.fixture(scope="session")
def producer(kafka_bootstrap: str) -> Producer:
    return Producer({"bootstrap.servers": kafka_bootstrap})


def _ping_postgres(dsn: str) -> bool:
    try:
        with psycopg.connect(dsn, connect_timeout=2) as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False


def _ping_kafka(servers: str) -> bool:
    try:
        p = Producer({"bootstrap.servers": servers, "socket.timeout.ms": 2000})
        # list_topics() with a short timeout is the cheapest reachability probe.
        p.list_topics(timeout=2)
        return True
    except Exception:
        return False


def _wait_for(predicate, timeout_s: int, label: str) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(1)
    raise RuntimeError(f"{label} did not become ready within {timeout_s}s")
