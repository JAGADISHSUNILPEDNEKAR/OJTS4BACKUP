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
    assert score_normal < 0.45

@pytest.mark.asyncio
async def test_ml_precheck_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # High-risk case
        resp = await ac.post("/api/v1/ml/precheck", json={
            "filename": "malicious.sh",
            "content_type": "text/x-shellscript",
            "destination": "Somalia"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "REJECTED"
        assert resp.json()["risk_score"] > 80.0
        assert resp.json()["insights"]["destination_flag"] is True
        
        # Low-risk case
        resp = await ac.post("/api/v1/ml/precheck", json={
            "filename": "invoice.pdf",
            "content_type": "application/pdf",
            "destination": "USA"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "APPROVED"
        assert resp.json()["risk_score"] < 40.0
