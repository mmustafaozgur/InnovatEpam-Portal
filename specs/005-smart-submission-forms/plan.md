# Implementation Plan: Smart Submission Forms

**Branch**: `005-smart-submission-forms` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-smart-submission-forms/spec.md`

## Summary

Extend the idea submission form to display category-specific extra fields dynamically when a category is selected, persist them in a new `extra_data` TEXT column on the `ideas` table (JSON-serialised, nullable), validate them on both client and server, and surface them in API responses and a dedicated "Details" section on the idea detail page. The feature also expands the valid category set from 4 to 7 values. Key work: one SQLite migration, a new backend validation module, Pydantic schema additions, a dynamic form section in the frontend, and an `ExtraDataDetails` display component.

---

## Technical Context

**Language/Version**: Python 3.11 (backend) · TypeScript ~6.0 (frontend)

**Primary Dependencies**: FastAPI · Pydantic v2 · SQLAlchemy 2 (asyncio) · aiosqlite · React 19 + Vite · react-hook-form 7 · Zod 4 · shadcn/ui (Radix primitives) · Tailwind CSS 3

**Storage**: SQLite via aiosqlite — new `extra_data TEXT NULL` inline column on `ideas` table; JSON blob (see ADR 010)

**Testing**: pytest + pytest-asyncio + httpx (backend) · Vitest + React Testing Library + msw (frontend)

**Target Platform**: Linux server; development on Windows 11

**Project Type**: Web application (FastAPI backend + React + Vite frontend)

**Performance Goals**: Sub-100ms p95 on all modified endpoints (Principle II); < 200ms category-switch field render (SC-001)

**Constraints**: SQLite only (ADR 001); no new npm/PyPI dependencies; JSON column (ADR 010); no edit-idea scope (spec Assumption)

**Scale/Scope**: One column addition to `ideas`; 7 categories; max 3 extra fields per category; ~8 files modified, ~6 files created

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Evidence |
|-----------|-----------|-------------|---------|
| I. Spec-Driven Development | ✅ | ✅ | spec.md and clarifications complete; plan follows spec exactly |
| II. High-Performance Engineering | ✅ | ✅ | No new JOINs; `extra_data` is inline column; list and detail reads unchanged in structure; N+1 audit: none introduced |
| III. Test-Driven Development | ✅ | ✅ | All tasks write failing tests before production code; test files listed in project structure |
| IV. Design System Compliance | ✅ | ✅ | MASTER.md exists; new components (`ExtraFieldsSection`, `ExtraDataDetails`) use existing Tailwind + shadcn/ui patterns; `CharacterCounter` reused |
| V. Simplicity & Minimalism | ✅ | ✅ | One column; no new table; no new dependencies; JSON column justified in ADR 010 |

**ADRs Referenced**:

| ADR | Title | Relevance |
|-----|-------|-----------|
| ADR 001 | SQLite as Sole Storage Engine | `extra_data` stored as TEXT in SQLite |
| ADR 009 | Evaluation Inline Storage | Precedent for inline vs. JSON vs. separate table; objection to JSON does not apply here (no index needed) |
| ADR 010 | Extra Data JSON Column | **New** — documents JSON TEXT column decision for this feature |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-smart-submission-forms/
├── plan.md              # This file
├── research.md          # Phase 0 — storage, transport, validation, frontend strategy
├── data-model.md        # Phase 1 — DB schema, field definitions, Pydantic changes
├── quickstart.md        # Phase 1 — run migration + smoke tests
├── contracts/
│   └── api.md           # Phase 1 — API contract changes (3 endpoints affected)
└── tasks.md             # Phase 2 — /speckit-tasks output
```

### Source Code

```text
backend/
├── app/
│   ├── models/
│   │   └── idea.py                       MODIFIED  +extra_data column; expanded category constraint
│   ├── schemas/
│   │   ├── ideas.py                      MODIFIED  +extra_data in IdeaDetailResponse, IdeaSummaryResponse; expanded IdeaCategory
│   │   └── extra_data.py                 NEW       CATEGORY_FIELD_SCHEMA + validate_extra_data()
│   ├── services/
│   │   └── idea_service.py               MODIFIED  validate + persist extra_data; return in list/get
│   └── api/routes/
│       └── ideas.py                      MODIFIED  extra_data Form field; pass to service; map validation errors
├── scripts/
│   └── migrate_extra_data.py             NEW       ADD COLUMN + category constraint expansion (idempotent)
└── tests/
    ├── test_extra_data_validation.py     NEW       unit tests for validate_extra_data()
    └── test_ideas_api_extra_data.py      NEW       integration tests — create, list, get with extra_data

frontend/
├── src/
│   ├── types/
│   │   └── ideas.ts                      MODIFIED  +extra_data on IdeaDetailResponse, IdeaSummaryResponse
│   ├── api/
│   │   └── ideas.ts                      MODIFIED  serialize extra_data into FormData on submit
│   ├── components/ideas/
│   │   ├── ExtraFieldsSection.tsx        NEW       dynamic form fields for selected category
│   │   ├── ExtraDataDetails.tsx          NEW       read-only detail-page rendering
│   │   └── __tests__/
│   │       ├── ExtraFieldsSection.test.tsx  NEW
│   │       └── ExtraDataDetails.test.tsx    NEW
│   └── pages/
│       ├── SubmitIdeaPage.tsx            MODIFIED  integrate ExtraFieldsSection + Zod superRefine
│       └── IdeaDetailPage.tsx            MODIFIED  render ExtraDataDetails section
docs/adr/
└── 010-extra-data-json-column.md         NEW
```

---

## Phase 0: Research

**Status**: Complete — see [research.md](research.md)

Key decisions resolved:

| # | Decision | Outcome |
|---|----------|---------|
| 1 | `extra_data` storage approach | JSON TEXT column on `ideas` (ADR 010) |
| 2 | Category constraint migration | Two-step: ALTER TABLE ADD COLUMN + table recreation |
| 3 | Transport in multipart form | `extra_data` as JSON string Form field |
| 4 | Frontend dynamic schema | Flat Zod schema + `superRefine` + `resetField` on category change |
| 5 | Server-side validation module | `extra_data.py` with `validate_extra_data()` returning field-keyed error dict |

---

## Phase 1: Design & Contracts

**Status**: Complete

### Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Data Model | [data-model.md](data-model.md) | ✅ Complete |
| API Contract | [contracts/api.md](contracts/api.md) | ✅ Complete |
| Quickstart | [quickstart.md](quickstart.md) | ✅ Complete |
| ADR 010 | [docs/adr/010-extra-data-json-column.md](../../docs/adr/010-extra-data-json-column.md) | ✅ Complete |

### Design Summary

**Backend**:
- `backend/app/schemas/extra_data.py` — canonical `CATEGORY_FIELD_SCHEMA` dict + `validate_extra_data(category, extra_data)` function that returns field-keyed error dict
- `Idea` model gains `extra_data = Column(String, nullable=True)`; category CHECK expands to 7 values
- `IdeaCategory` Literal expands to 7 values
- `IdeaDetailResponse` and `IdeaSummaryResponse` gain `extra_data: Optional[dict[str, Any]] = None`
- Route receives `extra_data: Optional[str] = Form(None)`; parses JSON; calls validator; on error raises 422 with `{"detail": {"extra_data": {field: message}}}`
- `create_idea` persists `json.dumps(extra_data)` (or None); `get_idea`/`list_ideas` return `json.loads(idea.extra_data)` (or None)

**Frontend**:
- `ExtraFieldsSection` component: accepts `category` prop, renders the correct fields using `CharacterCounter` (text), `Input` (number), `Select` (select); `maxLength` hard-cap on text `Input`/`Textarea`
- `SubmitIdeaPage`: watches `category`; on change, `resetField` for all extra keys; on submit, collects extra values from form state and appends as `JSON.stringify` to FormData
- `ExtraDataDetails` component: accepts `category` and `extra_data`; looks up labels from a frontend-side field schema; renders a `dl` list under a "Details" heading; renders nothing if `extra_data` is null
- `IdeaDetailPage`: renders `<ExtraDataDetails />` when `idea.extra_data` is non-null

### N+1 Audit (post-design)

All reads of `extra_data` happen as part of existing single-row or paginated queries. No new queries or loops introduced. **Principle II satisfied.**

---

## Complexity Tracking

No Constitution violations to justify. JSON column complexity is documented in ADR 010 and aligns with Principle V.
