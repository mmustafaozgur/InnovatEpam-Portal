# Implementation Plan: Multi-Stage Review Pipeline

**Branch**: `007-multi-stage-review` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-multi-stage-review/spec.md`

## Summary

Replace the single `evaluation_status` inline-column workflow (Feature 004) with a four-stage
review pipeline: `new_idea → initial_screening → technical_review → business_impact_assessment →
final_selection`. Each stage transition creates an immutable `stage_review` record capturing the
target stage, reviewer, timestamp, optional comment, and — at the terminal stage — an explicit
`accepted`/`rejected` outcome. A one-time migration script maps all existing ideas from the old
`evaluation_status` values to the new model, then drops the old inline columns.

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI · Pydantic · SQLAlchemy async (aiosqlite) · React + Vite ·
Tailwind CSS · shadcn/ui

**Storage**: SQLite via aiosqlite

**Testing**: pytest (backend) · Vitest + React Testing Library (frontend)

**Target Platform**: Web service (Linux server) + web browser

**Project Type**: Web application (backend FastAPI + frontend React)

**Performance Goals**: Sub-100ms p95 for all API endpoints (Constitution Principle II)

**Constraints**: SQLite only; `stage_reviews` bounded at max 4 rows per idea; comments max 1000 chars

**Scale/Scope**: Bootcamp project; small user base; no concurrent load spike expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven | ✅ PASS | `spec.md` approved with clarifications; planning runs in order |
| II. High-Performance | ✅ PASS | `idx_stage_reviews_idea_id` index; max 4 rows per idea; single JOIN per detail response |
| III. TDD | ⚠ GATE | Tests must fail before implementation in every task — enforced in `tasks.md` |
| IV. Design System | ✅ PASS | `design-system/innovatepam/MASTER.md` exists; all new components must reference it before implementation |
| V. Simplicity | ✅ JUSTIFIED | `stage_reviews` table adds one new table; justified by FR-003 (immutable audit trail); ADR-009 anticipated this migration; documented in Complexity Tracking |

**Post-Phase-1 Re-check**: Constitution Check confirmed after data model and contracts finalised.
The `stage_reviews` table adds one table with 7 columns and a single index. No additional complexity
was introduced beyond what FR-003 requires. Design System gate remains active for all UI tasks.

## ADRs Referenced

| ADR | Title | Relevance |
|-----|-------|-----------|
| [ADR-000](../../docs/adr/000-python-fastapi-backend.md) | Python FastAPI Backend | Backend technology stack |
| [ADR-001](../../docs/adr/001-sqlite-storage.md) | SQLite Storage | Storage layer; migration strategy |
| [ADR-002](../../docs/adr/002-react-vite-frontend.md) | React + Vite Frontend | Frontend technology stack |
| [ADR-003](../../docs/adr/003-design-system-master.md) | Design System Master | UI component standards; gate for new components |
| [ADR-004](../../docs/adr/004-test-driven-development.md) | Test-Driven Development | TDD enforcement |
| [ADR-009](../../docs/adr/009-evaluation-inline-storage.md) | Evaluation Inline Storage | **Superseded** by ADR-012 for this feature |
| [ADR-012](../../docs/adr/012-stage-review-table.md) | Stage Review Table | Architecture decision for multi-stage pipeline — created for this feature |

## Project Structure

### Documentation (this feature)

```text
specs/007-multi-stage-review/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code

```text
backend/
├── app/
│   ├── models/
│   │   ├── idea.py              # MODIFY: add current_stage; remove old eval columns post-migration
│   │   └── stage_review.py      # NEW: StageReview SQLAlchemy model
│   ├── schemas/
│   │   └── ideas.py             # MODIFY: StageReviewRecord, updated IdeaDetailResponse/IdeaSummaryResponse
│   ├── services/
│   │   └── idea_service.py      # MODIFY: advance_stage(); updated list/get with stage_reviews + visibility filter
│   └── api/
│       └── routes/
│           └── ideas.py         # MODIFY: POST /reviews; remove PATCH /evaluate
├── scripts/
│   └── migrate_stage_reviews.py  # NEW: one-time migration (idempotent)
└── tests/
    ├── unit/
    │   └── test_idea_service.py  # MODIFY: add advance_stage, visibility, lock, race-condition tests
    └── integration/
        └── test_idea_routes.py   # MODIFY: add /reviews endpoint tests; update /ideas and /ideas/{id} tests

frontend/
├── src/
│   ├── types/
│   │   └── ideas.ts                        # MODIFY: Stage, Outcome, StageReviewRecord, AdvanceStageRequest
│   ├── api/
│   │   └── ideas.ts                        # MODIFY: advanceStage(); updated list/detail shapes
│   ├── components/ideas/
│   │   ├── StageTimeline.tsx               # NEW: chronological stage review list
│   │   ├── StageAdvanceForm.tsx            # NEW: advance stage with comment + outcome selector
│   │   ├── StageBadge.tsx                  # NEW: replaces EvaluationStatusBadge
│   │   └── StageFilter.tsx                 # NEW: replaces StatusFilter
│   └── pages/
│       └── IdeaDetailPage.tsx              # MODIFY: show StageTimeline; conditionally show StageAdvanceForm
```

**Structure Decision**: Web application — existing backend FastAPI + frontend React layout.
No new top-level directories. One new backend model file; four new frontend components.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| New `stage_reviews` table (separate from `ideas`) | FR-003 requires an immutable audit trail of every stage transition; one idea produces up to 4 records. The ADR-009 inline approach cannot store multiple records per idea. | Extending inline columns (4 stages × 3 fields = 12 new nullable columns) cannot represent ordered history and does not scale if stages change. ADR-009 explicitly noted this schema change was required for history. |
