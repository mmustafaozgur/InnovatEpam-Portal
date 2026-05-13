# Implementation Plan: Idea Submission System

**Branch**: `002-idea-submission` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-idea-submission/spec.md`

---

## Summary

Allow authenticated EPAM employees (Submitter role) to submit innovation ideas with title,
description, category, and an optional file attachment (PDF/DOCX/PNG/JPG, ≤ 10 MB). Ideas
are stored in SQLite; files are stored on the filesystem under `backend/uploads/`. All
authenticated users can browse a paginated ideas list and view idea detail pages. File
downloads are restricted server-side to the idea's original submitter and Evaluators.

---

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript 6.0 (frontend)

**Primary Dependencies**:
- Backend: FastAPI, Pydantic, SQLAlchemy async, aiosqlite, python-multipart *(all existing)*
- Frontend: React 19, Vite, react-hook-form, zod, react-router-dom, Tailwind CSS, shadcn/ui
- **New**: `@radix-ui/react-select` (frontend npm — required for shadcn/ui Select component)

**Storage**: SQLite for idea metadata + file metadata · Filesystem `backend/uploads/` for file blobs

**Testing**: pytest + pytest-asyncio + httpx (backend) · Vitest + React Testing Library + msw (frontend)

**Target Platform**: Windows/Linux server (dev: Windows 11 PowerShell)

**Project Type**: Full-stack web application (authenticated feature addition)

**Performance Goals**:
- All API endpoints: sub-100ms p95 under normal load (Principle II)
- Ideas list: ≤ 1 s for ≤ 500 ideas (SC-002)
- File upload validation feedback: ≤ 2 s from file selection (SC-003)

**Constraints**:
- File types: PDF, DOCX, PNG, JPG only — max 10 MB per file, one file per idea
- Filesystem storage only — SQLite BLOBs explicitly out of scope (FR-016)
- No idea edit/delete, no status workflow, no admin-managed categories (v1 scope)
- Categories hardcoded: Process Improvement · Technology · Cost Saving · Other

**Scale/Scope**: ~50–200 internal EPAM employees · Low concurrency · SQLite write lock is not a bottleneck

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design — see final column.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|-----------|-------------|-------|
| I. Spec-Driven | ✅ PASS | ✅ PASS | `spec.md` approved; plan follows workflow order |
| II. High-Performance | ✅ PASS | ✅ PASS | `idx_ideas_submitted_at` + `idx_ideas_submitter_id` designed in data-model; no N+1 (JOIN, not loop) |
| III. TDD | ✅ PASS | ✅ PASS | tasks.md will enforce Red-Green-Refactor; tests written before impl |
| IV. Design System | ✅ PASS | ✅ PASS | `MASTER.md` §"Idea Submission Components (Feature 002)" covers all new components |
| V. Simplicity | ✅ PASS | ✅ PASS | 1 new npm dep; no new pip deps; filesystem storage per spec; no over-abstraction |

No constitution violations — Complexity Tracking table omitted.

---

## ADRs Referenced

| ADR | Title | Scope |
|-----|-------|-------|
| [ADR-000](../../docs/adr/000-python-fastapi-backend.md) | Python 3.11 + FastAPI + Pydantic | Project-wide backend stack |
| [ADR-001](../../docs/adr/001-sqlite-storage.md) | SQLite as sole storage engine | Project-wide storage |
| [ADR-002](../../docs/adr/002-react-vite-frontend.md) | React + Vite + TS + Tailwind + shadcn/ui | Project-wide frontend stack |
| [ADR-004](../../docs/adr/004-test-driven-development.md) | Test-Driven Development (Red-Green-Refactor) | Project-wide testing discipline |
| [ADR-006](../../docs/adr/006-user-auth-system.md) | User Authentication System | Role enforcement, session/cookie auth |
| [ADR-007](../../docs/adr/007-file-storage-filesystem.md) | Filesystem file storage for attachments | **New — created during this planning phase** |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-idea-submission/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── ideas.py              # NEW — idea CRUD + download endpoints
│   ├── models/
│   │   └── idea.py                   # NEW — Idea SQLAlchemy model
│   ├── schemas/
│   │   └── ideas.py                  # NEW — Pydantic request/response schemas
│   ├── services/
│   │   └── idea_service.py           # NEW — business logic (create, list, get, auth check)
│   ├── core/
│   │   └── config.py                 # MODIFY — add UPLOAD_DIR setting + upload_path() helper
│   └── database.py                   # MODIFY — import app.models.idea to register table
├── main.py                           # MODIFY — include ideas_router
├── requirements.txt                  # NO CHANGE (python-multipart already present)
├── tests/
│   ├── integration/
│   │   └── test_idea_routes.py       # NEW
│   └── unit/
│       └── test_idea_service.py      # NEW
└── uploads/                          # Runtime-created; gitignored

frontend/src/
├── api/
│   └── ideas.ts                      # NEW — submitIdea, listIdeas, getIdea
├── components/
│   └── ideas/
│       ├── CategoryBadge.tsx         # NEW
│       ├── CharacterCounter.tsx      # NEW
│       ├── FileDownloadBlock.tsx     # NEW
│       ├── FileUploadControl.tsx     # NEW
│       ├── IdeasTable.tsx            # NEW
│       ├── IdeasTableSkeleton.tsx    # NEW
│       └── RoleRestrictionNotice.tsx # NEW
├── pages/
│   ├── IdeasPage.tsx                 # NEW
│   ├── IdeaDetailPage.tsx            # NEW
│   └── SubmitIdeaPage.tsx            # NEW
├── types/
│   └── ideas.ts                      # NEW — IdeaDetailResponse, IdeaListResponse, etc.
└── App.tsx                           # MODIFY — add /submit, /ideas, /ideas/:id routes
```

**Structure Decision**: Extends the existing Option 2 web-application layout (`backend/` +
`frontend/`) without creating new top-level directories. Backend uses the same service/route/model
layer structure established in `001-user-auth`.

---

## Phase 0: Research

**Status**: Complete — see [research.md](research.md)

Key decisions resolved:
1. FastAPI `UploadFile` + `Form()` for multipart submissions (python-multipart already installed)
2. `anyio.to_thread.run_sync` + stdlib `Path.write_bytes()` for async file writes — no new pip deps
3. `FileResponse` (starlette, transitive dep) for authenticated file serving
4. Dual MIME + extension file type validation
5. Client-side double-submit prevention via react-hook-form `isSubmitting`
6. Offset pagination `?page=&limit=` for ideas list
7. `@radix-ui/react-select` is the only new dependency (npm, for shadcn/ui Select)

---

## Phase 1: Design Artifacts

**Status**: Complete

- [data-model.md](data-model.md) — Idea entity, indices, SQLAlchemy model, query patterns
- [contracts/api.md](contracts/api.md) — 4 endpoints, request/response schemas, validation rules
- [quickstart.md](quickstart.md) — Dev setup, new deps, test commands
- [ADR-007](../../docs/adr/007-file-storage-filesystem.md) — Filesystem storage decision

---

## Implementation Notes for /speckit-tasks

These notes inform task generation but do NOT replace tasks.md:

### Backend task sequence (TDD order)
1. `Idea` model + DB migration (import in `database.py`)
2. Pydantic schemas (`IdeaCreateRequest`, `IdeaDetailResponse`, `IdeaSummaryResponse`, `IdeaListResponse`)
3. `idea_service.py` — write unit tests first, then implement:
   - `create_idea()` — validate category, save file, insert row
   - `list_ideas()` — paginated JOIN query
   - `get_idea()` — single JOIN query
   - `get_attachment_path()` — path resolution + auth check
4. `ideas.py` route — write integration tests first, then implement:
   - `POST /api/v1/ideas` (role guard: submitter only)
   - `GET /api/v1/ideas`
   - `GET /api/v1/ideas/{id}`
   - `GET /api/v1/ideas/{id}/attachment` (role + ownership guard)
5. Wire router in `main.py`
6. Update `config.py` with `UPLOAD_DIR` + `upload_path()` helper

### Frontend task sequence (TDD order)
1. Types (`types/ideas.ts`)
2. API client (`api/ideas.ts`) — write MSW mock tests first
3. Shared components (write Vitest + RTL tests first):
   - `CategoryBadge`, `CharacterCounter`, `FileUploadControl`, `FileDownloadBlock`
   - `IdeasTableSkeleton`, `RoleRestrictionNotice`
4. Page components (write RTL tests first):
   - `SubmitIdeaPage` + `IdeaSubmissionForm` (with zod schema + react-hook-form)
   - `IdeasPage` + `IdeasTable`
   - `IdeaDetailPage`
5. Wire routes in `App.tsx`
6. Install `@radix-ui/react-select` + run `npx shadcn@latest add select textarea`

### Security checklist for implementation
- Title/description are displayed via React (XSS safe via JSX escaping — no `dangerouslySetInnerHTML`)
- Stored filename uses UUID slug — no user input in filesystem path
- File type checked via MIME (from multipart header) AND extension — not content sniffing
- Download endpoint enforces auth via `Depends(get_current_user)` before any DB/disk access
- File size validated before writing to disk (read content, check len)
- `submitter_id` sourced from server session — never from request body
