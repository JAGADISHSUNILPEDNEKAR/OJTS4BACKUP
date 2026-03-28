from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from typing import List

from core.config import settings
from schemas import TokenData, CurrentUser
from database import AsyncSessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Comprehensive Role List
class UserRole:
    SUPERADMIN = "SUPERADMIN"
    COMPANY = "COMPANY"
    AUDITOR = "AUDITOR"
    FARMER = "FARMER"
    LOGISTICS = "LOGISTICS"
    RETAILER = "RETAILER"
    GOVERNMENT = "GOVERNMENT"
    USER = "USER"

async def get_current_user_from_token(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        # RS256 using Auth Service's Public Key
        payload = jwt.decode(
            token, settings.PUBLIC_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(
            id=payload.get("sub"),
            role=payload.get("role"),
            organization_id=payload.get("org_id")
        )
    except (jwt.PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return CurrentUser(
        id=token_data.id,
        role=token_data.role,
        organization_id=token_data.organization_id
    )

async def get_db_with_rls(
    current_user: CurrentUser = Depends(get_current_user_from_token)
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

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: CurrentUser = Depends(get_current_user_from_token)):
        if user.role not in self.allowed_roles and user.role != UserRole.SUPERADMIN:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN,
                 detail=f"Operation not permitted for role: {user.role}"
             )
        return user
