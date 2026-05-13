# Data Model: Evaluation Workflow

**Branch**: `004-evaluation-workflow` | **Date**: 2026-05-13

## 1. Database Schema Changes

### 1.1 New Columns on `ideas` Table

Four columns are added inline to the existing `ideas` table (ADR 009):

| Column | SQLAlchemy Type | Nullable | Default | Notes |
|--------|----------------|----------|---------|-------|
| `evaluation_status` | `String` | No | `"submitted"` | CHECK constraint enforces allowed values |
| `evaluation_comment` | `String` | Yes | `NULL` | Max 1,000 chars enforced at Pydantic layer |
| `evaluated_at` | `String` | Yes | `NULL` | ISO 8601 UTC string; set/refreshed on each evaluate action |
| `assigned_admin_id` | `String` | Yes | `NULL` | FK to `users.id`; set once when idea moves to `under_review` |

### 1.2 New Constraints and Index

```python
CheckConstraint(
    "evaluation_status IN ('submitted','under_review','accepted','rejected')",
    name="ck_ideas_evaluation_status",
)
Index("idx_ideas_evaluation_status", "evaluation_status")
```

### 1.3 Full Updated `Idea` Model (reference)

```python
class Idea(Base):
    __tablename__ = "ideas"

    id                    = Column(String, primary_key=True)
    title                 = Column(String, nullable=False)
    description           = Column(String, nullable=False)
    category              = Column(String, nullable=False)
    submitter_id          = Column(String, nullable=False)
    submitted_at          = Column(String, nullable=False, server_default=...)
    attachment_filename   = Column(String, nullable=True)
    attachment_stored_name = Column(String, nullable=True)
    attachment_mime_type  = Column(String, nullable=True)
    attachment_size       = Column(Integer, nullable=True)

    # Evaluation (FR-001 to FR-013)
    evaluation_status    = Column(String, nullable=False,
                                  default="submitted", server_default="submitted")
    evaluation_comment   = Column(String, nullable=True)
    evaluated_at         = Column(String, nullable=True)
    assigned_admin_id    = Column(String, nullable=True)

    __table_args__ = (
        # existing constraints …
        CheckConstraint(
            "evaluation_status IN ('submitted','under_review','accepted','rejected')",
            name="ck_ideas_evaluation_status",
        ),
        Index("idx_ideas_evaluation_status", "evaluation_status"),
    )
```

---

## 2. Pydantic Schemas (`backend/app/schemas/ideas.py`)

### 2.1 New Types

```python
from typing import Literal, Optional
from pydantic import BaseModel, Field

EvaluationStatus = Literal["submitted", "under_review", "accepted", "rejected"]

class EvaluateIdeaRequest(BaseModel):
    status: EvaluationStatus
    comment: Optional[str] = Field(None, max_length=1000)

class EvaluationInfo(BaseModel):
    status: EvaluationStatus
    comment: Optional[str] = None        # None = absent or hidden from caller
    evaluated_at: Optional[str] = None
    assigned_admin_id: Optional[str] = None
```

### 2.2 Updated Response Schemas

**`IdeaDetailResponse`** — add `evaluation` field:

```python
class IdeaDetailResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    submitter_id: str
    submitter_name: str
    submitted_at: str
    file: Optional[FileInfo] = None
    evaluation: EvaluationInfo          # always present; comment may be None
```

**`IdeaSummaryResponse`** — add `evaluation_status`:

```python
class IdeaSummaryResponse(BaseModel):
    id: str
    title: str
    category: str
    submitter_name: str
    submitted_at: str
    has_attachment: bool
    evaluation_status: EvaluationStatus   # for status badge on list row
```

---

## 3. Service Layer (`backend/app/services/idea_service.py`)

### 3.1 State Machine

```
submitted  ──(any admin)──▶  under_review  ──(assigned admin)──▶  accepted
                              │                                       [locked]
                              └──────────────(assigned admin)──▶  rejected
                                                                    [locked]
```

**Transition validation function** (pseudocode):

```python
ALLOWED_TRANSITIONS = {
    "submitted":    {"under_review"},
    "under_review": {"under_review", "accepted", "rejected"},
    "accepted":     set(),   # locked
    "rejected":     set(),   # locked
}

def validate_transition(current: str, requested: str) -> None:
    if requested not in ALLOWED_TRANSITIONS[current]:
        raise HTTPException(400, "Invalid status transition.")
```

### 3.2 `evaluate_idea()` Function Signature

```python
async def evaluate_idea(
    db: AsyncSession,
    idea_id: str,
    acting_admin: User,
    new_status: EvaluationStatus,
    comment: Optional[str],
) -> IdeaDetailResponse:
    ...
```

**Logic steps**:
1. Fetch idea; 404 if not found.
2. Validate `acting_admin.role == "admin"`; 403 otherwise.
3. Validate transition (`current → new_status`); 400 on invalid.
4. Check lock: if current status is `accepted` or `rejected` → 409 Locked.
5. Check assignment: if `current == "under_review"` and `assigned_admin_id != acting_admin.id` → 403 Forbidden.
6. Build update:
   - If `current == "submitted"` and `new_status == "under_review"`: set `assigned_admin_id = acting_admin.id`.
   - Set `evaluation_status = new_status`.
   - Set `evaluation_comment = comment` (None clears the previous comment).
   - Set `evaluated_at = utc_now_iso()`.
7. `db.commit()` atomically.
8. Return updated `IdeaDetailResponse` with visibility rules applied.

### 3.3 Visibility Rules (applied in `get_idea` and `list_ideas`)

```python
def build_evaluation_info(
    idea: Idea,
    caller: User,
) -> EvaluationInfo:
    is_admin = caller.role == "admin"
    comment_visible = (
        idea.evaluation_status in ("accepted", "rejected")
        or is_admin
    )
    return EvaluationInfo(
        status=idea.evaluation_status,
        comment=idea.evaluation_comment if comment_visible else None,
        evaluated_at=idea.evaluated_at,
        assigned_admin_id=idea.assigned_admin_id if is_admin else None,
    )
```

### 3.4 Updated `list_ideas()` Signature

```python
async def list_ideas(
    db: AsyncSession,
    caller: User,
    page: int = 1,
    limit: int = 20,
    submitter_id_filter: Optional[str] = None,
    status_filter: Optional[EvaluationStatus] = None,
) -> IdeaListResponse:
```

Adds an optional `WHERE evaluation_status = :status` clause when `status_filter` is provided.

---

## 4. Frontend Types (`frontend/src/types/ideas.ts`)

```typescript
export type EvaluationStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected'

export interface EvaluationInfo {
  status: EvaluationStatus
  comment: string | null
  evaluated_at: string | null
  assigned_admin_id: string | null
}

// Updated:
export interface IdeaDetailResponse {
  id: string
  title: string
  description: string
  category: string
  submitter_id: string
  submitter_name: string
  submitted_at: string
  file: FileInfo | null
  evaluation: EvaluationInfo     // NEW
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  has_attachment: boolean
  evaluation_status: EvaluationStatus   // NEW
}

export interface EvaluateIdeaRequest {
  status: EvaluationStatus
  comment?: string
}
```

---

## 5. Migration Script (`backend/scripts/migrate_eval.py`)

```python
"""One-time migration: add evaluation columns to ideas table."""
import sqlite3, pathlib, sys

DB_PATH = pathlib.Path(__file__).parent.parent / "innovatepam.db"

NEW_COLUMNS = [
    ("evaluation_status",  "TEXT NOT NULL DEFAULT 'submitted'"),
    ("evaluation_comment", "TEXT"),
    ("evaluated_at",       "TEXT"),
    ("assigned_admin_id",  "TEXT"),
]

def run() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(ideas)")}
    for col_name, col_def in NEW_COLUMNS:
        if col_name not in existing:
            cur.execute(f"ALTER TABLE ideas ADD COLUMN {col_name} {col_def}")
            print(f"  Added: {col_name}")
        else:
            print(f"  Skipped (exists): {col_name}")
    # Create index if not present
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status
        ON ideas (evaluation_status)
    """)
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    run()
```

---

## 6. Test Cases (for TDD — written before implementation)

### Backend Unit Tests (`test_idea_service.py`)

| # | Test | Expected |
|---|------|----------|
| U-01 | evaluate submitted → under_review (valid admin) | Status updated; assigned_admin_id set; evaluated_at populated |
| U-02 | evaluate submitted → accepted (skip step) | HTTPException 400 |
| U-03 | evaluate under_review → accepted (assigned admin) | Status = accepted; locked |
| U-04 | evaluate under_review → rejected (assigned admin) | Status = rejected; locked |
| U-05 | evaluate accepted → any (locked) | HTTPException 409 |
| U-06 | evaluate rejected → any (locked) | HTTPException 409 |
| U-07 | evaluate under_review by non-assigned admin | HTTPException 403 |
| U-08 | evaluate idea as non-admin user | HTTPException 403 |
| U-09 | comment-only update (under_review → under_review) | Comment updated; evaluated_at refreshed; status unchanged |
| U-10 | empty comment clears previous comment | evaluation_comment = None after update |
| U-11 | get_idea visibility: submitter sees under_review, no comment | comment = None in response |
| U-12 | get_idea visibility: admin sees under_review + comment | comment visible |
| U-13 | get_idea visibility: submitter sees accepted + comment | comment visible |
| U-14 | list_ideas with status_filter = "submitted" | Only submitted ideas returned |
| U-15 | list_ideas with status_filter + mine filter (AND) | Intersection returned |

### Backend Integration Tests (`test_idea_routes.py`)

| # | Test | Expected |
|---|------|----------|
| I-01 | PATCH /ideas/{id}/evaluate — unauthenticated | 401 |
| I-02 | PATCH /ideas/{id}/evaluate — submitter role | 403 |
| I-03 | PATCH /ideas/{id}/evaluate — admin, valid transition | 200 |
| I-04 | PATCH /ideas/{id}/evaluate — invalid transition | 400 |
| I-05 | PATCH /ideas/{id}/evaluate — locked idea | 409 |
| I-06 | PATCH /ideas/{id}/evaluate — not assigned admin | 403 |
| I-07 | GET /ideas?status=submitted | Only submitted ideas |
| I-08 | GET /ideas?status=accepted&mine=true | Intersection |
| I-09 | GET /ideas?status=invalid | 422 Unprocessable Entity |
| I-10 | GET /ideas/{id} as submitter, under_review | comment absent from response |
| I-11 | GET /ideas/{id} as admin, under_review | comment present in response |
| I-12 | PATCH /ideas/{id}/evaluate — comment length > 1,000 chars | 422 Unprocessable Entity |
