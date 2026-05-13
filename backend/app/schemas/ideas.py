from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

IdeaCategory = Literal["process_improvement", "technology", "cost_saving", "other"]


class FileInfo(BaseModel):
    name: str
    size: int
    mime_type: str


class IdeaDetailResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    submitter_id: str
    submitter_name: str
    submitted_at: str
    file: Optional[FileInfo] = None


class IdeaSummaryResponse(BaseModel):
    id: str
    title: str
    category: str
    submitter_name: str
    submitted_at: str
    has_attachment: bool


class IdeaListResponse(BaseModel):
    ideas: list[IdeaSummaryResponse]
    total: int
    page: int
    limit: int


class IdeaCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=3000)
    category: IdeaCategory
