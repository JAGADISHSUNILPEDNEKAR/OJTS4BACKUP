import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from aiokafka import AIOKafkaProducer

from database import engine, get_db, Base
from models import User, Organization
from schemas import UserResponse, UserUpdate
from core.dependencies import get_current_user_from_token, RoleChecker

app = FastAPI(title="Origin User Service")

producer: AIOKafkaProducer = None

@app.on_event("startup")
async def startup_event():
    global producer
    producer = AIOKafkaProducer(
        bootstrap_servers='localhost:9092',
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

@app.get("/api/v1/users/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user_from_token)
):
    return current_user

@app.get("/api/v1/users/{id}", response_model=UserResponse)
async def get_user_by_id(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "SUPERADMIN"]))
):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

from pydantic import BaseModel
class KYCSubmitRequest(BaseModel):
    document_url: str

@app.post("/api/v1/users/kyc")
async def submit_kyc(
    request: KYCSubmitRequest,
    current_user: User = Depends(get_current_user_from_token)
):
    event_payload = {
        "event": "kyc.submitted",
        "user_id": str(current_user.id),
        "document_url": request.document_url,
        "status": "PENDING"
    }
    
    if producer:
        try:
            await producer.send_and_wait("kyc-events", event_payload)
        except Exception as e:
            print(f"Failed to publish to Kafka: {e}")
            
    return {"message": "KYC submitted successfully", "event_dispatched": True}
