import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.user import Base, User
from app.models.session import Session  # noqa: F401
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services import auth_service


@pytest_asyncio.fixture(scope="function")
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


def _reg(full_name="Alice", email="alice@epam.com", password="password123", accepted=True):
    return RegisterRequest(
        full_name=full_name,
        email=email,
        password=password,
        privacy_policy_accepted=accepted,
    )


# ── Registration ────────────────────────────────────────────────

async def test_register_first_user_is_admin(db):
    user = await auth_service.register(db, _reg())
    assert user.role == "admin"


async def test_register_second_user_is_submitter(db):
    await auth_service.register(db, _reg())
    user2 = await auth_service.register(db, _reg(full_name="Bob", email="bob@epam.com"))
    assert user2.role == "submitter"


async def test_register_duplicate_email_raises_409(db):
    await auth_service.register(db, _reg())
    with pytest.raises(HTTPException) as exc:
        await auth_service.register(db, _reg())
    assert exc.value.status_code == 409


async def test_register_privacy_policy_false_raises_400(db):
    with pytest.raises(HTTPException) as exc:
        await auth_service.register(db, _reg(accepted=False))
    assert exc.value.status_code == 400


async def test_register_short_password_raises_422(db):
    with pytest.raises(Exception):
        _reg(password="short")


# ── Login ────────────────────────────────────────────────────────

async def test_login_valid_credentials(db):
    await auth_service.register(db, _reg())
    user, session = await auth_service.login(
        db, LoginRequest(email="alice@epam.com", password="password123")
    )
    assert user.email == "alice@epam.com"
    assert session.user_id == user.id


async def test_login_unknown_email_raises_401(db):
    with pytest.raises(HTTPException) as exc:
        await auth_service.login(
            db, LoginRequest(email="unknown@epam.com", password="password123")
        )
    assert exc.value.status_code == 401


async def test_login_wrong_password_raises_401(db):
    await auth_service.register(db, _reg())
    with pytest.raises(HTTPException) as exc:
        await auth_service.login(
            db, LoginRequest(email="alice@epam.com", password="wrongpass")
        )
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials."


# ── Logout ───────────────────────────────────────────────────────

async def test_logout_deletes_session(db):
    await auth_service.register(db, _reg())
    _, session = await auth_service.login(
        db, LoginRequest(email="alice@epam.com", password="password123")
    )
    await auth_service.logout(db, session.token)
    from sqlalchemy import select
    result = await db.execute(select(Session).where(Session.id == session.id))
    assert result.scalar_one_or_none() is None


async def test_logout_nonexistent_token_raises_401(db):
    with pytest.raises(HTTPException) as exc:
        await auth_service.logout(db, "nonexistent-token")
    assert exc.value.status_code == 401


# ── reset_password ───────────────────────────────────────────────

def _reset(email="alice@epam.com", new_password="newpass99"):
    from app.schemas.auth import ResetPasswordRequest
    return ResetPasswordRequest(email=email, new_password=new_password)


async def test_reset_password_updates_hash(db):
    user = await auth_service.register(db, _reg())
    old_hash = user.hashed_password
    await auth_service.reset_password(db, _reset())
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == "alice@epam.com"))
    updated = result.scalar_one()
    assert updated.hashed_password != old_hash


async def test_reset_password_unknown_email_raises_404(db):
    with pytest.raises(HTTPException) as exc:
        await auth_service.reset_password(db, _reset(email="nobody@epam.com"))
    assert exc.value.status_code == 404


async def test_reset_password_short_password_raises_422(db):
    with pytest.raises(Exception):
        _reset(new_password="short")
