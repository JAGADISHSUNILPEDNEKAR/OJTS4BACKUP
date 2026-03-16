import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml-service"}

def test_inference_engine():
    from models.inference import inference_engine
    inference_engine.load()
    assert inference_engine.ready
    score = inference_engine.predict({"mean_temp": 10.0})
    assert 0.8 <= score <= 1.0
    
    score_normal = inference_engine.predict({"mean_temp": 4.0})
    assert 0.01 <= score_normal <= 0.1
