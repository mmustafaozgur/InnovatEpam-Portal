from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import anyio
from fastapi import HTTPException, UploadFile
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.idea import Idea
from app.models.user import User
from app.schemas.ideas import (
    FileInfo,
    IdeaDetailResponse,
    IdeaListResponse,
    IdeaSummaryResponse,
)

_VALID_CATEGORIES = {"process_improvement", "technology", "cost_saving", "other"}
_ACCEPTED_MIME = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
}
_ACCEPTED_EXT = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
_MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_file(file: UploadFile) -> None:
    """Validate MIME type, extension, and size. Raises HTTPException(400) on violation."""
    if file.content_type not in _ACCEPTED_MIME:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, PNG, and JPG files are accepted.",
        )
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ACCEPTED_EXT:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, PNG, and JPG files are accepted.",
        )
    if file.size is not None and file.size > _MAX_SIZE:
        raise HTTPException(status_code=400, detail="File must be 10 MB or smaller.")


async def save_file(idea_id: str, dest: Path, data: bytes) -> None:
    """Write bytes to dest path, creating parent dirs as needed."""
    await anyio.to_thread.run_sync(lambda: _write_bytes(dest, data))


def _write_bytes(dest: Path, data: bytes) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


async def create_idea(
    db: AsyncSession,
    current_user: User,
    title: str,
    description: str,
    category: str,
    file: Optional[UploadFile] = None,
) -> IdeaDetailResponse:
    if not title:
        raise ValueError("title is required")
    if not description:
        raise ValueError("description is required")
    if not category:
        raise ValueError("category is required")
    if category not in _VALID_CATEGORIES:
        raise ValueError(f"category must be one of {_VALID_CATEGORIES}")

    idea_id = str(uuid.uuid4())

    # Handle optional file attachment
    attachment_filename: Optional[str] = None
    attachment_stored_name: Optional[str] = None
    attachment_mime_type: Optional[str] = None
    attachment_size: Optional[int] = None
    file_info: Optional[FileInfo] = None

    if file is not None:
        data = await file.read()
        # Re-validate size from actual bytes (UploadFile.size may not be set)
        if len(data) > _MAX_SIZE:
            raise HTTPException(status_code=400, detail="File must be 10 MB or smaller.")
        ext = Path(file.filename or "").suffix.lower()
        stored_name = f"{uuid.uuid4()}{ext}"
        dest = settings.upload_path(idea_id, stored_name)
        await save_file(idea_id, dest, data)

        attachment_filename = file.filename
        attachment_stored_name = stored_name
        attachment_mime_type = file.content_type
        attachment_size = len(data)
        file_info = FileInfo(
            name=file.filename or stored_name,
            size=len(data),
            mime_type=file.content_type or "",
        )

    idea = Idea(
        id=idea_id,
        title=title,
        description=description,
        category=category,
        submitter_id=current_user.id,
        submitted_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        attachment_filename=attachment_filename,
        attachment_stored_name=attachment_stored_name,
        attachment_mime_type=attachment_mime_type,
        attachment_size=attachment_size,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)

    return IdeaDetailResponse(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        submitter_id=idea.submitter_id,
        submitter_name=current_user.full_name,
        submitted_at=idea.submitted_at,
        file=file_info,
    )


async def list_ideas(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    submitter_id_filter: Optional[str] = None,
) -> IdeaListResponse:
    offset = (page - 1) * limit

    base_count_q = select(func.count()).select_from(Idea)
    base_list_q = (
        select(Idea, User.full_name.label("submitter_name"))
        .join(User, User.id == Idea.submitter_id)
    )
    if submitter_id_filter is not None:
        base_count_q = base_count_q.where(Idea.submitter_id == submitter_id_filter)
        base_list_q = base_list_q.where(Idea.submitter_id == submitter_id_filter)

    total_result = await db.execute(base_count_q)
    total = total_result.scalar_one()

    result = await db.execute(
        base_list_q
        .order_by(Idea.submitted_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    ideas = [
        IdeaSummaryResponse(
            id=row.Idea.id,
            title=row.Idea.title,
            category=row.Idea.category,
            submitter_name=row.submitter_name,
            submitted_at=row.Idea.submitted_at,
            has_attachment=row.Idea.attachment_stored_name is not None,
        )
        for row in rows
    ]

    return IdeaListResponse(ideas=ideas, total=total, page=page, limit=limit)


async def get_idea(db: AsyncSession, idea_id: str) -> IdeaDetailResponse:
    result = await db.execute(
        select(Idea, User.full_name.label("submitter_name"))
        .join(User, User.id == Idea.submitter_id)
        .where(Idea.id == idea_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Idea not found.")

    idea = row.Idea
    file_info: Optional[FileInfo] = None
    if idea.attachment_stored_name is not None:
        file_info = FileInfo(
            name=idea.attachment_filename or idea.attachment_stored_name,
            size=idea.attachment_size or 0,
            mime_type=idea.attachment_mime_type or "",
        )

    return IdeaDetailResponse(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        submitter_id=idea.submitter_id,
        submitter_name=row.submitter_name,
        submitted_at=idea.submitted_at,
        file=file_info,
    )
