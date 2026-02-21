from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from typing import List

from .config import settings
from schemas import TokenData, CurrentUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user_from_token(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
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

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: CurrentUser = Depends(get_current_user_from_token)):
        if user.role not in self.allowed_roles:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN,
                 detail="Operation not permitted"
             )
        return user
