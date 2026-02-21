from fastapi import FastAPI, Depends, HTTPException, status, Request
from pydantic import BaseModel
import json
import logging
import hmac
import hashlib
from typing import List
from datetime import datetime
# import asyncpg
# from kafka import KafkaProducer

app = FastAPI(title="Origin IoT Ingestion Service")
logging.basicConfig(level=logging.INFO)

# producer = KafkaProducer(bootstrap_servers=['kafka:9092'],
#                          value_serializer=lambda v: json.dumps(v).encode('utf-8'))

class TelemetryReading(BaseModel):
    time: datetime
    device_id: str
    shipment_id: str
    temperature: float
    humidity: float
    tamper_flag: bool

class BulkTelemetryUpload(BaseModel):
    readings: List[TelemetryReading]

async def verify_hmac(request: Request):
    # Dummy HMAC validation
    signature = request.headers.get("X-Device-Signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature")
    body = await request.body()
    # Mock hardcoded device secret
    expected = hmac.new(b"mock-device-secret", body, hashlib.sha256).hexdigest()
    # if not hmac.compare_digest(signature, expected):
    #     raise HTTPException(status_code=401, detail="Invalid HMAC signature")
    return True

@app.post("/api/v1/iot/ingest", dependencies=[Depends(verify_hmac)])
async def ingest_telemetry(payload: BulkTelemetryUpload):
    # 1. Bulk insert into TimescaleDB
    # conn = await asyncpg.connect(dsn="postgresql://user:pass@db:5432/origin")
    # records = [(r.time, r.device_id, r.shipment_id, r.temperature, r.humidity, r.tamper_flag) for r in payload.readings]
    # await conn.copy_records_to_table('sensor_readings', records=records)
    # await conn.close()
    
    # 2. Publish Kafka events
    for reading in payload.readings:
        event = {
            "event": "sensor.ingested",
            "device_id": reading.device_id,
            "shipment_id": reading.shipment_id,
            "timestamp": reading.time.isoformat()
        }
        # producer.send('iot-events', event)
        
    return {"status": "INGESTED", "count": len(payload.readings)}
