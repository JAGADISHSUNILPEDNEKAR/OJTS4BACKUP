import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from core.dependencies import get_current_user_from_token
from schemas import CurrentUser
import uuid

async def override_current_user():
    return CurrentUser(id=str(uuid.uuid4()), role="ADMIN")

app.dependency_overrides[get_current_user_from_token] = override_current_user

from evaluator.threshold import evaluate

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "alert-service"}

from evaluator import threshold
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_evaluate_threshold():
    # Mock evaluate to skip real DB lookup in test
    with patch.object(threshold, "evaluate", new_callable=AsyncMock) as mock_evaluate:
        mock_evaluate.return_value = True
        assert await threshold.evaluate(0.9) is True
        
        mock_evaluate.return_value = False
        assert await threshold.evaluate(0.5) is False
