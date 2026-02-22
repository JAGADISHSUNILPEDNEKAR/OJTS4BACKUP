import uuid
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from aiokafka import AIOKafkaProducer
from ecdsa import VerifyingKey, NIST256p, BadSignatureError

from database import engine, get_db, Base
from models import Shipment, CustodyEvent
from schemas import CustodyHandoff, ShipmentResponse
from core.dependencies import get_current_user_from_token, RoleChecker
from core.config import settings

app = FastAPI(title="Origin Shipment Service")

producer: AIOKafkaProducer = None

@app.on_event("startup")
async def startup_event():
    # Only for development structure creating - normally Alembic handles this.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    global producer
    producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    # Don't fail if Kafka is not running locally for the test
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

@app.post("/api/v1/shipments", response_model=ShipmentResponse)
async def create_shipment(
    farmer_id: str = Form(...), 
    destination: str = Form(...), 
    manifest: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(RoleChecker(["FARMER", "ADMIN"]))
):
    # Dummy ML pre-check
    if manifest.filename.endswith(".exe"):
        raise HTTPException(status_code=400, detail="Invalid manifest format")
    
    shipment_id = uuid.uuid4()
    s3_key = f"manifests/{shipment_id}/{manifest.filename}"
    
    # 2. Upload manifest to S3 (Mocked)
    
    # 3. Save to DB
    new_shipment = Shipment(
        id=shipment_id,
        farmer_id=uuid.UUID(farmer_id),
        current_custodian_id=uuid.UUID(farmer_id),
        destination=destination,
        status="CREATED",
        manifest_url=s3_key
    )
    db.add(new_shipment)
    await db.commit()
    await db.refresh(new_shipment)
    
    # 4. Publish Kafka event
    event = {
        "event": "shipment.created",
        "shipment_id": str(shipment_id),
        "farmer_id": farmer_id,
        "s3_key": s3_key
    }
    if producer:
        try:
            await producer.send_and_wait("shipment-events", event)
        except Exception as e:
            print(f"Failed to publish to Kafka: {e}")
            
    return new_shipment

@app.post("/api/v1/shipments/{shipment_id}/custody")
async def custody_handoff(
    shipment_id: str, 
    handoff: CustodyHandoff,
    db: AsyncSession = Depends(get_db)
):
    # 0. Fetch shipment
    result = await db.execute(select(Shipment).where(Shipment.id == uuid.UUID(shipment_id)))
    shipment = result.scalars().first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    previous_custodian_id = shipment.current_custodian_id

    # 1. ECDSA Signature Validation
    message = f"{shipment_id}:{str(handoff.custodian_id)}".encode('utf-8')
    try:
        vk = VerifyingKey.from_string(bytes.fromhex(handoff.public_key), curve=NIST256p)
        vk.verify(bytes.fromhex(handoff.ecdsa_signature), message)
    except (BadSignatureError, ValueError) as e:
        raise HTTPException(status_code=400, detail="Invalid ECDSA signature")
        
    # 2. Save custody event to DB
    new_event = CustodyEvent(
        shipment_id=shipment.id,
        previous_custodian_id=previous_custodian_id,
        new_custodian_id=handoff.custodian_id,
        ecdsa_signature=handoff.ecdsa_signature,
        public_key=handoff.public_key
    )
    
    shipment.current_custodian_id = handoff.custodian_id
    shipment.status = "IN_TRANSIT"
    
    db.add(new_event)
    db.add(shipment)
    await db.commit()
    
    # 3. Publish to Kafka
    event = {
        "event": "custody.handoff",
        "shipment_id": str(shipment.id),
        "previous_custodian_id": str(previous_custodian_id),
        "new_custodian_id": str(handoff.custodian_id)
    }
    if producer:
        try:
            await producer.send_and_wait("shipment-events", event)
        except Exception as e:
            print(f"Failed to publish to Kafka: {e}")
    
    return {"status": "HANDOFF_VERIFIED", "shipment_id": str(shipment.id)}
