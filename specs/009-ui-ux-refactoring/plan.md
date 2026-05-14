# Implementation Plan: UI/UX Refactoring

**Branch**: `009-ui-ux-refactoring` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-ui-ux-refactoring/spec.md`

## Summary

Targeted UI/UX refactoring across 7 user stories to modernise the InnovatEpam portal: transform the home page into a stage-based navigation dashboard; replace the single-select stage dropdown on the Ideas page with a multi-select filter card row; add confirmation dialogs before idea submission and stage advancement; reorder the ideas table columns; intercept raw category enum errors with a friendly message; add a Privacy Policy modal on the register screen; and add entrance animation, badge transitions, and global design-system polish. All changes are frontend-only except a backwards-compatible multi-stage filter extension to the existing `GET /api/v1/ideas` endpoint.

## Technical Context

**Language/Version**: TypeScript (React 19, Vite 8) + Python 3.11 (FastAPI)

**Primary Dependencies**:
- Frontend: React 19, react-router-dom v6, Tailwind CSS 3.4, @radix-ui/react-dialog (to be added), shadcn/ui pattern components, Zod 4, react-hook-form 7, Vitest 4, React Testing Library 16
- Backend: FastAPI, SQLAlchemy (async), Pydantic, SQLite via aiosqlite, pytest

**Storage**: SQLite — no schema changes

**Testing**: Vitest + React Testing Library (frontend) · pytest (backend)

**Target Platform**: Modern browsers; responsive at 375px, 768px, 1024px, 1440px

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Animation duration 200–300ms (entrance); badge transition ≤150ms; no API performance impact from multi-stage IN filter on small datasets

**Constraints**: No new backend API routes; `@radix-ui/react-dialog` is the only new dependency (single Radix primitive, consistent with existing Radix packages)

**Scale/Scope**: ~15 frontend files modified or created; 2 backend files modified; 7 user stories across FR-001 to FR-020

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | spec.md exists and is approved; plan produced before implementation |
| II. High-Performance Engineering | ✅ PASS | All changes are frontend rendering; API change uses SQL `.in_()` which is O(n) on indexed column; no N+1 queries introduced |
| III. Test-Driven Development | ✅ PASS | All tasks require failing tests before implementation code |
| IV. Design System Compliance | ✅ PASS | MASTER.md exists at `design-system/innovatepam/MASTER.md`; all new UI uses design tokens; no ad-hoc CSS |
| V. Simplicity & Minimalism | ⚠️ JUSTIFIED | One new package: `@radix-ui/react-dialog`. Spec assumption that Dialog was pre-installed is incorrect. Radix Dialog is the standard shadcn/ui primitive; 5 other Radix packages are already installed. No alternative meets the a11y requirements (focus-trap, Esc close) without adding equivalent complexity. |

**Post-Phase 1 Re-check**: All five principles remain PASS. No new abstractions beyond what the spec requires. No new backend endpoints.

## ADRs Referenced

| ADR | Relevance |
|-----|-----------|
| [ADR-002](../../docs/adr/002-react-vite-frontend.md) | React + Vite frontend stack governs new components |
| [ADR-003](../../docs/adr/003-design-system-master.md) | All UI must follow MASTER.md tokens |
| [ADR-004](../../docs/adr/004-test-driven-development.md) | TDD gate: failing tests before implementation |
| [ADR-008](../../docs/adr/008-sidebar-shell-layout.md) | AppLayout/Sidebar is unchanged; new home page content slots into existing layout |

**New ADR required**: No. Multi-stage filter extension is a query-param change within the existing ideas endpoint — ADR-002 + ADR-004 cover it. Dialog component follows the existing Radix/shadcn/ui pattern documented in ADR-003.

## Project Structure

### Documentation (this feature)

```text
specs/009-ui-ux-refactoring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-ideas-list.md    # GET /api/v1/ideas multi-stage contract
│   └── ui-components.md     # Component prop contracts
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (affected files)

```text
backend/
├── app/
│   ├── api/routes/ideas.py          # stage: Optional[List[Stage]]
│   └── services/idea_service.py     # .in_(stage_filter)
└── tests/
    ├── integration/test_idea_routes.py   # new multi-stage tests
    └── unit/test_idea_service.py         # new multi-stage unit test

frontend/
├── src/
│   ├── api/
│   │   └── ideas.ts                 # listIdeas(stages?: Stage[])
│   ├── components/
│   │   ├── auth/
│   │   │   ├── RegisterForm.tsx         # Privacy Policy modal trigger
│   │   │   └── PrivacyPolicyModal.tsx   # NEW
│   │   ├── ideas/
│   │   │   ├── StageFilterCards.tsx     # NEW (replaces StageFilter usage)
│   │   │   ├── StageAdvanceForm.tsx     # + ConfirmationDialog
│   │   │   ├── IdeasTable.tsx           # column reorder + whitespace fixes
│   │   │   └── StageBadge.tsx           # + transition-colors duration-150
│   │   └── ui/
│   │       ├── dialog.tsx               # NEW (Radix Dialog wrapper)
│   │       └── ConfirmationDialog.tsx   # NEW
│   ├── pages/
│   │   ├── HomePage.tsx             # stage navigation cards
│   │   ├── IdeasPage.tsx            # StageFilterCards + multi-stage URL params
│   │   ├── IdeaDetailPage.tsx       # entrance animation
│   │   └── SubmitIdeaPage.tsx       # + ConfirmationDialog + category error fix
│   └── index.css                    # @keyframes slideUpFade; reduced-motion rule
└── tests/ (co-located __tests__ directories)
```

**Structure Decision**: Option 2 (Web application with separate backend/ and frontend/). Follows the pattern established by all previous features in this repo.

## Implementation Phases

> **Phase numbering note**: `tasks.md` uses numeric phase labels (Phase 1–10); the alphabetic labels below (A–J) describe logical design groupings. Mapping: A+B → Tasks Phase 2 · C → Tasks Phase 4 · D → Tasks Phase 3 · E → Tasks Phase 5 · F → Tasks Phase 7 · G → Tasks Phase 6 · H → Tasks Phase 8 · I → Tasks Phase 9 · J → Tasks Phase 10. (Tasks Phase 1 is dependency setup only; Tasks Phase 0 is the MASTER.md gate check.)

### Phase A — Foundation (dependency + dialog primitive)

**Goal**: Establish the Dialog primitive that all dialog-based features depend on. Must be done first.

**Tasks**:
1. Install `@radix-ui/react-dialog` in `frontend/`.
2. Write tests for `dialog.tsx` (renders, opens on trigger, closes on Esc, closes on overlay click).
3. Create `frontend/src/components/ui/dialog.tsx` — shadcn/ui wrapper exposing `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.
4. Create `frontend/src/components/ui/ConfirmationDialog.tsx` with the interface from `contracts/ui-components.md`.
5. Write tests for `ConfirmationDialog`: renders title/description, fires `onConfirm` on confirm click, fires `onCancel` on cancel click, fires `onCancel` on Esc, disables confirm when `isLoading`.

---

### Phase B — Backend: Multi-Stage Filter

**Goal**: Extend `GET /api/v1/ideas` to accept repeated `stage` params.

**Tasks**:
1. Write backend unit test: `list_ideas` service filters by list of stages using `.in_()`.
2. Write backend integration test: `GET /api/v1/ideas?stage=new_idea&stage=technical_review` returns only matching ideas.
3. Update `backend/app/api/routes/ideas.py`: change `Optional[Stage]` to `Optional[List[Stage]]`.
4. Update `backend/app/services/idea_service.py`: change `== stage_filter` to `.in_(stage_filter)`.
5. Update `frontend/src/api/ideas.ts`: change signature to `stages?: Stage[]`, serialise as repeated params.

---

### Phase C — Home Page Stage Dashboard (US-1 / FR-001, FR-002)

**Goal**: Replace welcome buttons with clickable stage cards that navigate to filtered ideas.

**Tasks**:
1. Write test: `HomePage` renders 5 stage cards; each links to `/ideas?stage=<value>`.
2. Rewrite `frontend/src/pages/HomePage.tsx` to display `STAGE_OPTIONS` (imported from `StageFilterCards.tsx`) as clickable card links. Retain welcome greeting and role badge. Remove the old "Browse Ideas" / "Submit an Idea" / "Manage Users" buttons (the sidebar already provides these links).

---

### Phase D — Stage Filter Cards (US-3 / FR-003, FR-004, FR-005)

**Goal**: Replace the `<select>` dropdown with multi-select filter cards on the Ideas page.

**Tasks**:
1. Write tests for `StageFilterCards`: renders 5 cards; click selects/deselects; empty selection passes `[]`; `aria-pressed` correct.
2. Create `frontend/src/components/ideas/StageFilterCards.tsx` per `contracts/ui-components.md`.
3. Write tests for `IdeasPage` with `StageFilterCards`: single card selection → URL has `stage=x`; two cards → URL has two `stage=` params; deselect all → no `stage=` in URL.
4. Update `frontend/src/pages/IdeasPage.tsx`: replace `StageFilter` with `StageFilterCards`; read `stages` from `searchParams.getAll('stage')` as `Stage[]`; pass to `listIdeas`; write back to URL on change.

---

### Phase E — Confirmation Dialogs (US-2 / FR-007, FR-008, FR-009, FR-010, FR-011)

**Goal**: Gate idea submission and stage advancement behind a confirmation dialog.

**Tasks**:
1. Write tests for `SubmitIdeaPage`: clicking "Submit Idea" opens dialog; cancelling does not submit; confirming fires API; API error closes dialog and shows inline error near button.
2. Update `frontend/src/pages/SubmitIdeaPage.tsx`: intercept `form.handleSubmit` to show `ConfirmationDialog` first; only call `submitIdea` on confirm; on API error close dialog and set inline `formError` near button.
3. Write tests for `StageAdvanceForm`: same sequence as above for "Advance Stage".
4. Update `frontend/src/components/ideas/StageAdvanceForm.tsx`: add `ConfirmationDialog` with the exact text from FR-010; show inline error near "Advance Stage" button on failure.

---

### Phase F — Table Column Reorder (US-5 / FR-006)

**Goal**: Reorder and widen `IdeasTable` columns for no-wrap at 1280px.

**Tasks**:
1. Update existing `IdeasTable.test.tsx` to assert the new column order: Stage → Title → Category → Submitted By → Date → Actions.
2. Update `frontend/src/components/ideas/IdeasTable.tsx` per `data-model.md` column spec. Add a "View" link in the Actions column; remove the link from the Title cell (plain text now).

---

### Phase G — Category Error Message (US-4 / FR-012, FR-013)

**Goal**: Ensure users never see raw enum text; always see "Please select a category before submitting."

**Tasks**:
1. Confirm Zod `required_error` in `SubmitIdeaPage.tsx` already reads "Please select a category" — update to exact spec text "Please select a category before submitting." if it differs.
2. Write test: `SubmitIdeaPage` `onSubmit` catch block — when error message contains "category" or "enum", formError is set to "Please select a category before submitting."
3. Update `onSubmit` error handler in `SubmitIdeaPage.tsx` to intercept category enum errors.

---

### Phase H — Privacy Policy Modal (US-6 / FR-014, FR-015)

**Goal**: Replace the privacy policy checkbox label with a clickable link that opens a modal.

**Tasks**:
1. Write tests for `PrivacyPolicyModal`: renders title "Privacy Policy"; close button fires `onClose`; Esc fires `onClose`.
2. Create `frontend/src/components/auth/PrivacyPolicyModal.tsx`.
3. Write test for `RegisterForm`: clicking "Privacy Policy" opens modal; modal closes on "Close".
4. Update `frontend/src/components/auth/RegisterForm.tsx`: convert "I accept the Privacy Policy" label to include a clickable `<button>` or `<span role="button">` that opens `PrivacyPolicyModal`.

---

### Phase I — Entrance Animation + Badge Transition (US-7 / FR-016, FR-017, FR-018)

**Goal**: Add fade-in/slide-up on IdeaDetailPage; smooth badge color transitions; respect prefers-reduced-motion.

**Tasks**:
1. Add `@keyframes slideUpFade` to `frontend/src/index.css` and `@media (prefers-reduced-motion: reduce)` suppression rule.
2. Write test: `IdeaDetailPage` stage content area has `animate-slideUpFade` class (or equivalent) on mount.
3. Update `frontend/src/pages/IdeaDetailPage.tsx`: wrap stage content area in a `<div key={idea.id}>` with the animation class (using `key` ensures it fires on every mount).
4. Update `frontend/src/components/ideas/StageBadge.tsx`: add `transition-colors duration-150` to the badge `className`.

---

### Phase J — Global Design System Audit (US-7 / FR-019, FR-020)

**Goal**: Audit all pages for design token compliance; ensure focus rings, pointer cursors, and 44×44px touch targets.

**Tasks**:
1. Audit and fix: `HomePage`, `IdeasPage`, `IdeaDetailPage`, `SubmitIdeaPage`, `RegisterForm`, `LoginPage`, `ProfilePage`.
2. Check each for: `focus-visible:ring-2 focus-visible:ring-primary/50` on all interactive elements; `cursor-pointer` on all buttons; `min-h-[44px] min-w-[44px]` on touch targets.
3. Verify padding, typography (`font-heading`/`font-body`), card shadows (`shadow-md`/`shadow-sm`), and button variants match MASTER.md tokens.

## Complexity Tracking

| Justified Addition | Why Needed | Simpler Alternative Rejected Because |
|--------------------|------------|--------------------------------------|
| `@radix-ui/react-dialog` | Radix Dialog provides focus-trap, Esc close, and accessible overlay — required by FR-011 and FR-015 | Native `<dialog>` lacks focus-trap without JS; custom implementation is equivalent complexity with worse a11y |

## Success Criteria Mapping

| SC | Phase | Verified By |
|----|-------|-------------|
| SC-001 (home→filtered ideas in 1 click) | C | Unit test + manual |
| SC-002 (no raw enum errors) | G | Unit test |
| SC-003 (100% confirmation before submission) | E | Unit test |
| SC-004 (no column wrapping at 1280px) | F | Manual visual |
| SC-005 (filter survives refresh) | D | Unit test (URL read on mount) |
| SC-006 (reduced-motion = instant) | I | CSS media query |
| SC-007 (WCAG AA + keyboard nav) | J | Manual audit |
| SC-008 (Privacy Policy modal 100%) | H | Unit test |
| SC-009 (design system compliance) | J | Manual audit |
