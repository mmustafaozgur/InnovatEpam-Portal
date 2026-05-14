from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import anyio
from fastapi import HTTPException, UploadFile
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.attachment import Attachment
from app.models.idea import Idea
from app.models.stage_review import StageReview
from app.models.user import User
from app.schemas.ideas import (
    AttachmentInfo,
    IdeaDetailResponse,
    IdeaListResponse,
    IdeaSummaryResponse,
    Stage,
    StageReviewRecord,
)

STAGES = [
    "new_idea",
    "initial_screening",
    "technical_review",
    "business_impact_assessment",
    "final_selection",
]
STAGE_ORDER = {s: i for i, s in enumerate(STAGES)}
TERMINAL_STAGE = "final_selection"

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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Multi-file validation
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
            detail="Combined file size exceeds the 50 MB limit.",
        )


# ---------------------------------------------------------------------------
# Atomic file save with rollback
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
# Internal data loaders
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


async def _load_stage_reviews(db: AsyncSession, idea_id: str) -> list[StageReviewRecord]:
    result = await db.execute(
        select(StageReview, User.full_name.label("reviewer_name"))
        .outerjoin(User, User.id == StageReview.reviewed_by)
        .where(StageReview.idea_id == idea_id)
        .order_by(StageReview.reviewed_at)
    )
    rows = result.all()
    return [
        StageReviewRecord(
            id=r.StageReview.id,
            stage=r.StageReview.stage,
            outcome=r.StageReview.outcome,
            comment=r.StageReview.comment,
            reviewer_name=r.reviewer_name,
            reviewed_at=r.StageReview.reviewed_at,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# create_idea with multi-file support
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
        current_stage="new_idea",
        assigned_admin_id=None,
        assigned_admin_name=None,
        stage_reviews=[],
        extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None,
    )


# ---------------------------------------------------------------------------
# get_idea — loads stage_reviews with visibility filtering (FR-009)
# ---------------------------------------------------------------------------

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

    admin_name: Optional[str] = None
    if idea.assigned_admin_id:
        admin = await db.get(User, idea.assigned_admin_id)
        admin_name = admin.full_name if admin else None

    # FR-009 visibility: all admins + original submitter see full stage_reviews; others get []
    stage_reviews: list[StageReviewRecord] = []
    if caller is None:
        stage_reviews = await _load_stage_reviews(db, idea_id)
    elif caller.role == "admin" or caller.id == idea.submitter_id:
        stage_reviews = await _load_stage_reviews(db, idea_id)

    return IdeaDetailResponse(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        submitter_id=idea.submitter_id,
        submitter_name=row.submitter_name,
        submitted_at=idea.submitted_at,
        attachments=attachments,
        current_stage=idea.current_stage,
        assigned_admin_id=idea.assigned_admin_id,
        assigned_admin_name=admin_name,
        stage_reviews=stage_reviews,
        extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None,
    )


# ---------------------------------------------------------------------------
# list_ideas — uses current_stage and stage_filter
# ---------------------------------------------------------------------------

async def list_ideas(
    db: AsyncSession,
    caller: Optional[User] = None,
    page: int = 1,
    limit: int = 20,
    submitter_id_filter: Optional[str] = None,
    stage_filter: Optional[Stage] = None,
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

    if stage_filter is not None:
        base_count_q = base_count_q.where(Idea.current_stage == stage_filter)
        base_list_q = base_list_q.where(Idea.current_stage == stage_filter)

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

    idea_ids = [row.Idea.id for row in rows]
    counts_map: dict[str, int] = {}
    if idea_ids:
        count_result = await db.execute(
            select(Attachment.idea_id, func.count(Attachment.id).label("cnt"))
            .where(Attachment.idea_id.in_(idea_ids))
            .group_by(Attachment.idea_id)
        )
        counts_map = {r.idea_id: r.cnt for r in count_result}

    # Fetch outcomes for final_selection ideas (one extra query, bounded by page size)
    outcome_map: dict[str, str] = {}
    final_ids = [row.Idea.id for row in rows if row.Idea.current_stage == "final_selection"]
    if final_ids:
        outcome_result = await db.execute(
            select(StageReview.idea_id, StageReview.outcome)
            .where(StageReview.idea_id.in_(final_ids), StageReview.stage == "final_selection")
        )
        outcome_map = {r.idea_id: r.outcome for r in outcome_result if r.outcome}

    ideas = [
        IdeaSummaryResponse(
            id=row.Idea.id,
            title=row.Idea.title,
            category=row.Idea.category,
            submitter_name=row.submitter_name,
            submitted_at=row.Idea.submitted_at,
            attachment_count=counts_map.get(row.Idea.id, 0),
            current_stage=row.Idea.current_stage,
            outcome=outcome_map.get(row.Idea.id) if row.Idea.current_stage == "final_selection" else None,
            reviewer_name=admin_names.get(row.Idea.assigned_admin_id) if row.Idea.assigned_admin_id else None,
            extra_data=json.loads(row.Idea.extra_data) if row.Idea.extra_data is not None else None,
        )
        for row in rows
    ]

    return IdeaListResponse(ideas=ideas, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# advance_stage — US1 + US2 implementation
# ---------------------------------------------------------------------------

async def advance_stage(
    db: AsyncSession,
    idea_id: str,
    acting_admin_id: str,
    comment: Optional[str],
    outcome: Optional[str],
) -> IdeaDetailResponse:
    # Validate comment length (SC-007)
    if comment is not None and len(comment) > 1000:
        raise HTTPException(status_code=422, detail="Comment must not exceed 1000 characters.")

    # Load acting admin
    acting_admin = await db.get(User, acting_admin_id)
    if acting_admin is None or acting_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins may advance ideas.")

    # Load idea
    result = await db.execute(
        select(Idea).where(Idea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found.")

    # Reject if already terminal (locked)
    if idea.current_stage == TERMINAL_STAGE:
        raise HTTPException(
            status_code=422,
            detail="This idea is locked at final_selection. No further stage advances are permitted.",
        )

    # Determine next stage (always exactly one step forward)
    next_stage = STAGES[STAGE_ORDER[idea.current_stage] + 1]

    # Require outcome when advancing to final_selection
    if next_stage == TERMINAL_STAGE and outcome is None:
        raise HTTPException(
            status_code=422,
            detail="outcome is required when advancing to final_selection.",
        )

    if idea.current_stage == "new_idea":
        # Race condition: another admin already claimed this idea
        if idea.assigned_admin_id is not None:
            raise HTTPException(
                status_code=409,
                detail="Another admin has already claimed this idea.",
            )
        idea.assigned_admin_id = acting_admin_id
    else:
        # Only the assigned admin may continue from initial_screening onward
        if idea.assigned_admin_id != acting_admin_id:
            raise HTTPException(
                status_code=403,
                detail="Only the assigned admin may advance this idea.",
            )

    idea.current_stage = next_stage

    stage_review = StageReview(
        id=str(uuid.uuid4()),
        idea_id=idea_id,
        stage=next_stage,
        outcome=outcome,
        comment=comment,
        reviewed_by=acting_admin_id,
        reviewed_at=_utc_now_iso(),
    )
    db.add(stage_review)
    await db.commit()

    return await get_idea(db, idea_id, caller=acting_admin)
