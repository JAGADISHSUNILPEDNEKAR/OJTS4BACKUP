import asyncio
import logging
import random
from pydantic import BaseModel
from fastapi import FastAPI
from core.kafka import start_kafka_producer, stop_kafka_producer, consume_events
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
async def ml_precheck(request: PrecheckRequest):
    if request.filename.endswith(('.exe', '.dll', '.sh', '.bat')):
        return PrecheckResponse(risk_score=99.9, status="REJECTED", insights={"reason": "Executable file extension detected (High Risk)"})
    
    base_risk = 15.0
    if request.destination.lower() in ["sanctioned_port_a", "high_risk_zone_b"]:
        base_risk += 50.0
        
    random_noise = random.uniform(0.0, 5.0)
    risk_score = min(100.0, base_risk + random_noise)
    
    status = "REJECTED" if risk_score >= 85.0 else "APPROVED"
    return PrecheckResponse(risk_score=risk_score, status=status, insights={"model": "precheck_v1"})
