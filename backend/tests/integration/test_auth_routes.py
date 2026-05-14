import pytest
import pytest_asyncio

from tests.conftest import create_test_user, authenticated_client


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"

VALID_REG = {
    "full_name": "Alice Smith",
    "email": "alice@epam.com",
    "password": "password123",
    "privacy_policy_accepted": True,
}


# ── Register ────────────────────────────────────────────────────

async def test_register_returns_201_and_sets_cookie(async_client):
    res = await async_client.post(REGISTER_URL, json=VALID_REG)
    assert res.status_code == 201
    assert "access_token" in res.cookies or "set-cookie" in res.headers


async def test_register_first_user_is_admin(async_client):
    res = await async_client.post(REGISTER_URL, json=VALID_REG)
    assert res.status_code == 201
    assert res.json()["role"] == "admin"


async def test_register_second_user_is_submitter(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    res = await async_client.post(
        REGISTER_URL,
        json={**VALID_REG, "email": "bob@epam.com", "full_name": "Bob"},
    )
    assert res.status_code == 201
    assert res.json()["role"] == "submitter"


async def test_register_privacy_false_returns_400(async_client):
    res = await async_client.post(
        REGISTER_URL, json={**VALID_REG, "privacy_policy_accepted": False}
    )
    assert res.status_code == 400


async def test_register_duplicate_email_returns_409(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    res = await async_client.post(REGISTER_URL, json=VALID_REG)
    assert res.status_code == 409


async def test_register_invalid_email_returns_422(async_client):
    res = await async_client.post(
        REGISTER_URL, json={**VALID_REG, "email": "not-an-email"}
    )
    assert res.status_code == 422


async def test_register_short_password_returns_422(async_client):
    res = await async_client.post(
        REGISTER_URL, json={**VALID_REG, "password": "short"}
    )
    assert res.status_code == 422


async def test_register_missing_full_name_returns_422(async_client):
    payload = {k: v for k, v in VALID_REG.items() if k != "full_name"}
    res = await async_client.post(REGISTER_URL, json=payload)
    assert res.status_code == 422


# ── Login ────────────────────────────────────────────────────────

async def test_login_valid_credentials_returns_200_and_cookie(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    async_client.cookies.clear()
    res = await async_client.post(
        LOGIN_URL, json={"email": "alice@epam.com", "password": "password123"}
    )
    assert res.status_code == 200
    assert "access_token" in res.cookies or "set-cookie" in res.headers


async def test_login_wrong_password_returns_401(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    async_client.cookies.clear()
    res = await async_client.post(
        LOGIN_URL, json={"email": "alice@epam.com", "password": "wrongpass"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials."


async def test_login_unknown_email_returns_401(async_client):
    res = await async_client.post(
        LOGIN_URL, json={"email": "nobody@epam.com", "password": "password123"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials."


# ── Logout ───────────────────────────────────────────────────────

async def test_logout_returns_200_and_clears_cookie(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    res = await async_client.post(LOGOUT_URL)
    assert res.status_code == 200
    set_cookie = res.headers.get("set-cookie", "")
    assert "Max-Age=0" in set_cookie or "max-age=0" in set_cookie


async def test_logout_deletes_session_row(async_client, test_engine):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    await async_client.post(LOGOUT_URL)
    from sqlalchemy import select
    from app.models.session import Session
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        result = await session.execute(select(Session))
        assert result.scalar_one_or_none() is None


# ── /me ──────────────────────────────────────────────────────────

async def test_me_returns_user_for_valid_cookie(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    res = await async_client.get(ME_URL)
    assert res.status_code == 200
    assert res.json()["email"] == "alice@epam.com"


async def test_me_returns_401_for_missing_cookie(async_client):
    async_client.cookies.clear()
    res = await async_client.get(ME_URL)
    assert res.status_code == 401


RESET_URL = "/api/v1/auth/reset-password"


# ── /auth/reset-password ─────────────────────────────────────────

async def test_reset_password_returns_200_for_known_email(async_client):
    await async_client.post(REGISTER_URL, json=VALID_REG)
    res = await async_client.post(
        RESET_URL, json={"email": "alice@epam.com", "new_password": "newpass99"}
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Password reset successfully."


async def test_reset_password_unknown_email_returns_404(async_client):
    res = await async_client.post(
        RESET_URL, json={"email": "nobody@epam.com", "new_password": "newpass99"}
    )
    assert res.status_code == 404


async def test_reset_password_short_password_returns_422(async_client):
    res = await async_client.post(
        RESET_URL, json={"email": "alice@epam.com", "new_password": "short"}
    )
    assert res.status_code == 422


async def test_me_returns_401_and_deletes_expired_session(async_client, test_engine):
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select, update
    from app.models.session import Session
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    await async_client.post(REGISTER_URL, json=VALID_REG)

    SessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    async with SessionLocal() as session:
        await session.execute(update(Session).values(expiry_time=past))
        await session.commit()

    res = await async_client.get(ME_URL)
    assert res.status_code == 401

    async with SessionLocal() as session:
        result = await session.execute(select(Session))
        assert result.scalar_one_or_none() is None
