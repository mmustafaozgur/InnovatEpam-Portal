import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_jwt
from app.models.session import Session
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, ResetPasswordRequest


async def register(db: AsyncSession, data: RegisterRequest) -> User:
    if not data.privacy_policy_accepted:
        raise HTTPException(status_code=400, detail="Privacy Policy must be accepted to register.")

    email = data.email.lower()

    result = await db.execute(select(func.count()).select_from(User).where(User.email == email))
    if result.scalar_one() > 0:
        raise HTTPException(status_code=409, detail="Email already registered.")

    result = await db.execute(select(func.count()).select_from(User))
    user_count = result.scalar_one()
    role = "admin" if user_count == 0 else "submitter"

    user = User(
        id=str(uuid.uuid4()),
        full_name=data.full_name,
        email=email,
        hashed_password=hash_password(data.password),
        role=role,
        privacy_policy_accepted=1,
    )
    db.add(user)
    await db.flush()

    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_TTL_HOURS)
    session_id = str(uuid.uuid4())
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
    await db.refresh(user)
    return user


async def login(db: AsyncSession, data: LoginRequest) -> tuple[User, Session]:
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

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
    await db.refresh(session)
    return user, session


async def reset_password(db: AsyncSession, data: ResetPasswordRequest) -> None:
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="No account found with that email address.")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()


async def logout(db: AsyncSession, token: str) -> None:
    result = await db.execute(select(Session).where(Session.token == token))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    await db.execute(delete(Session).where(Session.token == token))
    await db.commit()
