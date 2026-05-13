from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_jwt
from app.database import get_db
from app.models.session import Session
from app.models.user import User

_401 = HTTPException(status_code=401, detail="Not authenticated.")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise _401

    payload = decode_jwt(token)
    session_id = payload.get("session_id")
    if not session_id:
        raise _401

    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise _401

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if session.expiry_time <= now_iso:
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.commit()
        raise _401

    result = await db.execute(select(User).where(User.id == session.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise _401

    user.role = payload["role"]
    return user
