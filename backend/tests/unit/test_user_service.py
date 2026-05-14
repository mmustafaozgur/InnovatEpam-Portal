import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.user import Base, User
from app.models.session import Session  # noqa: F401
from app.services import user_service
from app.core.security import hash_password
import uuid


@pytest_asyncio.fixture(scope="function")
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


async def _make_user(db: AsyncSession, role: str = "submitter", email: str | None = None) -> User:
    user = User(
        id=str(uuid.uuid4()),
        full_name="Test User",
        email=email or f"user-{uuid.uuid4()}@epam.com",
        hashed_password=hash_password("password123"),
        role=role,
        privacy_policy_accepted=1,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def test_list_users_returns_all_ordered_by_created_at(db):
    u1 = await _make_user(db, role="admin", email="first@epam.com")
    u2 = await _make_user(db, email="second@epam.com")
    users = await user_service.list_users(db)
    assert len(users) == 2
    assert users[0].id == u1.id


async def test_promote_user_updates_role_to_admin(db):
    admin = await _make_user(db, role="admin")
    target = await _make_user(db, role="submitter")
    updated = await user_service.promote_user(db, target_id=target.id, actor_id=admin.id)
    assert updated.role == "admin"


async def test_promote_user_raises_400_if_already_admin(db):
    admin = await _make_user(db, role="admin")
    other_admin = await _make_user(db, role="admin", email="other@epam.com")
    with pytest.raises(HTTPException) as exc:
        await user_service.promote_user(db, target_id=other_admin.id, actor_id=admin.id)
    assert exc.value.status_code == 400


async def test_promote_user_raises_400_for_self_promotion(db):
    admin = await _make_user(db, role="admin")
    target = await _make_user(db, role="submitter")
    with pytest.raises(HTTPException) as exc:
        await user_service.promote_user(db, target_id=target.id, actor_id=target.id)
    assert exc.value.status_code == 400


async def test_promote_user_raises_404_if_not_found(db):
    admin = await _make_user(db, role="admin")
    with pytest.raises(HTTPException) as exc:
        await user_service.promote_user(db, target_id="nonexistent-id", actor_id=admin.id)
    assert exc.value.status_code == 404


# --- update_profile tests ---

async def test_update_profile_returns_updated_user(db):
    user = await _make_user(db)
    updated = await user_service.update_profile(db, user.id, "New Name")
    assert updated.full_name == "New Name"


async def test_update_profile_strips_whitespace(db):
    user = await _make_user(db)
    updated = await user_service.update_profile(db, user.id, "  Trimmed  ")
    assert updated.full_name == "Trimmed"


async def test_update_profile_empty_name_raises_422(db):
    user = await _make_user(db)
    with pytest.raises(Exception):
        from app.schemas.users import UpdateProfileRequest
        UpdateProfileRequest(full_name="   ")


# --- change_password tests ---

async def test_change_password_updates_hash(db):
    user = await _make_user(db)
    old_hash = user.hashed_password
    await user_service.change_password(db, user.id, "password123", "newpass99")
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user.id))
    refreshed = result.scalar_one()
    assert refreshed.hashed_password != old_hash


async def test_change_password_wrong_current_raises_400(db):
    user = await _make_user(db)
    with pytest.raises(HTTPException) as exc:
        await user_service.change_password(db, user.id, "wrongpass", "newpass99")
    assert exc.value.status_code == 400


async def test_change_password_short_new_password_raises_422(db):
    with pytest.raises(Exception):
        from app.schemas.users import ChangePasswordRequest
        ChangePasswordRequest(current_password="password123", new_password="short")
