import sys
from unittest.mock import MagicMock
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

import pytest
from httpx import AsyncClient, ASGITransport
import uuid
from fastapi import status

from main import app
from database import get_db

from models import User
from core.security import get_password_hash, create_access_token, create_refresh_token

# Mock user data
MOCK_USER_ID = uuid.uuid4()
MOCK_PASSWORD = "secure_password"
MOCK_HASHED_PASSWORD = get_password_hash(MOCK_PASSWORD)

class MockResult:
    def __init__(self, user):
        self.user = user
    def scalars(self):
        class Scalars:
            def first(self_inner):
                return self.user
        return Scalars()

class MockSession:
    """MockSession that returns a pre-configured user for execute() calls."""
    def __init__(self, user=None):
        self._user = user

    async def execute(self, *args, **kwargs):
        return MockResult(self._user)

    def add(self, *args, **kwargs):
        pass

    async def commit(self, *args, **kwargs):
        pass

    async def refresh(self, obj, *args, **kwargs):
        if not hasattr(obj, 'id') or obj.id is None:
            obj.id = uuid.uuid4()
        from datetime import datetime
        obj.created_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()

# ── Dependency overrides ──────────────────────────────────────────
_mock_user = User(
    id=MOCK_USER_ID,
    email="test@origin.app",
    password_hash=MOCK_HASHED_PASSWORD,
    role="USER",
    is_active=True
)

async def override_get_db_with_user():
    yield MockSession(user=_mock_user)

async def override_get_db_no_user():
    yield MockSession(user=None)


# ══════════════════════════════════════════════════════════════════
#  LOGIN TESTS
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_login_success():
    app.dependency_overrides[get_db] = override_get_db_with_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@origin.app", "password": MOCK_PASSWORD}
        )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_login_wrong_password():
    app.dependency_overrides[get_db] = override_get_db_with_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@origin.app", "password": "wrongpassword"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_login_user_not_found():
    app.dependency_overrides[get_db] = override_get_db_no_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "nobody@origin.app", "password": "anypassword"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════
#  REGISTRATION TESTS
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_register_success():
    app.dependency_overrides[get_db] = override_get_db_no_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={"email": "newuser@origin.app", "password": "secure123"}
        )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_register_duplicate_email():
    app.dependency_overrides[get_db] = override_get_db_with_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={"email": "test@origin.app", "password": "anypassword"}
        )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"]
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════
#  REFRESH TOKEN TESTS
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_refresh_token_success():
    app.dependency_overrides[get_db] = override_get_db_with_user
    # Create a valid refresh token
    refresh = create_refresh_token(subject=str(MOCK_USER_ID))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh}
        )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_refresh_token_invalid():
    app.dependency_overrides[get_db] = override_get_db_with_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_refresh_with_access_token_rejected():
    """An access token should not work as a refresh token."""
    app.dependency_overrides[get_db] = override_get_db_with_user
    access = create_access_token(subject=str(MOCK_USER_ID), role="USER", org_id=None)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════
#  TOTP TESTS
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_login_totp_required_when_enabled():
    """If the user has totp_secret set, login without code should fail."""
    import pyotp
    totp_user = User(
        id=uuid.uuid4(),
        email="totp@origin.app",
        password_hash=get_password_hash("totppass"),
        role="USER",
        is_active=True,
        totp_secret=pyotp.random_base32()
    )

    async def db_with_totp():
        yield MockSession(user=totp_user)

    app.dependency_overrides[get_db] = db_with_totp
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "totp@origin.app", "password": "totppass"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "TOTP code required" in response.json()["detail"]
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_login_totp_valid_code():
    """Login with correct TOTP code should succeed."""
    import pyotp
    secret = pyotp.random_base32()
    totp_user = User(
        id=uuid.uuid4(),
        email="totp@origin.app",
        password_hash=get_password_hash("totppass"),
        role="USER",
        is_active=True,
        totp_secret=secret
    )
    valid_code = pyotp.TOTP(secret).now()

    async def db_with_totp():
        yield MockSession(user=totp_user)

    app.dependency_overrides[get_db] = db_with_totp
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "totp@origin.app", "password": "totppass", "totp_code": valid_code}
        )
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    app.dependency_overrides.clear()
