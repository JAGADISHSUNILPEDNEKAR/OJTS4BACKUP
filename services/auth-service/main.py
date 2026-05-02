import uuid
import json
from datetime import timedelta
from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, Depends, HTTPException, status, Request
from starlette.middleware.sessions import SessionMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import engine, Base, get_db
from models import User
from schemas import LoginRequest, RegisterRequest, RefreshRequest, Token
from core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, verify_totp,
)
from core.config import settings

app = FastAPI(title="Origin Auth Service")
# Authlib needs a session middleware for OAuth2 state
app.add_middleware(SessionMiddleware, secret_key=settings.PRIVATE_KEY)

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url=settings.GOOGLE_CONF_URL,
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# ── Redis connection (lazy init, graceful fallback) ───────────────
_redis = None

async def get_redis():
    global _redis
    try:
        if _redis is not None:
            await _redis.ping()
            return _redis
    except Exception:
        # Connection is stale (e.g. event loop closed), drop it
        _redis = None

    try:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True
        )
        await _redis.ping()
    except Exception as e:
        print(f"Warning: Redis not available ({e}). Lockout disabled.")
        _redis = None
    return _redis


@app.on_event("startup")
async def startup_event():
    # Load keys from Vault if available
    if await settings.load_vault_keys():
         print("Successfully loaded JWT signing keys from Vault.")
    elif settings.REQUIRE_VAULT_KEYS:
        # Fail loudly. Signing JWTs with the repo's dev keys in production
        # is equivalent to giving every reader of the repo admin tokens.
        raise RuntimeError(
            "REQUIRE_VAULT_KEYS=true but Vault did not return JWT keys. "
            "Refusing to start with the hardcoded dev keys. "
            "Check VAULT_ADDR / VAULT_TOKEN and the secret at "
            "secret/data/origin/auth-service/jwt_keys."
        )
    else:
         print("Using default hardcoded JWT signing keys (DEV ONLY).")

    # Auto-create tables in dev (Alembic handles this in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Lockout Helpers ───────────────────────────────────────────────
async def _check_lockout(email: str):
    """Raise 429 if the account is currently locked out."""
    r = await get_redis()
    if r is None:
        return
    lockout_key = f"lockout:{email}"
    if await r.exists(lockout_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked. Try again in {settings.LOCKOUT_DURATION_MINUTES} minutes.",
        )


async def _record_failed_attempt(email: str):
    """Increment failed-login counter; lock account if threshold exceeded."""
    r = await get_redis()
    if r is None:
        return
    counter_key = f"login_attempts:{email}"
    attempts = await r.incr(counter_key)
    # First attempt → set a TTL so counter auto-expires
    if attempts == 1:
        await r.expire(counter_key, settings.LOCKOUT_DURATION_MINUTES * 60)
    if attempts >= settings.MAX_LOGIN_ATTEMPTS:
        lockout_key = f"lockout:{email}"
        await r.setex(lockout_key, settings.LOCKOUT_DURATION_MINUTES * 60, "1")
        await r.delete(counter_key)


async def _clear_failed_attempts(email: str):
    """Reset the counter on successful login."""
    r = await get_redis()
    if r is None:
        return
    await r.delete(f"login_attempts:{email}")


# ── Token Blacklist (for logout) ──────────────────────────────────
async def _blacklist_token(token: str, ttl: int = 60 * 60 * 24 * 7):
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"blacklist:{token}", ttl, "1")


async def _is_token_blacklisted(token: str) -> bool:
    r = await get_redis()
    if r is None:
        return False
    return await r.exists(f"blacklist:{token}")


# ══════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.post("/api/v1/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user and return JWT tokens."""
    # Check for duplicate email
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role or "USER",
        organization_id=request.organization_id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(
        subject=str(new_user.id),
        role=new_user.role,
        org_id=str(new_user.organization_id) if new_user.organization_id else None,
    )
    refresh_token = create_refresh_token(subject=str(new_user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/api/v1/auth/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user, verify optional TOTP, return JWT tokens."""
    # 1. Lockout check
    await _check_lockout(request.email)

    # 2. Fetch user
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()

    if not user or not verify_password(request.password, user.password_hash):
        await _record_failed_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 3. TOTP verification (if the user has it enabled)
    if user.totp_secret:
        if not request.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="TOTP code required",
            )
        if not verify_totp(user.totp_secret, request.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code",
            )

    # 4. Successful login – clear failed attempts
    await _clear_failed_attempts(request.email)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        org_id=str(user.organization_id) if user.organization_id else None,
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/api/v1/auth/refresh", response_model=Token)
async def refresh_token(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    if await _is_token_blacklisted(request.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    payload = decode_token(request.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Blacklist old refresh token (rotation)
    await _blacklist_token(request.refresh_token)

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        org_id=str(user.organization_id) if user.organization_id else None,
    )
    new_refresh = create_refresh_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@app.post("/api/v1/auth/logout")
async def logout(token: str = Depends(
    __import__("fastapi.security", fromlist=["OAuth2PasswordBearer"])
    .OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
)):
    """Blacklist the current access token."""
    await _blacklist_token(token)
    return {"message": "Successfully logged out"}


@app.get("/api/v1/auth/google/login")
async def google_login(request: Request):
    """Redirect to Google for authentication."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/api/v1/auth/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle the Google OAuth2 callback."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    
    try:
        # Use httpx client explicitly if needed, but Authlib handles it
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")
    
    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to retrieve user info from Google")
    
    email = user_info.get('email')
    name = user_info.get('name')
    
    # 1. Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if not user:
        # Create user if doesn't exist (default to USER role)
        user = User(
            id=uuid.uuid4(),
            email=email,
            display_name=name,
            password_hash="SSO_MANAGED", 
            role="USER",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # 2. Generate tokens
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        org_id=str(user.organization_id) if user.organization_id else None
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
