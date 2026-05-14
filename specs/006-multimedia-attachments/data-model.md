# Data Model: Multi-Media Attachments (006)

**Date**: 2026-05-14 | **Branch**: `006-multimedia-attachments`

---

## 1. Schema Changes Summary

| Change | Type | Detail |
|--------|------|--------|
| `attachments` table | **NEW** | 1-to-many with `ideas` |
| `ideas.attachment_filename` | **REMOVED** | Migrated to `attachments.filename` |
| `ideas.attachment_stored_name` | **REMOVED** | Migrated to `attachments.stored_name` |
| `ideas.attachment_mime_type` | **REMOVED** | Migrated to `attachments.mime_type` |
| `ideas.attachment_size` | **REMOVED** | Migrated to `attachments.size` |
| `ck_ideas_attachment_consistency` CHECK | **REMOVED** | No longer applicable |

---

## 2. New Table: `attachments`

### DDL

```sql
CREATE TABLE attachments (
    id          TEXT PRIMARY KEY,                        -- UUID v4
    idea_id     TEXT NOT NULL
                    REFERENCES ideas(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,                           -- original filename (display + Content-Disposition)
    stored_name TEXT NOT NULL,                           -- UUID4 + original extension, prevents path traversal
    mime_type   TEXT NOT NULL,
    size        INTEGER NOT NULL,                        -- bytes
    uploaded_at TEXT NOT NULL                            -- ISO 8601 UTC, e.g. '2026-05-14T10:30:00Z'
);

CREATE INDEX idx_attachments_idea_id ON attachments (idea_id);
```

### Constraints

- `id`: UUID v4, set by application at creation time
- `idea_id`: Foreign key to `ideas.id`; `ON DELETE CASCADE` ensures attachment rows are removed if the parent idea is ever deleted
- `stored_name`: `<uuid4><original_ext>` — e.g. `3f2a1c-….mp4`. Prevents filename collisions and path-traversal attacks
- `filename`: original user-supplied name, preserved for display and `Content-Disposition` header
- `size`: file size in bytes at upload time (not re-read from disk at serve time)
- `uploaded_at`: set to current UTC time at the moment the row is inserted

### Storage path convention (unchanged from ADR 007)

```
backend/uploads/{idea_id}/{stored_name}
```

`settings.upload_path(idea_id, stored_name)` already implements this.

---

## 3. Modified Table: `ideas`

The four inline attachment columns and the `ck_ideas_attachment_consistency` CHECK are removed. All other columns, constraints, and indices are unchanged.

### Columns removed

```sql
-- these four columns are removed via migration
attachment_filename    TEXT
attachment_stored_name TEXT
attachment_mime_type   TEXT
attachment_size        INTEGER

-- this CHECK is also removed
CHECK((attachment_filename IS NULL) = (attachment_stored_name IS NULL))
```

---

## 4. SQLAlchemy Models

### `backend/app/models/attachment.py` (NEW)

```python
from sqlalchemy import Column, String, Integer, Index, ForeignKey
from app.models.user import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id          = Column(String, primary_key=True)
    idea_id     = Column(String, ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False)
    filename    = Column(String, nullable=False)
    stored_name = Column(String, nullable=False)
    mime_type   = Column(String, nullable=False)
    size        = Column(Integer, nullable=False)
    uploaded_at = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_attachments_idea_id", "idea_id"),
    )
```

### `backend/app/models/idea.py` (MODIFIED — columns removed)

Remove the following four columns and the `ck_ideas_attachment_consistency` CHECK from the existing model. All other columns, checks, and indices are unchanged.

---

## 5. Pydantic Schemas (`backend/app/schemas/ideas.py`)

### New: `AttachmentInfo`

```python
class AttachmentInfo(BaseModel):
    id: str
    name: str        # original filename
    size: int        # bytes
    mime_type: str
    is_image: bool   # True when mime_type starts with "image/"
```

`is_image` is computed by the service layer, not stored; it lets the frontend decide rendering without string inspection.

### Modified: `IdeaDetailResponse`

```python
# BEFORE
file: Optional[FileInfo] = None

# AFTER
attachments: list[AttachmentInfo] = []
```

`FileInfo` is **removed** from this schema (it is no longer used anywhere). If other features reference it, they will be updated in the same task batch.

### Modified: `IdeaSummaryResponse`

```python
# BEFORE
has_attachment: bool

# AFTER
attachment_count: int
```

---

## 6. Accepted File Types

### Backend (`backend/app/services/idea_service.py`)

```python
_ACCEPTED_MIME: set[str] = {
    # Images
    "image/png",
    "image/jpeg",
    "image/gif",
    # PDF
    "application/pdf",
    # Video
    "video/mp4",
    "video/quicktime",
    # Presentations
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.ms-powerpoint",                                               # .ppt
    # Documents
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",    # .docx
    "application/msword",                                                           # .doc
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
```

### Frontend (`frontend/src/components/ideas/FileUploadControl.tsx`)

```typescript
const ACCEPTED_MIME = [
  'image/png', 'image/jpeg', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/quicktime',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
const ACCEPTED_EXT = '.png,.jpg,.jpeg,.gif,.pdf,.mp4,.mov,.pptx,.ppt,.docx,.doc'
const MAX_FILES = 5
const MAX_TOTAL_BYTES = 50 * 1024 * 1024
```

---

## 7. Validation Rules

### Per-file (checked on each file individually)

| Rule | Backend | Frontend |
|------|---------|---------|
| MIME type in `_ACCEPTED_MIME` | `validate_files()` raises HTTP 400 | `FileUploadControl` sets error state |
| Extension in `_ACCEPTED_EXT` | `validate_files()` raises HTTP 400 | `accept` attribute on `<input>` |

### Per-submission (checked across all files together)

| Rule | Limit | Backend | Frontend |
|------|-------|---------|---------|
| File count | ≤ 5 | `validate_files()` raises HTTP 400 | `FileUploadControl` blocks additional files |
| Total size | ≤ 50 MB | Checked after reading all file bytes | Running total tracked in component state |

---

## 8. Migration Script Outline (`backend/scripts/migrate_attachments.py`)

```
forward():
  1. Create `attachments` table if not present
  2. Create `idx_attachments_idea_id` if not present
  3. Migrate existing data:
       INSERT INTO attachments (id, idea_id, filename, stored_name, mime_type, size, uploaded_at)
       SELECT uuid4(), id, attachment_filename, attachment_stored_name,
              attachment_mime_type, attachment_size,
              COALESCE(submitted_at, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       FROM ideas
       WHERE attachment_stored_name IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM attachments WHERE idea_id = ideas.id)
  4. Recreate `ideas` table without attachment_* columns and attachment consistency CHECK
     (same table-recreation pattern as migrate_extra_data.py)
  5. Rebuild all three indices on `ideas`

rollback():
  1. Add attachment_* columns back to ideas (table recreation)
  2. Copy data back from attachments into ideas (single row per idea; if multiple exist, take first by uploaded_at)
  3. Drop attachments table
```

---

## 9. TypeScript Types (`frontend/src/types/ideas.ts`)

```typescript
export interface AttachmentInfo {
  id: string
  name: string
  size: number
  mime_type: string
  is_image: boolean
}

export interface IdeaDetailResponse {
  id: string
  title: string
  description: string
  category: string
  submitter_id: string
  submitter_name: string
  submitted_at: string
  attachments: AttachmentInfo[]   // replaces: file: FileInfo | null
  evaluation: EvaluationInfo
  extra_data: Record<string, unknown> | null
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  attachment_count: number        // replaces: has_attachment: boolean
  evaluation_status: EvaluationStatus
  reviewer_name: string | null
  extra_data: Record<string, unknown> | null
}

// FileInfo is removed — no longer used
```
