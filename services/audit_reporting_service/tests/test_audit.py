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
from core.dependencies import get_current_user_from_token, get_db_with_rls
from database import get_db
from models import AuditLog
from schemas import CurrentUser
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

async def override_get_db_with_rls():
    yield MockSession()

async def override_current_user():
    return CurrentUser(id=str(uuid.uuid4()), role="ADMIN")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_db_with_rls] = override_get_db_with_rls
app.dependency_overrides[get_current_user_from_token] = override_current_user

@pytest.mark.asyncio
async def test_generate_pdf_proof():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/reports/shipment/{MOCK_SHIPMENT_ID}/proof")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 0
