import sys
from unittest.mock import MagicMock
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

import pytest
from httpx import AsyncClient
import uuid
from fastapi import status
from ecdsa import SigningKey, NIST256p
import io

from main import app
from database import get_db
from models import Shipment

MOCK_SHIPMENT_ID = uuid.uuid4()
MOCK_FARMER_ID = uuid.uuid4()

sk = SigningKey.generate(curve=NIST256p)
vk = sk.verifying_key
public_key_hex = vk.to_string().hex()

class MockResult:
    def __init__(self, shipment):
        self.shipment = shipment
    def scalars(self):
        class Scalars:
            def first(self_inner):
                return self.shipment
        return Scalars()

class MockSession:
    def add(self, *args, **kwargs):
        pass
    async def commit(self, *args, **kwargs):
        pass
    async def refresh(self, obj, *args, **kwargs):
        obj.id = uuid.uuid4()
        obj.current_custodian_id = MOCK_FARMER_ID
        obj.status = "CREATED"
        from datetime import datetime
        obj.created_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()
    async def execute(self, *args, **kwargs):
        shipment = Shipment(
            id=MOCK_SHIPMENT_ID,
            farmer_id=MOCK_FARMER_ID,
            current_custodian_id=MOCK_FARMER_ID,
            destination="Hub A",
            status="CREATED",
            manifest_url="manifests/abc/def.pdf"
        )
        return MockResult(shipment)

async def override_get_db():
    yield MockSession()

app.dependency_overrides[get_db] = override_get_db

@pytest.mark.asyncio
async def test_create_shipment():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        file_obj = io.BytesIO(b"dummy pdf content")
        file_obj.name = "manifest.pdf"
        response = await ac.post(
            "/api/v1/shipments",
            data={
                "farmer_id": str(MOCK_FARMER_ID),
                "destination": "Hub A"
            },
            files={"manifest": ("manifest.pdf", file_obj, "application/pdf")}
        )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "CREATED"

@pytest.mark.asyncio
async def test_custody_handoff_success():
    import httpx
    new_custodian_id = uuid.uuid4()
    message = f"{MOCK_SHIPMENT_ID}:{str(new_custodian_id)}".encode('utf-8')
    signature_hex = sk.sign(message).hex()
    
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/shipments/{MOCK_SHIPMENT_ID}/custody",
            json={
                "custodian_id": str(new_custodian_id),
                "ecdsa_signature": signature_hex,
                "public_key": public_key_hex
            }
        )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "HANDOFF_VERIFIED"
