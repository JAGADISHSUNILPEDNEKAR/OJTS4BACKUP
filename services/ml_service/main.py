import asyncio
import logging
from fastapi import FastAPI
from core.kafka import start_kafka_producer, stop_kafka_producer, consume_events
from models.inference import inference_engine

logger = logging.getLogger("ml-service")

app = FastAPI(title="Origin ML Service")

consumer_task = None

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
