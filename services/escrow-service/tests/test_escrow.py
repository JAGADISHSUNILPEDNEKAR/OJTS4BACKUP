import sys
from unittest.mock import MagicMock, AsyncMock

# Mock out dependencies that require real connections. asyncpg + psycopg2
# are mocked at import time so SQLAlchemy's engine setup in database.py
# doesn't try to load the real drivers. aiokafka is mocked the same way.
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()
sys.modules['aiokafka'] = MagicMock()

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from core.dependencies import get_current_user_from_token
from schemas import CurrentUser

# Mock the kafka producer to avoid connection errors during tests
import escrow
escrow.publish_message = AsyncMock()


class _MockAsyncSessionLocal:
    """Drop-in for AsyncSessionLocal used by `process_fund_hold` and the
    /psbt/sign endpoint. Returns an async-context-managed mock session
    whose execute() yields a result that maps any select() to None.
    """

    def __call__(self):
        return self

    async def __aenter__(self):
        session = MagicMock()
        result = MagicMock()
        result.scalar_one_or_none = MagicMock(return_value=None)
        result.scalars.return_value.first = MagicMock(return_value=None)
        session.execute = AsyncMock(return_value=result)
        session.commit = AsyncMock()
        session.add = MagicMock()
        return session

    async def __aexit__(self, exc_type, exc, tb):
        return False


# Module-level singletons in escrow.py and api.py both reference
# AsyncSessionLocal; patch both so neither tries to open a real connection.
import database
database.AsyncSessionLocal = _MockAsyncSessionLocal()
escrow.AsyncSessionLocal = database.AsyncSessionLocal

import api  # noqa: E402
api.AsyncSessionLocal = database.AsyncSessionLocal


# /dispute requires AUDITOR. /psbt/trigger requires COMPANY or FARMER.
# SUPERADMIN bypasses the RoleChecker allow-list, so the tests use that
# single role across the suite for simplicity.
async def override_current_user():
    return CurrentUser(id="user-123", role="SUPERADMIN")


app.dependency_overrides[get_current_user_from_token] = override_current_user


@pytest.mark.asyncio
async def test_flag_dispute():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/escrow/dispute", params={"shipment_id": "ship-123"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DISPUTED"
    assert data["shipment_id"] == "ship-123"


@pytest.mark.asyncio
async def test_trigger_psbt_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/escrow/psbt/trigger",
            json={
                "shipment_id": "ship-456",
                "amount_usd": 100.0,
                "amount_btc": 0.002,
                "buyer_id": "user-123",
                "seller_id": "user-456",
                "buyer_pubkey": "pubkey1",
                "seller_pubkey": "pubkey2"
            }
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PSBT_FLOW_INITIATED"
    assert data["shipment_id"] == "ship-456"
    assert data["escrow_state"] == "pending_crypto"
