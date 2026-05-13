from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    return list(result.scalars().all())


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
