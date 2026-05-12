import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.user import Base, User
from app.models.session import Session  # noqa: F401
from app.core.security import hash_password, create_jwt
from app.core.config import settings
from app.database import get_db
from main import app


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_db(test_engine):
    SessionLocal = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def async_client(test_engine):
    SessionLocal = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        follow_redirects=True,
    ) as client:
        yield client
    app.dependency_overrides.clear()


async def create_test_user(db: AsyncSession, role: str = "submitter", email: str | None = None) -> User:
    user = User(
        id=str(uuid.uuid4()),
        full_name="Test User",
        email=email or f"test-{uuid.uuid4()}@epam.com",
        hashed_password=hash_password("password123"),
        role=role,
        privacy_policy_accepted=1,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticated_client(
    client: AsyncClient, db: AsyncSession, user: User
) -> AsyncClient:
    session_id = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_TTL_HOURS)
    token = create_jwt(
        {"sub": user.id, "role": user.role, "session_id": session_id},
        expire_hours=settings.SESSION_TTL_HOURS,
    )
    session = Session(
        id=session_id,
        user_id=user.id,
        token=token,
        expiry_time=expiry.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    db.add(session)
    await db.commit()
    client.cookies.set(settings.COOKIE_NAME, token)
    return client
