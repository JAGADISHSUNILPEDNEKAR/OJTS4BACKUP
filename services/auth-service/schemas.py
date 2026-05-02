from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class UserBase(BaseModel):
    email: EmailStr
    role: Optional[Literal[
        "SUPERADMIN", "COMPANY", "AUDITOR", "FARMER", 
        "LOGISTICS", "RETAILER", "GOVERNMENT", "CONSUMER", "USER"
    ]] = "USER"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    organization_id: Optional[UUID] = None

class UserResponse(UserBase):
    id: UUID
    organization_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str

class TokenData(BaseModel):
    id: Optional[UUID] = None
    email: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[UUID] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    # SUPERADMIN intentionally excluded — must be provisioned out-of-band, not via public registration.
    role: Optional[Literal[
        "COMPANY", "AUDITOR", "FARMER",
        "LOGISTICS", "RETAILER", "GOVERNMENT", "CONSUMER", "USER"
    ]] = "USER"
    organization_id: Optional[UUID] = None

class RefreshRequest(BaseModel):
    refresh_token: str
