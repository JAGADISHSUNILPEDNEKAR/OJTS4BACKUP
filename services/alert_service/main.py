import asyncio
import logging
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from core.kafka import start_kafka_producer, stop_kafka_producer, consume_ml_results, get_recent_alerts
from core.database import engine, Base, AsyncSessionLocal
from models import AlertThreshold
from sqlalchemy.future import select

logger = logging.getLogger("alert-service")

app = FastAPI(title="Origin Alert Service")

class Alert(BaseModel):
    shipment_id: str
    score: float
    severity: str
    timestamp: str

consumer_task = None

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Alert Service...")
    
    # Create DB structures and seed defaults
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AlertThreshold))
        existing_thresholds = result.scalars().all()
        if not existing_thresholds:
            session.add_all([
                AlertThreshold(severity="WARNING", threshold_value=0.8, is_active=True),
                AlertThreshold(severity="CRITICAL", threshold_value=0.9, is_active=True)
            ])
            await session.commit()
            
    await start_kafka_producer()
    global consumer_task
    consumer_task = asyncio.create_task(consume_ml_results())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Alert Service...")
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await stop_kafka_producer()

@app.get("/api/v1/alerts", response_model=List[Alert])
async def get_alerts_api():
    return get_recent_alerts()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "alert-service"}
