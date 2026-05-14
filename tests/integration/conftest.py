"""Pytest fixtures for integration tests.

Tests in this directory talk to real Postgres + Redis + Kafka instances
provided by GitHub Actions service containers (or, locally, by
`docker compose up postgres redis kafka db-migrate`). They are NOT the
mocked unit tests under services/*/tests/ — those run without infra; these
require it.

Run locally:
    docker compose up -d postgres redis db-migrate
    pip install -r tests/integration/requirements.txt
    cd tests/integration && pytest

CI: the integration-tests job in .github/workflows/ci.yml provides the
services and DSNs via env vars.
"""

import os
import time

import psycopg
import pytest
import redis


@pytest.fixture(scope="session")
def postgres_dsn() -> str:
    dsn = os.environ.get(
        "INTEGRATION_DATABASE_URL",
        "postgresql://origin:password@localhost:5434/origin_db",
    )
    # Wait up to 30s for postgres to be reachable — covers the gap between
    # service-container start and pytest collection.
    deadline = time.monotonic() + 30
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with psycopg.connect(dsn, connect_timeout=2) as conn:
                conn.execute("SELECT 1")
            return dsn
        except Exception as e:
            last_err = e
            time.sleep(1)
    raise RuntimeError(f"Postgres not reachable at {dsn}: {last_err}")


@pytest.fixture(scope="session")
def redis_client() -> redis.Redis:
    url = os.environ.get("INTEGRATION_REDIS_URL", "redis://localhost:6379")
    client = redis.Redis.from_url(url, socket_connect_timeout=2)
    deadline = time.monotonic() + 30
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            if client.ping():
                return client
        except Exception as e:
            last_err = e
            time.sleep(1)
    raise RuntimeError(f"Redis not reachable: {last_err}")
