import uuid
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from aiokafka import AIOKafkaProducer
from ecdsa import VerifyingKey, NIST256p, BadSignatureError

from database import engine, get_db, AsyncSessionLocal, Base
from models import Shipment, CustodyEvent
from schemas import CustodyHandoff, ShipmentResponse, CurrentUser, EscrowInitRequest
from core.dependencies import get_current_user_from_token, RoleChecker, UserRole
from core.config import settings
from core.s3_utils import upload_to_s3
from core.pdf_generator import generate_shipment_proof

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

async def get_db_with_rls(
    current_user: CurrentUser = Depends(get_current_user_from_token)
):
    """
    Dependency that yields a database session with the app.current_user_id 
    session variable set for PostgreSQL RLS.
    """
    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        # Set the session-level variable for RLS
        await session.execute(
            text("SELECT set_config('app.current_user_id', :user_id, true)"),
            {"user_id": str(current_user.id)}
        )
        yield session

import httpx

@app.post("/api/v1/shipments", response_model=ShipmentResponse)
async def create_shipment(
    farmer_id: str = Form(...), 
    destination: str = Form(...), 
    manifest: UploadFile = File(...),
    current_user: CurrentUser = Depends(RoleChecker([UserRole.FARMER, UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db_with_rls),
):
    # 1. Real ML pre-check via HTTP
    risk_score = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.ML_SERVICE_URL}/api/v1/ml/precheck",
                json={
                    "filename": manifest.filename,
                    "content_type": manifest.content_type or "application/octet-stream",
                    "destination": destination
                },
                headers={"X-Internal-Key": settings.INTERNAL_API_KEY}
            )
            resp.raise_for_status()
            precheck_result = resp.json()
            risk_score = precheck_result.get("risk_score")
            if precheck_result.get("status") == "REJECTED":
                raise HTTPException(status_code=400, detail=f"Shipment rejected by ML precheck. Risk Score: {risk_score}")
    except httpx.RequestError as e:
        print(f"ML Service Precheck request failed: {e}")

    shipment_id = uuid.uuid4()
    s3_key = f"manifests/{shipment_id}/{manifest.filename}"
    
    # 2. Upload manifest to S3
    try:
        file_content = await manifest.read()
        await asyncio.to_thread(upload_to_s3, file_content, settings.S3_BUCKET_NAME, s3_key)
    except Exception as e:
        print(f"Failed to upload to S3: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload manifest to storage")
    
    # 3. Save to DB
    new_shipment = Shipment(
        id=shipment_id,
        farmer_id=uuid.UUID(farmer_id),
        current_custodian_id=uuid.UUID(farmer_id),
        destination=destination,
        status="CREATED",
        risk_score=risk_score,
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
    current_user: CurrentUser = Depends(RoleChecker([UserRole.LOGISTICS, UserRole.FARMER])),
    db: AsyncSession = Depends(get_db_with_rls)
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

@app.get("/api/v1/shipments/{shipment_id}/proof/pdf", response_class=Response)
async def download_proof_pdf(
    shipment_id: str,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.AUDITOR, UserRole.FARMER, UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db_with_rls)
):
    result = await db.execute(
        select(Shipment)
        .options(selectinload(Shipment.custody_events))
        .where(Shipment.id == uuid.UUID(shipment_id))
    )
    shipment = result.scalars().first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    pdf_bytes = generate_shipment_proof(shipment, shipment.custody_events)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=shipment_{shipment_id}_proof.pdf"}
    )

@app.get("/api/v1/shipments/{shipment_id}/risk")
async def get_shipment_risk(
    shipment_id: str,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.AUDITOR, UserRole.GOVERNMENT, UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db_with_rls)
):
    result = await db.execute(select(Shipment).where(Shipment.id == uuid.UUID(shipment_id)))
    shipment = result.scalars().first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    risk_score = getattr(shipment, "risk_score", None)
    
    if risk_score is None:
        risk_level = "UNKNOWN"
        insights = ["No ML precheck score available for this shipment."]
    elif risk_score >= 75.0:
        risk_level = "HIGH"
        insights = ["High anomaly detected. Further investigation recommended."]
    elif risk_score >= 40.0:
        risk_level = "MEDIUM"
        insights = ["Moderate risk flagged in initial assessment."]
    else:
        risk_level = "LOW"
        insights = ["Shipment cleared initial ML risk assessment."]
        
    return {
        "shipment_id": str(shipment.id),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "insights": insights
    }

@app.get("/api/v1/shipments", response_model=list[ShipmentResponse])
async def list_shipments(
    current_user: CurrentUser = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db_with_rls)
):
    # Auth: any authenticated user. RLS (set on the session via get_db_with_rls)
    # restricts the result set to rows the caller is allowed to see.
    result = await db.execute(select(Shipment))
    return result.scalars().all()

@app.post("/api/v1/shipments/{shipment_id}/escrow/init")
async def init_escrow(
    shipment_id: str,
    request: EscrowInitRequest,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.FARMER, UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db_with_rls)
):
    result = await db.execute(select(Shipment).where(Shipment.id == uuid.UUID(shipment_id)))
    shipment = result.scalars().first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment.status = "ESCROW_PENDING"
    db.add(shipment)
    await db.commit()
    
    # Matching the PSBTTriggerRequest expected by escrow-service and crypto-service
    event = {
        "shipment_id": str(shipment.id),
        "amount_usd": request.amount_usd,
        "amount_btc": request.amount_btc,
        "buyer_id": request.buyer_id,
        "seller_id": str(shipment.farmer_id),
        "buyer_pubkey": request.buyer_pubkey,
        "seller_pubkey": request.seller_pubkey,
        "required_signatures": 2,
        "status": "ESCROW_PENDING"
    }
    
    if producer:
        try:
            # We publish to escrow.psbt.request which both escrow and crypto services can see
            await producer.send_and_wait("escrow.psbt.request", event)
        except Exception as e:
            print(f"Failed to publish to Kafka: {e}")
            
    return {"status": "ESCROW_INITIATED", "shipment_id": str(shipment.id)}

@app.get("/api/v1/shipments/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: str,
    current_user: CurrentUser = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db_with_rls)
):
    # Auth: any authenticated user. RLS prevents cross-tenant access; the row
    # simply won't be found if the caller isn't permitted to see it.
    result = await db.execute(select(Shipment).where(Shipment.id == uuid.UUID(shipment_id)))
    shipment = result.scalars().first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment
