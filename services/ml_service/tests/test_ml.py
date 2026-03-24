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
    score = inference_engine.predict({"mean_temp": 15.0, "mean_humidity": 90.0})
    assert score > 0.5
    
    score_normal = inference_engine.predict({"mean_temp": 4.0, "mean_humidity": 60.0})
    assert score_normal < 0.3
