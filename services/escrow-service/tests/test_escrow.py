import pytest
from httpx import AsyncClient, ASGITransport
from main import app

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
        response = await ac.post("/api/v1/escrow/psbt/trigger", params={"shipment_id": "ship-456"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PSBT_FLOW_INITIATED"
    assert data["shipment_id"] == "ship-456"
