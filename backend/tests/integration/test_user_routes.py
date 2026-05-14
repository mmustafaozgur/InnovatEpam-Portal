import pytest
import pytest_asyncio

from tests.conftest import create_test_user, authenticated_client as make_auth_client

USERS_URL = "/api/v1/users"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"


@pytest_asyncio.fixture
async def admin_client(async_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    from app.core.security import hash_password
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        admin = await create_test_user(db, role="admin", email="admin@epam.com")
        client = await make_auth_client(async_client, db, admin)
    return client


@pytest_asyncio.fixture
async def submitter_client(async_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        sub = await create_test_user(db, role="submitter", email="sub@epam.com")
        await make_auth_client(async_client, db, sub)
    return async_client


async def test_list_users_returns_200_for_admin(admin_client):
    res = await admin_client.get(USERS_URL)
    assert res.status_code == 200
    assert "users" in res.json()


async def test_list_users_returns_403_for_submitter(submitter_client):
    res = await submitter_client.get(USERS_URL)
    assert res.status_code == 403


async def test_list_users_returns_401_for_unauthenticated(async_client):
    async_client.cookies.clear()
    res = await async_client.get(USERS_URL)
    assert res.status_code == 401


async def test_promote_user_returns_200_for_valid_target(admin_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        target = await create_test_user(db, role="submitter", email="promote_me@epam.com")
    res = await admin_client.patch(f"{USERS_URL}/{target.id}/promote")
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


async def test_promote_already_admin_returns_400(admin_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        target = await create_test_user(db, role="admin", email="already_admin@epam.com")
    res = await admin_client.patch(f"{USERS_URL}/{target.id}/promote")
    assert res.status_code == 400


async def test_promote_self_returns_400(admin_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    from sqlalchemy import select
    from app.models.user import User
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@epam.com"))
        admin = result.scalar_one()
    res = await admin_client.patch(f"{USERS_URL}/{admin.id}/promote")
    assert res.status_code == 400


async def test_promote_unknown_user_returns_404(admin_client):
    res = await admin_client.patch(f"{USERS_URL}/nonexistent-id/promote")
    assert res.status_code == 404


async def test_promote_by_submitter_returns_403(submitter_client, test_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as db:
        target = await create_test_user(db, role="submitter", email="target2@epam.com")
    res = await submitter_client.patch(f"{USERS_URL}/{target.id}/promote")
    assert res.status_code == 403


ME_URL = "/api/v1/users/me"
CHANGE_PW_URL = "/api/v1/users/me/change-password"


# --- PATCH /users/me tests ---

async def test_patch_me_returns_200_with_updated_name(admin_client):
    res = await admin_client.patch(ME_URL, json={"full_name": "Updated Name"})
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Name"


async def test_patch_me_returns_401_for_unauthenticated(async_client):
    async_client.cookies.clear()
    res = await async_client.patch(ME_URL, json={"full_name": "Test"})
    assert res.status_code == 401


async def test_patch_me_returns_422_for_empty_name(admin_client):
    res = await admin_client.patch(ME_URL, json={"full_name": "   "})
    assert res.status_code == 422


# --- POST /users/me/change-password tests ---

async def test_change_password_returns_200(admin_client):
    res = await admin_client.post(
        CHANGE_PW_URL,
        json={"current_password": "password123", "new_password": "newpass99"},
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Password changed successfully."


async def test_change_password_wrong_current_returns_400(admin_client):
    res = await admin_client.post(
        CHANGE_PW_URL,
        json={"current_password": "wrongpass", "new_password": "newpass99"},
    )
    assert res.status_code == 400


async def test_change_password_returns_401_for_unauthenticated(async_client):
    async_client.cookies.clear()
    res = await async_client.post(
        CHANGE_PW_URL,
        json={"current_password": "password123", "new_password": "newpass99"},
    )
    assert res.status_code == 401


async def test_change_password_short_new_returns_422(admin_client):
    res = await admin_client.post(
        CHANGE_PW_URL,
        json={"current_password": "password123", "new_password": "short"},
    )
    assert res.status_code == 422
