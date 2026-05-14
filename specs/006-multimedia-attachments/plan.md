# Implementation Plan: Multi-Media Attachments

**Branch**: `006-multimedia-attachments` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-multimedia-attachments/spec.md`

## Summary

Extend the idea attachment system from a single-file, limited-type model (1 file, 10 MB, 4 MIME types) to a multi-file, broad-type model (up to 5 files, 50 MB total, 10 MIME types). Core work: introduce a new `attachments` table with a 1-to-many relationship to `ideas`, migrate existing single-file data from the inline `attachment_*` columns and remove those columns via a standalone migration script, expand backend validation and atomic file-save logic, update API contracts and Pydantic schemas, rewrite `FileUploadControl` for multi-file preview tiles, and update the detail page to render images inline and offer gated download links for non-image types.

---

## Technical Context

**Language/Version**: Python 3.11 (backend) · TypeScript ~6.0 (frontend)

**Primary Dependencies**: FastAPI · Pydantic v2 · SQLAlchemy 2 (asyncio) · aiosqlite · anyio · React 19 + Vite · react-hook-form 7 · shadcn/ui (Radix) · Tailwind CSS 3 · lucide-react

**Storage**: SQLite via aiosqlite — new `attachments` table (1-to-many with `ideas`); existing `attachment_*` inline columns on `ideas` retired via migration script (see `backend/scripts/migrate_attachments.py`)

**Testing**: pytest + pytest-asyncio + httpx (backend) · Vitest + React Testing Library + msw (frontend)

**Target Platform**: Linux server; development on Windows 11

**Project Type**: Web application (FastAPI backend + React + Vite frontend)

**Performance Goals**: Sub-100ms p95 on all modified endpoints (Principle II); upload writes are off the async event loop via `anyio.to_thread.run_sync`; attachment list is a single `SELECT … WHERE idea_id = ?` with an index on `idea_id`

**Constraints**: SQLite only (ADR 001); no new npm/PyPI dependencies; filesystem storage under `backend/uploads/` (ADR 007 amended by ADR 011); all-or-nothing file save on submission failure

**Scale/Scope**: New table + migration; ~10 backend files modified or created; ~8 frontend files modified or created

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Evidence |
|-----------|-----------|-------------|---------|
| I. Spec-Driven Development | ✅ | ✅ | spec.md complete with clarifications; plan follows spec exactly |
| II. High-Performance Engineering | ✅ | ✅ | New attachment queries use `idx_attachments_idea_id`; no N+1: attachment list loaded in one query per idea fetch; file I/O runs off the async loop |
| III. Test-Driven Development | ✅ | ✅ | All tasks write failing tests first; test files enumerated in project structure below |
| IV. Design System Compliance | ✅ | ✅ | MASTER.md exists; new UI uses existing Tailwind + shadcn/ui + lucide-react patterns; no custom CSS |
| V. Simplicity & Minimalism | ✅ | ✅ | No new pip/npm dependencies; `anyio` already available; `FileResponse` already available; separation justified by 1-to-many cardinality (ADR 011) |

**ADRs Referenced**:

| ADR | Title | Relevance |
|-----|-------|-----------|
| ADR 001 | SQLite as Sole Storage Engine | `attachments` table lives in SQLite; migration uses raw `sqlite3` |
| ADR 007 | Filesystem Storage for Idea File Attachments | Foundation; amended by ADR 011 for multi-file and expanded type set |
| ADR 011 | Multi-File Attachment Extension | **New** — documents the move from inline columns to `attachments` table, new types, and migration strategy |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-multimedia-attachments/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output — API contract changes
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
backend/
├── app/
│   ├── models/
│   │   ├── idea.py                      MODIFIED  remove attachment_* columns; keep existing indices
│   │   └── attachment.py                NEW       Attachment SQLAlchemy model
│   ├── schemas/
│   │   └── ideas.py                     MODIFIED  AttachmentInfo replaces FileInfo; IdeaDetailResponse.attachments[]; IdeaSummaryResponse.attachment_count
│   ├── services/
│   │   └── idea_service.py              MODIFIED  multi-file validation, atomic save/rollback, updated create/get/list/evaluate
│   └── api/
│       └── routes/
│           └── ideas.py                 MODIFIED  files: List[UploadFile]; new download route; old single-file route retired
├── tests/
│   ├── integration/
│   │   └── test_idea_routes.py          MODIFIED  multi-file upload, download access control, atomic rollback, backward compat
│   └── unit/
│       └── test_idea_service.py         MODIFIED  validate_files(), save_files_atomic(), expanded MIME set
└── scripts/
    └── migrate_attachments.py           NEW       idempotent: create attachments table, migrate existing data, remove inline columns

docs/adr/
└── 011-multi-file-attachment-extension.md   NEW

frontend/src/
├── components/ideas/
│   ├── FileUploadControl.tsx            MODIFIED  multi-file, preview tiles, 5-cap, 50 MB total, expanded types
│   ├── AttachmentsSection.tsx           NEW       detail-page attachment display (inline images + download block)
│   └── __tests__/
│       ├── FileUploadControl.test.tsx   MODIFIED  multi-file, tile removal, count/size errors
│       └── AttachmentsSection.test.tsx  NEW
├── pages/
│   ├── SubmitIdeaPage.tsx               MODIFIED  attachedFiles[] state; FormData multi-append
│   ├── IdeaDetailPage.tsx               MODIFIED  use idea.attachments; pass canDownload to AttachmentsSection
│   └── __tests__/
│       ├── SubmitIdeaPage.test.tsx      MODIFIED  multi-file form submission
│       └── IdeaDetailPage.test.tsx      MODIFIED  attachments section rendering
├── types/
│   └── ideas.ts                         MODIFIED  AttachmentInfo; IdeaDetailResponse.attachments[]; remove file field
└── api/
    └── ideas.ts                         MODIFIED  multi-file FormData append; remove legacy attachment URL helper
```

---

## Complexity Tracking

No constitution violations. The new `attachments` table is justified by the 1-to-many cardinality (up to 5 files per idea) which cannot be expressed in a single-row inline column pattern without denormalization. Inline JSON blob (like `extra_data`) was evaluated and rejected — see ADR 011.

---

## Implementation Phases

### Phase 0 — Research (completed, see research.md)

Key decisions resolved:
1. **Migration strategy**: Standalone `scripts/migrate_attachments.py` following the pattern of `migrate_extra_data.py`
2. **Atomic file save**: Write-then-cleanup pattern (save all files, on any failure delete all and raise)
3. **Image inline access**: Any authenticated user may GET image attachments; non-image downloads require submitter-or-admin
4. **Frontend preview tiles**: `URL.createObjectURL` for image thumbnails; lucide-react icons for non-images

### Phase 1 — Design (completed, see data-model.md + contracts/api.md)

Deliverables: `data-model.md`, `contracts/api.md`, `quickstart.md`, ADR 011

---

## Key Design Decisions

### D1 — New `attachments` table vs. JSON blob on `ideas`

Rejected JSON blob: attachment metadata must be queried individually (download endpoint needs `idea_id` + `attachment_id` lookup); N files per idea is a relational 1-to-many; index on `idea_id` gives O(log n) lookup.

Chosen: normalised `attachments` table with `id TEXT PK`, `idea_id TEXT FK`, `filename`, `stored_name`, `mime_type`, `size`, `uploaded_at`.

### D2 — Atomic file save (all-or-nothing, FR-015)

`create_idea` accumulates `(dest_path, data)` pairs for all files, then writes them all. On any `OSError` during writes, deletes all successfully written files (by tracking them) and raises `HTTPException(500)`. DB row is only inserted after all writes succeed.

### D3 — Inline image access tier

`GET /api/v1/ideas/{idea_id}/attachments/{attachment_id}`:
- **Image MIME types** (`image/*`): any authenticated user; `Content-Disposition: inline`
- **Non-image types**: submitter or admin only; `Content-Disposition: attachment; filename="..."`

This satisfies FR-010 (inline display for all viewers) and FR-016 (server-side enforcement for downloads).

### D4 — Retire old single-file endpoint and response fields

`GET /api/v1/ideas/{id}/attachment` is removed. `IdeaDetailResponse.file` is replaced by `IdeaDetailResponse.attachments: list[AttachmentInfo]`. The migration script ensures all existing attachment data is in the new table before the new code goes live. `IdeaSummaryResponse.has_attachment` is replaced by `attachment_count: int` (0 means no attachments; consumers derive boolean if needed).

### D5 — File-type expansion and validation

Expanded MIME set (backend `_ACCEPTED_MIME`) and extension set (`_ACCEPTED_EXT`):

| New type | MIME | Extension |
|----------|------|-----------|
| GIF | `image/gif` | `.gif` |
| MP4 | `video/mp4` | `.mp4` |
| MOV | `video/quicktime` | `.mov` |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `.pptx` |
| PPT | `application/vnd.ms-powerpoint` | `.ppt` |
| DOC | `application/msword` | `.doc` |

Previously accepted types (PDF, DOCX, PNG, JPG) retained unchanged.
