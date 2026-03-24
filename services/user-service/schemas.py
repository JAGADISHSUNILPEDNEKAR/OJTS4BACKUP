from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    role: Optional[str] = "USER"
    is_active: Optional[bool] = True
    preferences: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    organization_id: Optional[UUID] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    preferences: Optional[Dict[str, Any]] = None

class UserResponse(UserBase):
    id: UUID
    organization_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenData(BaseModel):
    id: Optional[UUID] = None
    email: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[UUID] = None
