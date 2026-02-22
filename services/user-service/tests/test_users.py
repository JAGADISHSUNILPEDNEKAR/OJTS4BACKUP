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
from schemas import UserResponse
from core.dependencies import get_current_user_from_token, RoleChecker

MOCK_USER_ID = uuid.uuid4()

class MockResult:
    def __init__(self, user):
        self.user = user
    def scalars(self):
        class Scalars:
            def first(self_inner):
                return self.user
        return Scalars()

class MockSession:
    async def execute(self, query, *args, **kwargs):
        from datetime import datetime, timezone
        user = User(
            id=MOCK_USER_ID,
            email="admin@origin.app",
            role="ADMIN",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        return MockResult(user)

async def override_get_db():
    yield MockSession()

async def override_get_current_user():
    from datetime import datetime, timezone
    return User(
        id=MOCK_USER_ID,
        email="admin@origin.app",
        role="ADMIN",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_from_token] = override_get_current_user
# We must also override RoleChecker for the test
app.dependency_overrides[RoleChecker] = lambda roles: override_get_current_user

@pytest.mark.asyncio
async def test_get_my_profile():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/users/me")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["email"] == "admin@origin.app"

@pytest.mark.asyncio
async def test_get_user_by_id_admin_access():
    import httpx
    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/users/{MOCK_USER_ID}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["role"] == "ADMIN"
