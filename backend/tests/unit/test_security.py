import pytest
import time
from fastapi import HTTPException
from app.core.security import hash_password, verify_password, create_jwt, decode_jwt


def test_hash_password_returns_bcrypt_string():
    hashed = hash_password("mypassword")
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")


def test_verify_password_correct():
    plain = "mypassword"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correct")
    assert verify_password("wrong", hashed) is False


def test_create_jwt_contains_required_claims():
    payload = {"sub": "user-id-123", "role": "admin", "session_id": "sess-456"}
    token = create_jwt(payload, expire_hours=8)
    decoded = decode_jwt(token)
    assert decoded["sub"] == "user-id-123"
    assert decoded["role"] == "admin"
    assert decoded["session_id"] == "sess-456"
    assert "exp" in decoded


def test_decode_jwt_raises_401_on_tampered_token():
    payload = {"sub": "user-id", "role": "submitter", "session_id": "sess-1"}
    token = create_jwt(payload, expire_hours=1)
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(HTTPException) as exc_info:
        decode_jwt(tampered)
    assert exc_info.value.status_code == 401


def test_decode_jwt_raises_401_on_expired_token():
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone
    from app.core.config import settings

    payload = {
        "sub": "user-id",
        "role": "submitter",
        "session_id": "sess-2",
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        "iat": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc_info:
        decode_jwt(expired_token)
    assert exc_info.value.status_code == 401
