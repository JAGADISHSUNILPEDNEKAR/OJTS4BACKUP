import sys
from unittest.mock import MagicMock
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

import pytest
from httpx import AsyncClient
import uuid
from fastapi import status

from main import app
from database import get_db

from models import User
from core.security import get_password_hash

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
    async def execute(self, *args, **kwargs):
        user = User(
            id=MOCK_USER_ID,
            email="test@origin.app",
            password_hash=MOCK_HASHED_PASSWORD,
            role="USER",
            is_active=True
        )
        return MockResult(user)

async def override_get_db():
    yield MockSession()

app.dependency_overrides[get_db] = override_get_db

@pytest.mark.asyncio
async def test_login_success():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@origin.app", "password": MOCK_PASSWORD}
        )
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "test@origin.app", "password": "wrongpassword"}
        )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
