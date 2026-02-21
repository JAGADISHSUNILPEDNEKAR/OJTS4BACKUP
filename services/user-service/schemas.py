from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    role: Optional[str] = "USER"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    organization_id: Optional[UUID] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

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
