from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.database import get_db
from app.models.idea import Idea
from app.models.user import User
from app.schemas.ideas import IdeaDetailResponse, IdeaListResponse
from app.services import idea_service
from sqlalchemy import select

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.post("", status_code=201, response_model=IdeaDetailResponse)
async def submit_idea(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaDetailResponse:
    if current_user.role == "admin":
        raise HTTPException(status_code=403, detail="Evaluators cannot submit ideas.")

    if file is not None and file.filename:
        idea_service.validate_file(file)

    return await idea_service.create_idea(db, current_user, title, description, category, file)


@router.get("", response_model=IdeaListResponse)
async def list_ideas(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaListResponse:
    return await idea_service.list_ideas(db, page=page, limit=limit)


@router.get("/{idea_id}", response_model=IdeaDetailResponse)
async def get_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IdeaDetailResponse:
    return await idea_service.get_idea(db, idea_id)


@router.get("/{idea_id}/attachment")
async def download_attachment(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    result = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found.")
    if idea.attachment_stored_name is None:
        raise HTTPException(status_code=404, detail="No attachment.")

    is_submitter = current_user.id == idea.submitter_id
    is_evaluator = current_user.role == "admin"
    if not (is_submitter or is_evaluator):
        raise HTTPException(
            status_code=403, detail="You are not authorised to download this file."
        )

    file_path = settings.upload_path(idea_id, idea.attachment_stored_name)
    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Attachment file not found on disk.")

    return FileResponse(
        path=str(file_path),
        media_type=idea.attachment_mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{idea.attachment_filename}"'
        },
    )
