from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = settings.SESSION_TTL_HOURS * 3600


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=_COOKIE_MAX_AGE,
    )


def _clear_auth_cookie(response: Response) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value="",
        httponly=True,
        samesite="lax",
        path="/",
        max_age=0,
    )


@router.post("/register", status_code=201, response_model=UserResponse)
async def register(
    data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await auth_service.register(db, data)
    from sqlalchemy import select
    from app.models.session import Session
    result = await db.execute(select(Session).where(Session.user_id == user.id))
    session = result.scalar_one()
    _set_auth_cookie(response, session.token)
    return user


@router.post("/login", response_model=UserResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user, session = await auth_service.login(db, data)
    _set_auth_cookie(response, session.token)
    return user


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get(settings.COOKIE_NAME, "")
    await auth_service.logout(db, token)
    _clear_auth_cookie(response)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
