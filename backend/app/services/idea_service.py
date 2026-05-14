from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import anyio
from fastapi import HTTPException, UploadFile
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.attachment import Attachment
from app.models.idea import Idea
from app.models.user import User
from app.schemas.ideas import (
    AttachmentInfo,
    EvaluationInfo,
    EvaluationStatus,
    EvaluateIdeaRequest,
    IdeaDetailResponse,
    IdeaListResponse,
    IdeaSummaryResponse,
)

_VALID_CATEGORIES = {
    "process_improvement", "technology", "cost_saving",
    "talent_development", "client_delivery", "workplace_culture", "other",
}

_ACCEPTED_MIME: set[str] = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}

_ACCEPTED_EXT: set[str] = {
    ".png", ".jpg", ".jpeg", ".gif",
    ".pdf",
    ".mp4", ".mov",
    ".pptx", ".ppt",
    ".docx", ".doc",
}

_IMAGE_MIME: set[str] = {"image/png", "image/jpeg", "image/gif"}

MAX_FILES = 5
MAX_TOTAL_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "submitted":    {"under_review"},
    "under_review": {"under_review", "accepted", "rejected"},
    "accepted":     set(),
    "rejected":     set(),
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# T010 — Multi-file validation
# ---------------------------------------------------------------------------

def validate_files(files: list[UploadFile]) -> None:
    """Validate MIME types, extensions, count, and total size. Raises HTTPException(400)."""
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES} files allowed per submission.",
        )

    total_bytes = 0
    for file in files:
        if file.content_type not in _ACCEPTED_MIME:
            raise HTTPException(
                status_code=400,
                detail=f"File type not accepted: {file.content_type}. Allowed types: PDF, DOCX, DOC, PNG, JPG, GIF, MP4, MOV, PPTX, PPT.",
            )
        ext = Path(file.filename or "").suffix.lower()
        if ext not in _ACCEPTED_EXT:
            raise HTTPException(
                status_code=400,
                detail=f"File extension not accepted: {ext}.",
            )
        total_bytes += file.size or 0

    if total_bytes > MAX_TOTAL_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Combined file size exceeds the 50 MB limit.",
        )


# ---------------------------------------------------------------------------
# T011 — Atomic file save with rollback
# ---------------------------------------------------------------------------

def _write_bytes(dest: Path, data: bytes) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


async def save_files_atomic(idea_id: str, pairs: list[tuple[Path, bytes]]) -> None:
    """Write all (dest, data) pairs atomically; on OSError roll back all written files."""
    written: list[Path] = []
    try:
        for dest, data in pairs:
            await anyio.to_thread.run_sync(lambda d=dest, b=data: _write_bytes(d, b))
            written.append(dest)
    except OSError as exc:
        for p in written:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
        raise HTTPException(status_code=500, detail="File write failed; no files were saved.") from exc


# ---------------------------------------------------------------------------
# Legacy single-file helpers (kept for backward compat with evaluate_idea)
# ---------------------------------------------------------------------------

def build_evaluation_info(idea: Idea, caller: User, admin_name: Optional[str] = None) -> EvaluationInfo:
    """Apply visibility rules from data-model.md §3.3."""
    is_admin = caller.role == "admin"
    is_owner = caller.id == idea.submitter_id
    comment_visible = is_admin or (is_owner and idea.evaluation_status in ("accepted", "rejected"))
    return EvaluationInfo(
        status=idea.evaluation_status,
        comment=idea.evaluation_comment if comment_visible else None,
        evaluated_at=idea.evaluated_at,
        assigned_admin_id=idea.assigned_admin_id if is_admin else None,
        assigned_admin_name=admin_name,
    )


# ---------------------------------------------------------------------------
# T012 — create_idea with multi-file support
# ---------------------------------------------------------------------------

async def create_idea(
    db: AsyncSession,
    current_user: User,
    title: str,
    description: str,
    category: str,
    files: Optional[list[UploadFile]] = None,
    extra_data: Optional[dict] = None,
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
    now = _utc_now_iso()

    # Collect file bytes and validate total size again (size may have been approximate)
    file_payloads: list[tuple[str, str, str, int, bytes]] = []
    if files:
        pairs_to_write: list[tuple[Path, bytes]] = []
        for f in files:
            data = await f.read()
            ext = Path(f.filename or "").suffix.lower()
            stored_name = f"{uuid.uuid4()}{ext}"
            dest = settings.upload_path(idea_id, stored_name)
            pairs_to_write.append((dest, data))
            file_payloads.append((
                f.filename or stored_name,
                stored_name,
                f.content_type or "application/octet-stream",
                len(data),
                data,
            ))

        if pairs_to_write:
            await save_files_atomic(idea_id, pairs_to_write)

    idea = Idea(
        id=idea_id,
        title=title,
        description=description,
        category=category,
        submitter_id=current_user.id,
        submitted_at=now,
        extra_data=json.dumps(extra_data) if extra_data is not None else None,
    )
    db.add(idea)

    attachments_info: list[AttachmentInfo] = []
    for filename, stored_name, mime_type, size, _ in file_payloads:
        attachment = Attachment(
            id=str(uuid.uuid4()),
            idea_id=idea_id,
            filename=filename,
            stored_name=stored_name,
            mime_type=mime_type,
            size=size,
            uploaded_at=now,
        )
        db.add(attachment)
        attachments_info.append(AttachmentInfo(
            id=attachment.id,
            name=filename,
            size=size,
            mime_type=mime_type,
            is_image=mime_type in _IMAGE_MIME,
        ))

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
        attachments=attachments_info,
        evaluation=EvaluationInfo(
            status=idea.evaluation_status,
            comment=None,
            evaluated_at=None,
            assigned_admin_id=None,
            assigned_admin_name=None,
        ),
        extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None,
    )


# ---------------------------------------------------------------------------
# T013 — get_idea loads Attachment rows
# ---------------------------------------------------------------------------

async def _load_attachments(db: AsyncSession, idea_id: str) -> list[AttachmentInfo]:
    result = await db.execute(
        select(Attachment).where(Attachment.idea_id == idea_id)
    )
    rows = result.scalars().all()
    return [
        AttachmentInfo(
            id=a.id,
            name=a.filename,
            size=a.size,
            mime_type=a.mime_type,
            is_image=a.mime_type in _IMAGE_MIME,
        )
        for a in rows
    ]


async def get_idea(
    db: AsyncSession,
    idea_id: str,
    caller: Optional[User] = None,
) -> IdeaDetailResponse:
    result = await db.execute(
        select(Idea, User.full_name.label("submitter_name"))
        .join(User, User.id == Idea.submitter_id)
        .where(Idea.id == idea_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Idea not found.")

    idea = row.Idea
    attachments = await _load_attachments(db, idea_id)

    admin_name = None
    if idea.assigned_admin_id:
        admin = await db.get(User, idea.assigned_admin_id)
        admin_name = admin.full_name if admin else None

    if caller is not None:
        evaluation = build_evaluation_info(idea, caller, admin_name)
    else:
        evaluation = EvaluationInfo(
            status=idea.evaluation_status,
            comment=idea.evaluation_comment,
            evaluated_at=idea.evaluated_at,
            assigned_admin_id=idea.assigned_admin_id,
            assigned_admin_name=admin_name,
        )

    return IdeaDetailResponse(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        submitter_id=idea.submitter_id,
        submitter_name=row.submitter_name,
        submitted_at=idea.submitted_at,
        attachments=attachments,
        evaluation=evaluation,
        extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None,
    )


# ---------------------------------------------------------------------------
# T014 — list_ideas returns attachment_count
# ---------------------------------------------------------------------------

async def list_ideas(
    db: AsyncSession,
    caller: Optional[User] = None,
    page: int = 1,
    limit: int = 20,
    submitter_id_filter: Optional[str] = None,
    status_filter: Optional[EvaluationStatus] = None,
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

    if status_filter is not None:
        base_count_q = base_count_q.where(Idea.evaluation_status == status_filter)
        base_list_q = base_list_q.where(Idea.evaluation_status == status_filter)

    total_result = await db.execute(base_count_q)
    total = total_result.scalar_one()

    result = await db.execute(
        base_list_q
        .order_by(Idea.submitted_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    admin_ids = {row.Idea.assigned_admin_id for row in rows if row.Idea.assigned_admin_id}
    admin_names: dict[str, str] = {}
    if admin_ids:
        admins_result = await db.execute(select(User).where(User.id.in_(admin_ids)))
        admin_names = {u.id: u.full_name for u in admins_result.scalars()}

    # Fetch attachment counts for all ideas in a single query
    idea_ids = [row.Idea.id for row in rows]
    counts_map: dict[str, int] = {}
    if idea_ids:
        count_result = await db.execute(
            select(Attachment.idea_id, func.count(Attachment.id).label("cnt"))
            .where(Attachment.idea_id.in_(idea_ids))
            .group_by(Attachment.idea_id)
        )
        counts_map = {r.idea_id: r.cnt for r in count_result}

    ideas = [
        IdeaSummaryResponse(
            id=row.Idea.id,
            title=row.Idea.title,
            category=row.Idea.category,
            submitter_name=row.submitter_name,
            submitted_at=row.Idea.submitted_at,
            attachment_count=counts_map.get(row.Idea.id, 0),
            evaluation_status=row.Idea.evaluation_status,
            reviewer_name=admin_names.get(row.Idea.assigned_admin_id) if row.Idea.assigned_admin_id else None,
            extra_data=json.loads(row.Idea.extra_data) if row.Idea.extra_data is not None else None,
        )
        for row in rows
    ]

    return IdeaListResponse(ideas=ideas, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# evaluate_idea (unchanged logic, updated to use attachments)
# ---------------------------------------------------------------------------

async def evaluate_idea(
    db: AsyncSession,
    idea_id: str,
    acting_admin: User,
    new_status: EvaluationStatus,
    comment: Optional[str],
) -> IdeaDetailResponse:
    result = await db.execute(
        select(Idea, User.full_name.label("submitter_name"))
        .join(User, User.id == Idea.submitter_id)
        .where(Idea.id == idea_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Idea not found.")

    if acting_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins may evaluate ideas.")

    idea = row.Idea
    current_status = idea.evaluation_status

    if current_status in ("accepted", "rejected"):
        raise HTTPException(
            status_code=409,
            detail=f"This idea is locked (status: {current_status}). No further evaluation actions are permitted.",
        )

    if new_status not in ALLOWED_TRANSITIONS[current_status]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current_status} → {new_status}. Allowed next status: {', '.join(ALLOWED_TRANSITIONS[current_status]) or 'none'}.",
        )

    if current_status == "under_review" and idea.assigned_admin_id != acting_admin.id:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned admin may evaluate this idea.",
        )

    if current_status == "submitted" and new_status == "under_review":
        idea.assigned_admin_id = acting_admin.id

    idea.evaluation_status = new_status
    idea.evaluation_comment = comment
    idea.evaluated_at = _utc_now_iso()

    await db.commit()
    await db.refresh(idea)

    attachments = await _load_attachments(db, idea_id)

    return IdeaDetailResponse(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        submitter_id=idea.submitter_id,
        submitter_name=row.submitter_name,
        submitted_at=idea.submitted_at,
        attachments=attachments,
        evaluation=build_evaluation_info(idea, acting_admin, admin_name=acting_admin.full_name),
        extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None,
    )
