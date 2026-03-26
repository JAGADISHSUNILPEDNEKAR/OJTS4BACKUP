import sys
from unittest.mock import MagicMock
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()
sys.modules['boto3'] = MagicMock()

import pytest
from httpx import AsyncClient
import uuid
from fastapi import status
from ecdsa import SigningKey, NIST256p
import io

from main import app, get_db_with_rls
from database import get_db
from models import Shipment
from core.dependencies import get_current_user_from_token
from schemas import CurrentUser

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
            def all(self_inner):
                return [self.shipment]
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
        # Handle RLS set_config calls
        if "set_config" in str(args[0]):
            return None
            
        shipment = Shipment(
            id=MOCK_SHIPMENT_ID,
            farmer_id=MOCK_FARMER_ID,
            current_custodian_id=MOCK_FARMER_ID,
            destination="Hub A",
            status="CREATED",
            manifest_url="manifests/abc/def.pdf"
        )
        return MockResult(shipment)
    async def close(self):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

async def override_get_db():
    yield MockSession()

async def override_get_db_with_rls():
    yield MockSession()

async def override_current_user():
    return CurrentUser(id=str(MOCK_FARMER_ID), role="FARMER", organization_id=str(uuid.uuid4()))

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_db_with_rls] = override_get_db_with_rls
app.dependency_overrides[get_current_user_from_token] = override_current_user

# Patch the upload_to_s3 function during tests
from unittest.mock import patch
patcher = patch('main.upload_to_s3', return_value=True)
patcher.start()


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
    if response.status_code != status.HTTP_200_OK:
        print(f"DEBUG: 422 Response Body: {response.text}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "HANDOFF_VERIFIED"

@pytest.mark.asyncio
async def test_init_escrow_success():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/shipments/{MOCK_SHIPMENT_ID}/escrow/init",
            json={
                "buyer_id": str(uuid.uuid4()),
                "buyer_pubkey": "0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352",
                "seller_pubkey": "03b01a1c93a9d4a6f23f5b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b",
                "amount_usd": 500.0,
                "amount_btc": 0.005
            }
        )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ESCROW_INITIATED"
