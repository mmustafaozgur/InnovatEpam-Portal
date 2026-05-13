# Implementation Plan: Evaluation Workflow

**Branch**: `004-evaluation-workflow` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-evaluation-workflow/spec.md`

## Summary

Add a lifecycle evaluation system to the idea submission portal. Admins can move ideas through a
linear state machine (`submitted → under_review → accepted | rejected`), attach optional comments,
and are exclusively bound to the ideas they pick up. All authenticated users see a status badge on
every idea; comment visibility is gated by role and status. A status-filter dropdown is added to
the ideas list. Evaluation data is stored as four inline columns on the existing `ideas` table.

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript 5.x (frontend)

**Primary Dependencies**:
- Backend: FastAPI, SQLAlchemy (async / aiosqlite), Pydantic v2
- Frontend: React 19, React Hook Form, Zod, shadcn/ui, Tailwind CSS

**Storage**: SQLite via SQLAlchemy ORM (`Base.metadata.create_all`). No Alembic — schema changes
require a manual migration script (`scripts/migrate_eval.py`) using `ALTER TABLE … ADD COLUMN`.

**Testing**: pytest + pytest-asyncio + httpx (backend) · Vitest + React Testing Library (frontend)

**Target Platform**: Local development server / Linux server

**Project Type**: Full-stack web application (FastAPI backend + React/Vite frontend)

**Performance Goals**:
- All API endpoints: <100 ms p95 under normal load (Constitution Principle II)
- Status-filter list query: <500 ms (SC-005) — satisfied by `idx_ideas_evaluation_status` index

**Constraints**:
- SQLite (no migration framework); `alter table` migration script required for existing DBs
- Single evaluator per idea (assigned on first "under review" transition; immutable after)
- No audit trail, no notifications, no multi-reviewer workflow (explicitly out of scope)
- Comment max 1,000 characters; status single-select only in filter UI

**Scale/Scope**: Bootcamp scope; single-instance deployment; idea volume expected < 10 k rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see bottom of file.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Spec-Driven Development | ✅ PASS | spec.md approved; plan in progress |
| II | High-Performance Engineering | ✅ PASS | `idx_ideas_evaluation_status` index planned; single-row UPDATE for evaluate action; no N+1 |
| III | Test-Driven Development | ✅ PASS | TDD enforced in tasks.md — tests written and confirmed failing before each impl phase |
| IV | Design System Compliance | ⚠ CONDITIONAL | `EvaluationStatusBadge`, `EvaluationForm`, `StatusFilter` components not yet in MASTER.md — `/ui-ux-pro-max` amendment **required before any UI task begins** |
| V | Simplicity & Minimalism | ✅ PASS | Inline columns (no new table); single endpoint; no abstraction layers beyond existing service/route pattern |

**ADR Check**: Constitution §3 requires an "ADRs Referenced" table and a new ADR for any unrecorded
decision. The inline-storage decision is not covered by an existing ADR → `docs/adr/009-evaluation-inline-storage.md` created as part of this plan.

### ADRs Referenced

| ADR | Title | Relevance |
|-----|-------|-----------|
| [001](../../docs/adr/001-sqlite-storage.md) | SQLite Storage | Storage layer + migration approach |
| [000](../../docs/adr/000-python-fastapi-backend.md) | Python / FastAPI Backend | Service + route patterns |
| [002](../../docs/adr/002-react-vite-frontend.md) | React / Vite Frontend | Component + page patterns |
| [004](../../docs/adr/004-test-driven-development.md) | Test-Driven Development | TDD gate enforcement |
| [003](../../docs/adr/003-design-system-master.md) | Design System MASTER.md | UI component gate |
| [009](../../docs/adr/009-evaluation-inline-storage.md) | Evaluation Inline Storage | **NEW** — inline columns vs separate table |

**Constitution Check Post-Phase-1**: See bottom of file — re-evaluated after data-model.md and
contracts are complete.

## Project Structure

### Documentation (this feature)

```text
specs/004-evaluation-workflow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── evaluate-idea.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code Changes

```text
backend/
├── app/
│   ├── models/
│   │   └── idea.py              # + evaluation_status, evaluation_comment, evaluated_at,
│   │                            #   assigned_admin_id columns + CheckConstraint + Index
│   ├── schemas/
│   │   └── ideas.py             # + EvaluationStatus literal, EvaluateIdeaRequest,
│   │                            #   EvaluationInfo; update IdeaDetailResponse + IdeaSummaryResponse
│   ├── services/
│   │   └── idea_service.py      # + evaluate_idea(); update list_ideas() (status filter),
│   │                            #   get_idea() (visibility rules)
│   └── api/routes/
│       └── ideas.py             # + PATCH /ideas/{id}/evaluate; update GET ?status= param
├── scripts/
│   └── migrate_eval.py          # One-time ALTER TABLE script for existing DBs
└── tests/
    ├── unit/
    │   └── test_idea_service.py # + evaluate_idea tests (state machine, lock, assignment)
    └── integration/
        └── test_idea_routes.py  # + PATCH evaluate endpoint + status filter tests

frontend/
├── src/
│   ├── types/
│   │   └── ideas.ts             # + EvaluationStatus, EvaluationInfo; update response types
│   ├── api/
│   │   └── ideas.ts             # + evaluateIdea(); update listIdeas() (status param)
│   ├── pages/
│   │   ├── IdeasPage.tsx        # + StatusFilter dropdown in filter bar
│   │   └── IdeaDetailPage.tsx   # + EvaluationStatusBadge + EvaluationForm (admin) + comment display
│   └── components/ideas/
│       ├── EvaluationStatusBadge.tsx  # NEW: colored badge per status
│       ├── EvaluationForm.tsx         # NEW: admin-only status select + comment textarea
│       └── StatusFilter.tsx           # NEW: status dropdown in filter bar

docs/adr/
└── 009-evaluation-inline-storage.md   # NEW

design-system/innovatepam/
└── MASTER.md                          # MUST be amended via /ui-ux-pro-max before UI tasks
```

## Complexity Tracking

No constitution violations requiring justification. The schema migration script is a minimal
addition required only because the project lacks a migration framework (ADR 001 decision).

---

## Constitution Check Post-Phase-1

*Re-evaluated after data-model.md and contracts are complete.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Spec-Driven Development | ✅ PASS | All design decisions trace to spec requirements |
| II | High-Performance Engineering | ✅ PASS | `idx_ideas_evaluation_status` index on `ideas.evaluation_status`; evaluate action is a single UPDATE; list query adds one optional WHERE clause — no N+1 introduced |
| III | Test-Driven Development | ✅ PASS | Test cases enumerated in data-model.md; tasks.md will enforce Red-Green-Refactor order |
| IV | Design System Compliance | ⚠ CONDITIONAL | MASTER.md amendment (via `/ui-ux-pro-max`) is a **hard gate** before tasks T-UI-01 through T-UI-05; documented in quickstart.md |
| V | Simplicity & Minimalism | ✅ PASS | 4 new columns; 1 new endpoint; 3 new frontend components; 1 migration script — no new abstractions, no new dependencies |
