import sys
from unittest.mock import MagicMock, AsyncMock

# Mock out dependencies that require real connections
sys.modules['aiokafka'] = MagicMock()

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from core.dependencies import get_current_user_from_token
from schemas import CurrentUser
import uuid

# Mock the kafka producer to avoid connection errors during tests
import escrow
escrow.publish_message = AsyncMock()

async def override_current_user():
    return CurrentUser(id="user-123", role="ADMIN")

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
