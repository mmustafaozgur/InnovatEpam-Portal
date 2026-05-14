from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    return list(result.scalars().all())


async def update_profile(db: AsyncSession, user_id: str, full_name: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    user.full_name = full_name.strip()
    await db.commit()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession, user_id: str, current_password: str, new_password: str
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.hashed_password = hash_password(new_password)
    await db.commit()


async def promote_user(db: AsyncSession, target_id: str, actor_id: str) -> User:
    if actor_id == target_id:
        raise HTTPException(status_code=400, detail="You cannot promote yourself.")

    result = await db.execute(select(User).where(User.id == target_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.role == "admin":
        raise HTTPException(status_code=400, detail="User is already an Admin.")

    target.role = "admin"
    await db.commit()
    await db.refresh(target)
    return target
