from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

IdeaCategory = Literal["process_improvement", "technology", "cost_saving", "other"]
EvaluationStatus = Literal["submitted", "under_review", "accepted", "rejected"]


class FileInfo(BaseModel):
    name: str
    size: int
    mime_type: str


class EvaluationInfo(BaseModel):
    status: EvaluationStatus
    comment: Optional[str] = None
    evaluated_at: Optional[str] = None
    assigned_admin_id: Optional[str] = None
    assigned_admin_name: Optional[str] = None


class EvaluateIdeaRequest(BaseModel):
    status: EvaluationStatus
    comment: Optional[str] = Field(None, max_length=1000)


class IdeaDetailResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    submitter_id: str
    submitter_name: str
    submitted_at: str
    file: Optional[FileInfo] = None
    evaluation: EvaluationInfo


class IdeaSummaryResponse(BaseModel):
    id: str
    title: str
    category: str
    submitter_name: str
    submitted_at: str
    has_attachment: bool
    evaluation_status: EvaluationStatus
    reviewer_name: Optional[str] = None


class IdeaListResponse(BaseModel):
    ideas: list[IdeaSummaryResponse]
    total: int
    page: int
    limit: int


class IdeaCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=3000)
    category: IdeaCategory
