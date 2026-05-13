# Quickstart: UI Layout Overhaul — Fixed Sidebar Shell

**Branch**: `003-ui-layout-overhaul` | **Date**: 2026-05-13

---

## Prerequisites

No new dependencies. All packages required by this feature are already installed.

```
# Verify existing deps are installed
cd frontend && npm install   # should be a no-op
cd backend  && pip install -r requirements.txt  # should be a no-op
```

---

## Development

### Start both servers

```powershell
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Open http://localhost:5173
```

### Design Gate Reminder

Before writing any sidebar code, verify that `design-system/innovatepam/MASTER.md` contains
the §"Sidebar Shell (Feature 003-ui-layout-overhaul)" section. If it is missing, add it via
`/ui-ux-pro-max` or directly amend MASTER.md — then get it reviewed before proceeding
(ADR-003, Principle IV).

---

## Running Tests

### Backend

```powershell
cd backend
.venv\Scripts\activate

# All tests
pytest

# Feature-specific tests only
pytest tests/unit/test_idea_service.py -v
pytest tests/integration/test_idea_routes.py -v

# TDD: confirm new mine-filter tests FAIL before implementing
pytest tests/unit/test_idea_service.py -k "mine" -v
pytest tests/integration/test_idea_routes.py -k "mine" -v
```

### Frontend

```powershell
cd frontend

# All tests
npm test

# Feature-specific tests only
npm test -- src/components/layout/__tests__/Sidebar.test.tsx
npm test -- src/pages/__tests__/IdeasPage.test.tsx

# TDD: confirm new tests FAIL before implementing
npm test -- src/components/layout/__tests__/Sidebar.test.tsx --run
npm test -- src/pages/__tests__/IdeasPage.test.tsx --run
```

### TypeScript type-check

```powershell
cd frontend
npx tsc --noEmit
```

---

## Key Files to Edit

| File | Change |
|------|--------|
| `design-system/innovatepam/MASTER.md` | Add sidebar shell section (FIRST — design gate) |
| `docs/adr/008-sidebar-shell-layout.md` | New ADR (create during plan phase) |
| `backend/app/services/idea_service.py` | Add `submitter_id_filter` param to `list_ideas` |
| `backend/app/api/routes/ideas.py` | Add `mine: bool = Query(False)` to list route |
| `frontend/src/components/layout/Sidebar.tsx` | New sidebar component |
| `frontend/src/components/layout/AppLayout.tsx` | Rewrite to use Sidebar, remove top nav |
| `frontend/src/api/ideas.ts` | Add `mine` param to `listIdeas` |
| `frontend/src/pages/IdeasPage.tsx` | Add mine toggle + `useSearchParams` pagination |
| `frontend/src/pages/HomePage.tsx` | Visual polish |
| `frontend/src/pages/IdeaDetailPage.tsx` | Visual polish |
| `frontend/src/pages/SubmitIdeaPage.tsx` | Visual polish |
| `frontend/src/pages/UsersPage.tsx` | Visual polish |

---

## Layout Contract Reference

From MASTER.md §"Sidebar Shell (Feature 003-ui-layout-overhaul)":

| Convention | Value |
|------------|-------|
| Sidebar width | `220px` (fixed) |
| Sidebar background | `bg-white border-r border-border` |
| Content area offset (desktop) | `md:ml-[220px]` |
| Standard page wrapper | `px-6 py-8` |
| Form content max-width | `max-w-2xl mx-auto` |
| Detail content max-width | `max-w-3xl` |
| Table pages | full-width (no max-width column) |
| Mobile breakpoint | `md:` = ≥768px |
