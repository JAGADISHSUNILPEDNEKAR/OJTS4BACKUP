import sys
from unittest.mock import MagicMock
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

import pytest
from httpx import AsyncClient
import uuid
import hmac
import hashlib
import json
from datetime import datetime
from fastapi import status

from main import app
from database import get_db

MOCK_DEVICE_ID = "device-123"
MOCK_SHIPMENT_ID = str(uuid.uuid4())

class MockSession:
    def add_all(self, *args, **kwargs):
        pass
    async def commit(self, *args, **kwargs):
        pass

async def override_get_db():
    yield MockSession()

app.dependency_overrides[get_db] = override_get_db

@pytest.mark.asyncio
async def test_ingest_telemetry_success():
    import httpx
    
    payload = {
        "readings": [
            {
                "time": datetime.utcnow().isoformat(),
                "device_id": MOCK_DEVICE_ID,
                "shipment_id": MOCK_SHIPMENT_ID,
                "temperature": -2.5,
                "humidity": 45.0,
                "tamper_flag": False
            }
        ]
    }
    # Notice FastAPI's json= parameter might serialize differently than simple json.dumps without separators
    # so we must match FastAPI's default exactly or it will fail HMAC.
    body_bytes = json.dumps(payload).encode('utf-8')
    signature = hmac.new(b"mock-device-secret", body_bytes, hashlib.sha256).hexdigest()

    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/iot/ingest",
            content=body_bytes,
            headers={"X-Device-Signature": signature, "Content-Type": "application/json"}
        )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "INGESTED"
    assert response.json()["count"] == 1

@pytest.mark.asyncio
async def test_ingest_telemetry_invalid_hmac():
    import httpx
    
    payload = {
        "readings": [
            {
                "time": datetime.utcnow().isoformat(),
                "device_id": MOCK_DEVICE_ID,
                "shipment_id": MOCK_SHIPMENT_ID,
                "temperature": -2.5,
                "humidity": 45.0,
                "tamper_flag": False
            }
        ]
    }
    body_bytes = json.dumps(payload).encode('utf-8')

    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/iot/ingest",
            content=body_bytes,
            headers={"X-Device-Signature": "invalid-signature", "Content-Type": "application/json"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
