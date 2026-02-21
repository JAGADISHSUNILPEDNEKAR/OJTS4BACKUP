from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
import json
# from kafka import KafkaProducer

app = FastAPI(title="Origin User Service")

# Kafka Producer setup (mocked for now)
# producer = KafkaProducer(bootstrap_servers=['kafka:9092'],
#                          value_serializer=lambda v: json.dumps(v).encode('utf-8'))

class UserProfile(BaseModel):
    email: str
    role: str
    is_active: bool

class KYCSubmitRequest(BaseModel):
    user_id: str
    document_url: str

@app.get("/api/v1/users/me", response_model=UserProfile)
async def get_my_profile():
    # RBAC enforcement and profile fetch mocked here
    return {"email": "user@origin.app", "role": "USER", "is_active": True}

@app.post("/api/v1/users/kyc")
async def submit_kyc(request: KYCSubmitRequest):
    # Process KYC document
    # Publish kyc.submitted event
    event_payload = {
        "event": "kyc.submitted",
        "user_id": request.user_id,
        "document_url": request.document_url,
        "status": "PENDING"
    }
    # producer.send('kyc-events', event_payload)
    return {"message": "KYC submitted successfully", "event_dispatched": True}
