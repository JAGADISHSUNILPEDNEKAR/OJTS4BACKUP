import uuid
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import engine, Base, get_db
from models import User
from schemas import LoginRequest, Token
from core.security import verify_password, create_access_token
from core.config import settings

app = FastAPI(title="Origin Auth Service")

@app.on_event("startup")
async def startup_event():
    # Only for development structure creating - normally Alembic handles this.
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.create_all)
        pass

@app.post("/api/v1/auth/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fetch user from DB
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Generate JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        org_id=str(user.organization_id) if user.organization_id else None,
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/v1/auth/sso")
async def sso_login():
    return {"message": "SSO not fully implemented yet"}
