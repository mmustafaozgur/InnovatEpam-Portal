from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse, UsersListResponse
from app.schemas.users import ChangePasswordRequest, UpdateProfileRequest
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


def _require_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.update_profile(db, current_user.id, data.full_name)


@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await user_service.change_password(
        db, current_user.id, data.current_password, data.new_password
    )
    return {"message": "Password changed successfully."}


@router.get("", response_model=UsersListResponse)
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    users = await user_service.list_users(db)
    return UsersListResponse(users=users)


@router.patch("/{user_id}/promote", response_model=UserResponse)
async def promote_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)
    return await user_service.promote_user(db, target_id=user_id, actor_id=current_user.id)
