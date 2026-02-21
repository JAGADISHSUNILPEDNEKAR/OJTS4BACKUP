from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
import jwt
import redis
from datetime import datetime, timedelta

app = FastAPI(title="Origin Auth Service")

# Mock Redis connection for account lockout
# redis_client = redis.Redis(host='redis', port=6379, db=0)

class LoginRequest(BaseModel):
    email: str
    password: str
    totp_code: str | None = None

@app.post("/api/v1/auth/login")
async def login(request: LoginRequest):
    # Dummy implementation for Auth Service execution
    # 1. Check account lockout
    # if redis_client.get(f"lockout:{request.email}"):
    #     raise HTTPException(status_code=403, detail="Account locked")
    
    # 2. Verify credentials vs DB (mocked)
    if request.password != "password": 
        # redis_client.incr(f"attempts:{request.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 3. Generate JWT RS256 (Mocked using HS256 and hardcoded secret for now, in prod fetch from Vault)
    payload = {
        "sub": "mock-user-uuid",
        "role": "USER",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    encoded_jwt = jwt.encode(payload, "dummy-secret-from-vault", algorithm="HS256")
    
    return {"access_token": encoded_jwt, "token_type": "bearer"}

@app.post("/api/v1/auth/sso")
async def sso_login():
    return {"message": "SSO not fully implemented yet"}
