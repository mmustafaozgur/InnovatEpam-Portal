from datetime import datetime, timedelta, timezone
import jwt as pyjwt
from passlib.context import CryptContext
from fastapi import HTTPException

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_jwt(payload: dict, expire_hours: int) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(hours=expire_hours)
    data.setdefault("iat", datetime.now(timezone.utc))
    return pyjwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return pyjwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Not authenticated.")
