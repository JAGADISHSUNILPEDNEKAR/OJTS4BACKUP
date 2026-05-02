import asyncio
import logging
import random
from pydantic import BaseModel
from fastapi import FastAPI, Depends
from core.config import settings
from core.kafka import start_kafka_producer, stop_kafka_producer, consume_events
from core.dependencies import verify_internal_key
from models.inference import inference_engine

logger = logging.getLogger("ml-service")

app = FastAPI(title="Origin ML Service")

consumer_task = None

class PrecheckRequest(BaseModel):
    filename: str
    content_type: str
    destination: str

class PrecheckResponse(BaseModel):
    risk_score: float
    status: str
    insights: dict

@app.on_event("startup")
async def startup_event():
    # Refuse to start in production with the committed dev secret. /precheck
    # accepts callers that present this key, so leaving the default in prod
    # is equivalent to publishing the gate (because we did, in this repo).
    if settings.REQUIRE_INTERNAL_API_KEY and settings.INTERNAL_API_KEY == "dev-secret-key":
        raise RuntimeError(
            "REQUIRE_INTERNAL_API_KEY=true but INTERNAL_API_KEY is the committed "
            "dev default. Set INTERNAL_API_KEY to a real secret in your env."
        )

    logger.info("Initializing ML Service...")
    # Load pyTorch models
    inference_engine.load()
    # Start Kakfa components
    await start_kafka_producer()
    global consumer_task
    consumer_task = asyncio.create_task(consume_events())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down ML Service...")
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await stop_kafka_producer()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ml-service"}

@app.post("/api/v1/ml/precheck", response_model=PrecheckResponse)
async def ml_precheck(
    request: PrecheckRequest,
    internal_key: str = Depends(verify_internal_key)
):
    risk_score = inference_engine.predict_precheck(request.filename, request.destination)
    
    status = "REJECTED" if risk_score >= 80.0 else "APPROVED"
    insights = {
        "model": "precheck_v2_rules",
        "destination_flag": any(c.lower() in request.destination.lower() for c in inference_engine.precheck_model.high_risk_countries),
        "filename_flag": any(kw in request.filename.lower() for kw in inference_engine.precheck_model.high_risk_keywords)
    }
    
    return PrecheckResponse(risk_score=risk_score, status=status, insights=insights)
