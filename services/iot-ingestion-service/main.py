from fastapi import FastAPI, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
import hmac
import hashlib
from typing import List
from datetime import datetime
from aiokafka import AIOKafkaProducer

from database import engine, get_db, Base
from models import SensorReading
from schemas import BulkTelemetryUpload
from core.config import settings

app = FastAPI(title="Origin IoT Ingestion Service")
logging.basicConfig(level=logging.INFO)

producer: AIOKafkaProducer = None

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    global producer
    producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    try:
        await producer.start()
    except Exception as e:
        print(f"Warning: Kafka could not connect. {e}")

@app.on_event("shutdown")
async def shutdown_event():
    global producer
    if producer:
        try:
            await producer.stop()
        except Exception:
            pass

async def verify_hmac(request: Request):
    signature = request.headers.get("X-Device-Signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature")
    body = await request.body()
    # Mock hardcoded device secret
    expected = hmac.new(b"mock-device-secret", body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
         raise HTTPException(status_code=401, detail="Invalid HMAC signature")
    return True

@app.post("/api/v1/iot/ingest", dependencies=[Depends(verify_hmac)])
async def ingest_telemetry(payload: BulkTelemetryUpload, db: AsyncSession = Depends(get_db)):
    # 1. Bulk insert into TimescaleDB via SQLAlchemy
    instances = [
        SensorReading(
            time=r.time,
            device_id=r.device_id,
            shipment_id=r.shipment_id,
            temperature=r.temperature,
            humidity=r.humidity,
            tamper_flag=r.tamper_flag
        ) for r in payload.readings
    ]
    db.add_all(instances)
    await db.commit()
    
    # 2. Publish Kafka events
    if producer:
        for reading in payload.readings:
            event = {
                "event": "sensor.ingested",
                "device_id": reading.device_id,
                "shipment_id": str(reading.shipment_id),
                "timestamp": reading.time.isoformat()
            }
            try:
                await producer.send_and_wait("iot-events", event)
            except Exception as e:
                print(f"Failed to publish to Kafka: {e}")
        
    return {"status": "INGESTED", "count": len(payload.readings)}
