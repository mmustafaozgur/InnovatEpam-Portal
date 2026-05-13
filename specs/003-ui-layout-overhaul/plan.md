# Implementation Plan: UI Layout Overhaul — Fixed Sidebar Shell

**Branch**: `003-ui-layout-overhaul` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-ui-layout-overhaul/spec.md`

---

## Summary

Replace the existing top navbar (`AppLayout.tsx`) with a fixed left sidebar shell (~220px)
that acts as the permanent layout wrapper for all protected pages. The sidebar renders a
brand link, role-gated navigation items with Lucide icons, an active-page pill highlight
(prefix-matched), and a user-identity footer with a Sign Out button. On mobile (≤768px) the
sidebar collapses behind a hamburger toggle. All five existing pages (Home, Ideas, IdeaDetail,
SubmitIdea, Users) render inside the content area — each page continues to own its own `<h1>`.

The only backend change is a `mine=true` query parameter on `GET /api/v1/ideas` that filters
results server-side to the authenticated submitter's own ideas. An `idx_ideas_submitter_id`
index already exists in the schema. The filter state and page number are persisted in the
browser URL (`?mine=1&page=N`) via React Router `useSearchParams`.

---

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript 5.x (frontend)

**Primary Dependencies**:
- Backend: FastAPI, SQLAlchemy async (all existing — no new pip deps)
- Frontend: React 19, Vite, react-router-dom v6, Tailwind CSS, shadcn/ui, lucide-react
- **New npm**: none — Lucide icons and all required shadcn/ui components are already installed

**Storage**: SQLite (unchanged) — `idx_ideas_submitter_id` index already exists on `ideas.submitter_id`

**Testing**: pytest + pytest-asyncio + httpx (backend) · Vitest + React Testing Library (frontend)

**Target Platform**: Windows/Linux server (dev: Windows 11 PowerShell)

**Project Type**: Full-stack web application (layout refactor + filter feature addition)

**Performance Goals**:
- Sidebar renders synchronously from auth context — zero additional network round-trips on any page load
- `mine` filter: sub-100ms p95 (equality filter on `idx_ideas_submitter_id` — existing index covers it)
- All protected pages load within 1 s with sidebar rendered (SC-001)

**Constraints**:
- No new data models, DB migrations, or API endpoints beyond `mine` query param on existing `GET /api/v1/ideas`
- No new npm or pip dependencies
- Sidebar is purely structural — it is not an authorization boundary (route guards unchanged)
- Mobile breakpoint: ≤768px (Tailwind `md:` prefix)

**Scale/Scope**: ~50–200 internal EPAM employees · No concurrency impact from layout change

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design — see final column.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|-----------|-------------|-------|
| I. Spec-Driven | ✅ PASS | ✅ PASS | `spec.md` approved + clarified; plan follows workflow order |
| II. High-Performance | ✅ PASS | ✅ PASS | `idx_ideas_submitter_id` already in schema; sidebar adds zero DB queries |
| III. TDD | ✅ PASS | ✅ PASS | Tasks enforce Red-Green-Refactor; Sidebar.test.tsx + mine-filter tests written before impl |
| IV. Design System | ✅ PASS | ✅ PASS | MASTER.md §"Sidebar Shell (Feature 003)" written as first implementation task — no sidebar code written before this gate |
| V. Simplicity | ✅ PASS | ✅ PASS | Zero new dependencies; one new component (`Sidebar.tsx`); `AppLayout.tsx` rewritten not wrapped; mobile uses CSS transition not a third-party drawer |

No constitution violations — Complexity Tracking table omitted.

---

## ADRs Referenced

| ADR | Title | Scope |
|-----|-------|-------|
| [ADR-002](../../docs/adr/002-react-vite-frontend.md) | React + Vite + TS + Tailwind + shadcn/ui | Project-wide frontend stack |
| [ADR-003](../../docs/adr/003-design-system-master.md) | Design System MASTER.md governance | Design gate: MASTER.md amendment required before sidebar code |
| [ADR-004](../../docs/adr/004-test-driven-development.md) | Test-Driven Development (Red-Green-Refactor) | Project-wide testing discipline |
| [ADR-005](../../docs/adr/005-spec-driven-development.md) | Spec-Driven Development | Workflow compliance |
| [ADR-008](../../docs/adr/008-sidebar-shell-layout.md) | Sidebar Shell as Universal Layout Contract | **New — created during this planning phase** |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-layout-overhaul/
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
backend/app/
├── api/routes/
│   └── ideas.py                   # MODIFY — add mine: bool = Query(False) param
└── services/
    └── idea_service.py            # MODIFY — add submitter_id_filter param to list_ideas

frontend/src/
├── components/
│   └── layout/
│       ├── AppLayout.tsx          # REWRITE — top navbar removed; renders <Sidebar> + content slot
│       └── Sidebar.tsx            # NEW — sidebar nav component (brand, nav, user footer, mobile)
├── pages/
│   ├── IdeasPage.tsx              # MODIFY — useSearchParams for mine/page, mine toggle UI
│   ├── HomePage.tsx               # MODIFY — visual polish per MASTER.md
│   ├── IdeaDetailPage.tsx         # MODIFY — visual polish per MASTER.md
│   ├── SubmitIdeaPage.tsx         # MODIFY — visual polish per MASTER.md
│   └── UsersPage.tsx              # MODIFY — visual polish per MASTER.md
└── api/
    └── ideas.ts                   # MODIFY — add mine?: boolean param to listIdeas

design-system/innovatepam/
└── MASTER.md                      # AMEND — add §"Sidebar Shell (Feature 003-ui-layout-overhaul)"

docs/adr/
└── 008-sidebar-shell-layout.md    # NEW ADR — sidebar as universal layout contract

backend/tests/
├── integration/
│   └── test_idea_routes.py        # MODIFY — add mine filter integration tests
└── unit/
    └── test_idea_service.py       # MODIFY — add mine filter unit tests

frontend/src/
├── components/layout/__tests__/
│   └── Sidebar.test.tsx           # NEW — TDD tests for sidebar component
└── pages/__tests__/
    └── IdeasPage.test.tsx         # MODIFY — add mine filter + URL state tests
```

**Structure Decision**: Extends the existing Option 2 web-application layout without new
top-level directories. The layout change is contained entirely within `frontend/src/components/layout/`.
The backend change is a minimal additive change to an existing service function and route.

---

## Phase 0: Research

**Status**: Complete — see [research.md](research.md)

Key decisions resolved:
1. `useSearchParams` (React Router v6) for URL-persistent `mine` + `page` filter state
2. CSS `transform: translateX` transition for mobile sidebar overlay — no new library
3. Lucide `Home`, `Lightbulb`, `Plus`, `Users` icons for nav items (already installed)
4. `mine: bool = Query(False)` added to FastAPI route; passed as `submitter_id_filter` to service
5. Active nav highlight uses `pathname === to || (to !== '/' && pathname.startsWith(to))` — already present in current `AppLayout.tsx` `NavLink` helper, reused verbatim in `Sidebar.tsx`
6. Zero new npm or pip dependencies required

---

## Phase 1: Design Artifacts

**Status**: Complete

- [data-model.md](data-model.md) — No new entities; mine filter query pattern + index confirmation
- [contracts/api.md](contracts/api.md) — Updated `GET /api/v1/ideas` contract with `mine` param
- [quickstart.md](quickstart.md) — Dev setup, test commands, design gate reminder
- [ADR-008](../../docs/adr/008-sidebar-shell-layout.md) — Sidebar shell layout contract decision

---

## Implementation Notes for /speckit-tasks

These notes inform task generation but do NOT replace tasks.md:

### Design Gate (MUST complete before any sidebar code)

**Task 0**: Amend `design-system/innovatepam/MASTER.md` — add `§ Sidebar Shell (Feature 003-ui-layout-overhaul)` section covering:
- Sidebar shell CSS classes (fixed positioning, width, height, bg, border)
- Nav item default + active pill styles
- User footer layout
- Mobile overlay + hamburger button styles
- Content area offset (`ml-[220px]`)
- Layout contract padding/max-width conventions

This task MUST be merged into MASTER.md before any `Sidebar.tsx` code is written (Principle IV, ADR-003).

### Backend task sequence (TDD order)

1. Write unit tests for `list_ideas` with `submitter_id_filter` — confirm FAILING before step 2
2. Update `idea_service.py` — add `submitter_id_filter: str | None = None`; conditionally add `WHERE Idea.submitter_id = submitter_id_filter` and apply same filter to COUNT query
3. Write integration tests for `GET /api/v1/ideas?mine=true` — confirm FAILING before step 4
4. Update `ideas.py` route — add `mine: bool = Query(False, description="Filter to current user's ideas")`;  pass `submitter_id_filter=current_user.id if mine else None` to service

### Frontend Sidebar task sequence (TDD order)

1. Write `Sidebar.test.tsx` — confirm all tests FAILING before writing sidebar code:
   - Submitter sees: Home, Ideas, Submit an Idea (no Manage Users)
   - Admin sees: Home, Ideas, Manage Users (no Submit an Idea)
   - Active item highlighted on current route
   - Active item on sub-route (`/ideas/42` → Ideas highlighted)
   - Brand logo links to `/`
   - User name, role badge, Sign Out button visible in footer
   - Sign Out button calls `logout()` from `useAuth()`
   - Mobile: hamburger button visible, sidebar hidden at mobile widths (use `aria-hidden` or `data-testid` detection)
2. Implement `Sidebar.tsx` using MASTER.md sidebar spec
3. Rewrite `AppLayout.tsx` — remove `<nav>` block; import `<Sidebar />`; wrap content in `<div className="md:ml-[220px]"><Outlet /></div>`
4. Mobile: add hamburger button + `isOpen` state; CSS transition on sidebar panel; backdrop click handler

### Frontend Ideas filter task sequence (TDD order)

1. Update `api/ideas.ts` — add `mine = false` param; append `&mine=true` to URL when true
2. Write `IdeasPage.test.tsx` additions — confirm FAILING:
   - Submitter sees "My Ideas" toggle; Admin does not
   - Activating toggle sets `mine=1` in URL
   - `mine=1` in URL triggers API call with `mine=true`
   - Deactivating toggle removes `mine=1` from URL and resets to page 1
   - Pagination page param persists alongside mine param
3. Update `IdeasPage.tsx` — replace `useEffect` with `useSearchParams`-driven fetching; add toggle for submitters; wire pagination controls

### Frontend Page Polish task sequence

1. Audit all five pages against MASTER.md — note specific deviations (note in tasks.md)
2. Apply design system tokens: consistent `px-6 py-8` wrapper, `max-w-3xl` or `max-w-2xl` content columns per MASTER.md page specs, `font-heading font-semibold text-xl text-primary mb-6` page headings
3. Remove any bespoke one-off class strings that duplicate or contradict MASTER.md definitions

### Security checklist for implementation

- `mine` filter uses `current_user.id` from server session — never from request body or URL param value
- Sidebar nav item visibility is a UX-only gate; route guards (`ProtectedRoute`, `AdminRoute`) remain unchanged and are the true authorization boundary
- No new data exposed: the `mine` filter only narrows the existing list — it cannot expose ideas the user doesn't own
