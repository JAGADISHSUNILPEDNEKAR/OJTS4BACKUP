from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class ShipmentBase(BaseModel):
    farmer_id: UUID
    destination: str

class ShipmentCreate(ShipmentBase):
    pass

class CustodyHandoff(BaseModel):
    custodian_id: UUID
    ecdsa_signature: str
    public_key: str

class CustodyEventResponse(BaseModel):
    id: UUID
    shipment_id: UUID
    previous_custodian_id: UUID
    new_custodian_id: UUID
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ShipmentResponse(ShipmentBase):
    id: UUID
    current_custodian_id: UUID
    status: str
    manifest_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenData(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[str] = None

class CurrentUser(BaseModel):
    id: str
    role: str
    organization_id: Optional[str] = None

