import pytest
from httpx import AsyncClient, ASGITransport
from services.alert_service.main import app
from services.alert_service.evaluator.threshold import evaluate

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "alert-service"}

@pytest.mark.asyncio
async def test_evaluate_threshold():
    assert await evaluate(0.9) is True
    assert await evaluate(0.5) is False
