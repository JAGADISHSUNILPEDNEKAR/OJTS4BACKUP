import sys
from unittest.mock import MagicMock

# Mock out dependencies that might require a real database or message broker connection
sys.modules['aiokafka'] = MagicMock()
sys.modules['boto3'] = MagicMock()

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import datetime

from main import app
from database import get_db
from models import AuditLog
from reporting import s3_client

MOCK_SHIPMENT_ID = "shp_12345"
MOCK_PRESIGNED_URL = f"https://s3.amazonaws.com/test-bucket/{MOCK_SHIPMENT_ID}_proof.pdf"

s3_client.generate_presigned_url.return_value = MOCK_PRESIGNED_URL

class MockResult:
    def __init__(self, logs):
        self.logs = logs
    def scalars(self):
        class Scalars:
            def all(self_inner):
                return self.logs
        return Scalars()

class MockSession:
    async def execute(self, query, *args, **kwargs):
        logs = [
            AuditLog(
                id=uuid.uuid4(),
                topic="shipment.created",
                payload={"shipment_id": MOCK_SHIPMENT_ID, "status": "created"},
                recorded_at=datetime.utcnow()
            ),
            AuditLog(
                id=uuid.uuid4(),
                topic="ml.inference.completed",
                payload={"shipment_id": MOCK_SHIPMENT_ID, "score": 0.99},
                recorded_at=datetime.utcnow()
            ),
            AuditLog(
                id=uuid.uuid4(),
                topic="bitcoin.anchored",
                payload={"shipment_id": MOCK_SHIPMENT_ID, "txid": "abc123def456", "merkle_root": "0xroot"},
                recorded_at=datetime.utcnow()
            )
        ]
        return MockResult(logs)

async def override_get_db():
    yield MockSession()

app.dependency_overrides[get_db] = override_get_db

@pytest.mark.asyncio
async def test_generate_pdf_proof():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/reports/shipment/{MOCK_SHIPMENT_ID}/proof")
    
    assert response.status_code == 200
    data = response.json()
    assert "proof_url" in data
    assert MOCK_SHIPMENT_ID in data["proof_url"]
    assert "pdf" in data["proof_url"]
