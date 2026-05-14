# Quickstart: UI/UX Refactoring (009)

## Prerequisites

- Node.js ≥ 18, Python 3.11+
- Both `frontend/` and `backend/` installed

## Running the Dev Environment

```bash
# Terminal 1 — Backend
cd backend
source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:5173 · Backend: http://localhost:8000

## Running Tests

```bash
# Frontend tests (Vitest)
cd frontend
npm test

# Backend tests (pytest)
cd backend
.venv\Scripts\python -m pytest
```

## Install New Dependency (required for this feature)

```bash
cd frontend
npm install @radix-ui/react-dialog
```

After installing, add `frontend/src/components/ui/dialog.tsx` (shadcn/ui wrapper pattern).

## Key Files for This Feature

| File | Change |
|------|--------|
| `frontend/src/components/ideas/StageFilterCards.tsx` | **NEW** — multi-select filter card component |
| `frontend/src/components/ui/dialog.tsx` | **NEW** — Radix Dialog wrapper |
| `frontend/src/components/ui/ConfirmationDialog.tsx` | **NEW** — shared confirmation dialog |
| `frontend/src/components/auth/PrivacyPolicyModal.tsx` | **NEW** — privacy policy modal |
| `frontend/src/pages/HomePage.tsx` | Stage navigation cards |
| `frontend/src/pages/IdeasPage.tsx` | Multi-select stage filter |
| `frontend/src/components/ideas/IdeasTable.tsx` | Column reorder |
| `frontend/src/components/ideas/StageAdvanceForm.tsx` | Confirmation before advancing |
| `frontend/src/pages/SubmitIdeaPage.tsx` | Confirmation before submit + category error |
| `frontend/src/components/auth/RegisterForm.tsx` | Privacy Policy modal trigger |
| `frontend/src/pages/IdeaDetailPage.tsx` | Entrance animation |
| `frontend/src/components/ideas/StageBadge.tsx` | Smooth color transition |
| `frontend/src/api/ideas.ts` | Multi-stage `listIdeas` |
| `backend/app/api/routes/ideas.py` | `List[Stage]` query param |
| `backend/app/services/idea_service.py` | `.in_()` filter |

## Design System Reference

All visual changes must reference `design-system/innovatepam/MASTER.md` for colours, typography, spacing, and shadow tokens. Page-specific overrides go in `design-system/innovatepam/pages/`.

## Animation Tokens

- Entrance animation: `@keyframes slideUpFade` in `frontend/src/index.css` — 250ms ease-out
- Badge transition: Tailwind `transition-colors duration-150`
- Reduced motion: CSS `@media (prefers-reduced-motion: reduce)` disables all animations
