import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.database import get_db
from app.models.attachment import Attachment
from app.models.idea import Idea
from app.models.user import User
from app.schemas.ideas import EvaluateIdeaRequest, EvaluationStatus, IdeaDetailResponse, IdeaListResponse
from app.schemas.extra_data import validate_extra_data
from app.services import idea_service

router = APIRouter(prefix="/ideas", tags=["ideas"])

_IMAGE_MIME: set[str] = {"image/png", "image/jpeg", "image/gif"}


@router.post("", status_code=201, response_model=IdeaDetailResponse)
async def submit_idea(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    extra_data: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaDetailResponse:
    if current_user.role == "admin":
        raise HTTPException(status_code=403, detail="Evaluators cannot submit ideas.")

    non_empty = [f for f in files if f.filename]
    if non_empty:
        idea_service.validate_files(non_empty)

    parsed_extra: Optional[dict] = None
    if extra_data is not None:
        try:
            parsed_extra = json.loads(extra_data)
        except (json.JSONDecodeError, ValueError):
            raise HTTPException(status_code=422, detail={"extra_data": {"__root__": "Must be valid JSON."}})

    errors = validate_extra_data(category, parsed_extra)
    if errors:
        raise HTTPException(status_code=422, detail={"extra_data": errors})

    return await idea_service.create_idea(
        db, current_user, title, description, category,
        non_empty if non_empty else None,
        extra_data=parsed_extra,
    )


@router.get("", response_model=IdeaListResponse)
async def list_ideas(
    page: int = 1,
    limit: int = 20,
    mine: bool = Query(False, description="Filter to current user's ideas"),
    status: Optional[EvaluationStatus] = Query(None, description="Filter by evaluation status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaListResponse:
    submitter_id_filter = current_user.id if mine else None
    return await idea_service.list_ideas(
        db,
        caller=current_user,
        page=page,
        limit=limit,
        submitter_id_filter=submitter_id_filter,
        status_filter=status,
    )


@router.get("/{idea_id}", response_model=IdeaDetailResponse)
async def get_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaDetailResponse:
    return await idea_service.get_idea(db, idea_id, caller=current_user)


@router.patch("/{idea_id}/evaluate", response_model=IdeaDetailResponse)
async def evaluate_idea(
    idea_id: str,
    body: EvaluateIdeaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaDetailResponse:
    return await idea_service.evaluate_idea(
        db,
        idea_id=idea_id,
        acting_admin=current_user,
        new_status=body.status,
        comment=body.comment,
    )


@router.get("/{idea_id}/attachments/{attachment_id}")
async def download_attachment(
    idea_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.idea_id == idea_id,
        )
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    is_image = attachment.mime_type in _IMAGE_MIME

    if not is_image:
        idea_result = await db.execute(select(Idea).where(Idea.id == idea_id))
        idea = idea_result.scalar_one_or_none()
        if idea is None:
            raise HTTPException(status_code=404, detail="Idea not found.")
        if current_user.id != idea.submitter_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="You are not authorised to download this file.")

    file_path = settings.upload_path(idea_id, attachment.stored_name)
    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Attachment file not found on disk.")

    if is_image:
        return FileResponse(path=str(file_path), media_type=attachment.mime_type)

    return FileResponse(
        path=str(file_path),
        media_type=attachment.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{attachment.filename}"'},
    )
