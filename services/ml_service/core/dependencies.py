from fastapi import Header, HTTPException, status
from core.config import settings

async def verify_internal_key(x_internal_key: str = Header(...)):
    """
    Dependency to verify that the request is coming from another internal service.
    """
    if x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate internal service credentials"
        )
    return x_internal_key
