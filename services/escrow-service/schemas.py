from pydantic import BaseModel
from typing import Optional

class CurrentUser(BaseModel):
    id: str
    role: str
    organization_id: Optional[str] = None

class TokenData(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[str] = None
