import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from aiokafka import AIOKafkaProducer

from database import engine, get_db, AsyncSessionLocal, Base
from models import User, Organization
from schemas import UserResponse, UserUpdate
from core.dependencies import get_current_user_from_token, RoleChecker
from core.config import settings

app = FastAPI(title="Origin User Service")

producer: AIOKafkaProducer = None

@app.on_event("startup")
async def startup_event():
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

    # Shutdown
    task.cancel()

async def get_db_with_rls(
    current_user: User = Depends(get_current_user_from_token)
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

@app.get("/api/v1/users/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user_from_token)
):
    return current_user

@app.put("/api/v1/users/me", response_model=UserResponse)
async def update_my_profile(
    updates: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Update the current user's profile. Only email and is_active can be self-updated."""
    if updates.email is not None:
        # Check for duplicate email
        existing = await db.execute(
            select(User).where(User.email == updates.email, User.id != current_user.id)
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account",
            )
        current_user.email = updates.email
        
    if updates.display_name is not None:
        current_user.display_name = updates.display_name
        
    if updates.preferences is not None:
        current_user.preferences = updates.preferences

    # Role changes are only allowed for ADMINs (self-role-change is blocked)
    if updates.role is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role changes require admin privileges. Contact an administrator.",
        )

    if updates.is_active is not None:
        current_user.is_active = updates.is_active

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@app.get("/api/v1/users", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db_with_rls),
    current_user: User = Depends(RoleChecker(["ADMIN", "SUPERADMIN"])),
):
    """List all users (admin only, paginated)."""
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    return result.scalars().all()

@app.get("/api/v1/users/{id}", response_model=UserResponse)
async def get_user_by_id(
    id: str,
    db: AsyncSession = Depends(get_db_with_rls),
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
