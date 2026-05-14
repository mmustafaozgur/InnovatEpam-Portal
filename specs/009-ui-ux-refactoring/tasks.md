# Tasks: UI/UX Refactoring

**Input**: Design documents from `specs/009-ui-ux-refactoring/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Included per TDD gate (ADR-004, constitution §III). Write tests first; confirm they FAIL before implementation.

**Organization**: Tasks grouped by user story phase to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no outstanding dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Exact file paths are included in all task descriptions

---

## Phase 0: Pre-flight Gate

**Purpose**: Verify that the design system file all UI tasks depend on exists before any implementation begins (constitution §IV: MASTER.md must exist before UI feature work starts).

- [X] T000 Verify `design-system/innovatepam/MASTER.md` exists at the project root and is current. If absent or stale, run `/ui-ux-pro-max` to generate or update it **before proceeding to Phase 1**. All tasks that reference MASTER.md tokens (T013, T026, T029, T033, T035, T036) depend on this file existing.

---

## Phase 1: Setup

**Purpose**: Install the single new dependency required by all dialog-based user stories.

- [X] T001 Install `@radix-ui/react-dialog` in `frontend/` (`cd frontend && npm install @radix-ui/react-dialog`) and verify it appears in `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the Dialog primitive (blocks US2 and US6) and the backend multi-stage filter (blocks US3 and US1). No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: `dialog.tsx` + `ConfirmationDialog.tsx` must exist before US2 and US6. Backend + API changes must exist before US3 and US1.

- [X] T002 [P] Write failing tests for `dialog.tsx` — renders without crashing, opens when `open` is true, closes on Esc keypress, closes on overlay click in `frontend/src/components/ui/__tests__/dialog.test.tsx`
- [X] T003 [P] Write failing tests for `ConfirmationDialog` — renders `title` and `description`, fires `onConfirm` when confirm button clicked, fires `onCancel` when Cancel clicked, fires `onCancel` on Esc, confirm button is `disabled` when `isLoading` is true in `frontend/src/components/ui/__tests__/ConfirmationDialog.test.tsx`
- [X] T004 [P] Write failing backend unit test `test_list_ideas_multi_stage_filter` asserting `.in_()` query is used when `stage_filter` is a list in `backend/tests/unit/test_idea_service.py`
- [X] T005 [P] Write failing backend integration tests — `GET /api/v1/ideas?stage=new_idea&stage=technical_review` returns only ideas in those stages; single-stage call still passes; no-stage call returns all ideas in `backend/tests/integration/test_idea_routes.py`
- [X] T006 Create `frontend/src/components/ui/dialog.tsx` — shadcn/ui wrapper over `@radix-ui/react-dialog` exposing `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`; overlay `bg-black/50`; panel `bg-white rounded-xl shadow-lg p-6`; title `font-heading font-semibold text-lg text-primary` per `contracts/ui-components.md` (depends on T002)
- [X] T007 Create `frontend/src/components/ui/ConfirmationDialog.tsx` with props `{ open, title, description, confirmLabel, cancelLabel?, onConfirm, onCancel, isLoading? }` — built on `dialog.tsx`; confirm button has `autoFocus`; Escape calls `onCancel` via Radix `onOpenChange`; renders nothing when `open` is false per `contracts/ui-components.md` (depends on T003, T006)
- [X] T008 Update `backend/app/api/routes/ideas.py` — change `stage: Optional[Stage] = Query(None, ...)` to `stage: Optional[List[Stage]] = Query(None, ...)` (depends on T004, T005)
- [X] T009 Update `backend/app/services/idea_service.py` — change `list_ideas` parameter `stage_filter` type to `Optional[List[Stage]]`; change `Idea.current_stage == stage_filter` to `Idea.current_stage.in_(stage_filter)` (depends on T008)
- [X] T010 [P] Update `frontend/src/api/ideas.ts` — change `listIdeas` signature from `stage?: Stage` to `stages?: Stage[]`; serialise as repeated params using `stages?.forEach(s => params.append('stage', s))` (can run in parallel with T004, T005 — different files)

**Checkpoint**: Dialog primitive ready; backend accepts multi-stage filter; frontend API serialises stages. User story work can now begin.

---

## Phase 3: User Story 3 — Stage Filter Cards (Priority: P1)

**Goal**: Replace the stage dropdown on the Ideas page and My Ideas page with a horizontal row of multi-select filter cards, with URL persistence.

**Note**: US3 is implemented before US1 because `HomePage` imports `STAGE_OPTIONS` from `StageFilterCards.tsx`.

**Independent Test**: Visit the Ideas page, click one stage card — list filters; click a second card — both stages shown; deselect all — all ideas visible; refresh — filter persists in URL.

- [X] T011 [P] [US3] Write failing tests for `StageFilterCards` — renders exactly 5 cards; click unselected card adds it to selection and calls `onChange`; click selected card removes it; empty selection: no card has selected state; `aria-pressed` attribute reflects selection state in `frontend/src/components/ideas/__tests__/StageFilterCards.test.tsx`
- [X] T012 [P] [US3] Write failing tests for `IdeasPage` with `StageFilterCards` — single card selected → URL has `?stage=<value>`; two cards selected → URL has two `stage=` params; deselect all → no `stage=` in URL; on mount with `?stage=x` in URL → that card shows selected state in `frontend/src/pages/__tests__/IdeasPage.test.tsx`
- [X] T013 [US3] Create `frontend/src/components/ideas/StageFilterCards.tsx` — exports `STAGE_OPTIONS` constant (5 entries: `new_idea`, `initial_screening`, `technical_review`, `business_impact_assessment`, `final_selection`) and `StageFilterCards` component per `contracts/ui-components.md`; selected state uses `border-primary bg-primary/10 text-primary`; each card is a `<button>` with `aria-pressed`; min touch target `44×44px` (depends on T011)
- [X] T014 [US3] Update `frontend/src/pages/IdeasPage.tsx` — replace `StageFilter` usage with `StageFilterCards`; read `stages` array from `searchParams.getAll('stage')` as `Stage[]` on mount; pass to `listIdeas(stages)`; on change write all selected stages back to URL params (depends on T010, T012, T013)
- [X] T015 [US3] Write failing test for `IdeasPage` combined `mine=1` + stage filter — render `IdeasPage` with URL `?mine=1&stage=new_idea`, assert `listIdeas` is called with both `mine: true` and `stages: ['new_idea']`, and that the `new_idea` filter card shows selected state. Update `frontend/src/pages/IdeasPage.tsx` if needed so `stage` URL params coexist with `mine=1` without resetting each other. (My Ideas is the `mine=1` URL-param variant of `IdeasPage`; there is no separate `MyIdeasPage.tsx` — confirmed by codebase inspection.) (depends on T012, T013, T014)

**Checkpoint**: Ideas page and My Ideas page use filter cards with multi-select and URL persistence; no dropdown remains.

---

## Phase 4: User Story 1 — Home Page Stage Dashboard (Priority: P1)

**Goal**: Replace welcome buttons on the home page with clickable stage cards that navigate to filtered idea lists.

**Independent Test**: Visit the home page — 5 stage cards visible; click "Technical Review" — navigates to `/ideas?stage=technical_review` with the filter active.

- [X] T016 [US1] Write failing test for `HomePage` — renders exactly 5 stage navigation cards; each card is a `<Link>` to `/ideas?stage=<value>` using the correct stage enum value in `frontend/src/pages/__tests__/HomePage.test.tsx`
- [X] T017 [US1] Rewrite `frontend/src/pages/HomePage.tsx` — import `STAGE_OPTIONS` from `@/components/ideas/StageFilterCards`; render each entry as a clickable `<Link to={/ideas?stage=${s.value}}>` card displaying `s.label`; retain welcome greeting and role badge; remove old "Browse Ideas" / "Submit an Idea" / "Manage Users" quick-action buttons (sidebar handles these links) per `contracts/ui-components.md` (depends on T013, T016)

**Checkpoint**: Home page shows 5 stage navigation cards; each navigates to the filtered ideas list in one click.

---

## Phase 5: User Story 2 — Confirmation Dialogs (Priority: P1)

**Goal**: Gate "Submit Idea" and "Advance Stage" actions behind confirmation dialogs; on API error close dialog and show inline error near the triggering button.

**Independent Test**: Click "Submit Idea" — dialog appears with exact text; Cancel → no API call; Confirm → API fires; API error → dialog closes, inline error near button.

- [X] T018 [P] [US2] Write failing tests for `SubmitIdeaPage` — clicking "Submit Idea" opens `ConfirmationDialog` with text "Are you sure you want to submit this idea? You will not be able to edit it after submission."; clicking Cancel closes dialog without API call; clicking Confirm fires `submitIdea`; API error closes dialog and shows inline error near button in `frontend/src/pages/__tests__/SubmitIdeaPage.test.tsx`
- [X] T019 [P] [US2] Write failing tests for `StageAdvanceForm` — clicking "Advance Stage" opens `ConfirmationDialog` with text "Are you sure you want to advance this idea to the next stage? This action cannot be undone."; Cancel aborts; Confirm fires API; API error closes dialog and shows inline error near "Advance Stage" button in `frontend/src/components/ideas/__tests__/StageAdvanceForm.test.tsx`
- [X] T020 [US2] Update `frontend/src/pages/SubmitIdeaPage.tsx` — intercept `form.handleSubmit` to set `dialogOpen = true` instead of calling `submitIdea` directly; only call `submitIdea` in `ConfirmationDialog.onConfirm`; on API error: set `dialogOpen = false` and set inline `formError` state rendered near the "Submit Idea" button; exact dialog text per FR-008 (depends on T007, T018)
- [X] T021 [US2] Update `frontend/src/components/ideas/StageAdvanceForm.tsx` — add `ConfirmationDialog` with text per FR-010; only call advance API on confirm; on error: close dialog and set inline error near "Advance Stage" button (depends on T007, T019)

**Checkpoint**: Both submission and stage advancement require explicit confirmation; dialog never fires API on cancel; inline error appears near button on failure.

---

## Phase 6: User Story 4 — Category Validation Error (Priority: P2)

**Goal**: Ensure users never see raw enum text for a missing category — always show "Please select a category before submitting."

**Independent Test**: Submit the idea form with no category selected — exactly "Please select a category before submitting." appears; no raw enum text visible.

- [X] T022 [P] [US4] Write failing test for `SubmitIdeaPage` field-level validation — render the form, submit without selecting a category (no API call fires), assert the error displayed adjacent to the category field is exactly "Please select a category before submitting." (tests the Zod `required_error` string, not the API catch path) in `frontend/src/pages/__tests__/SubmitIdeaPage.test.tsx`
- [X] T023 [P] [US4] Write failing test for `SubmitIdeaPage` API catch path — when `onSubmit` catch block receives an error whose message contains "category" or "enum", `formError` is set to "Please select a category before submitting." in `frontend/src/pages/__tests__/SubmitIdeaPage.test.tsx`
- [X] T024 [US4] Implement category error fixes in `frontend/src/pages/SubmitIdeaPage.tsx` — (a) update Zod `required_error` for the category field to read exactly "Please select a category before submitting." if T022 is RED; (b) add guard in `onSubmit` catch block: if `error.message` includes "category" or "enum", set `formError = "Please select a category before submitting."` if T023 is RED (depends on T022, T023)

**Checkpoint**: Zero raw enum text visible; category field error always shows the exact friendly message.

---

## Phase 7: User Story 5 — Ideas Table Column Reorder (Priority: P2)

**Goal**: Reorder and widen `IdeasTable` columns so text does not wrap at 1280px viewport width.

**Independent Test**: Open Ideas page at 1280px — columns in order: Stage → Title → Category → Submitted By → Date → Actions; no cell text wraps; "View" link in Actions column.

- [X] T025 [US5] Update `frontend/src/components/ideas/__tests__/IdeasTable.test.tsx` (or existing test file path) — add assertions for new column order: Stage, Title, Category, Submitted By, Date, Actions; assert "View" link exists in the Actions column; assert Title cell is not itself a link
- [X] T026 [US5] Update `frontend/src/components/ideas/IdeasTable.tsx` — reorder columns to Stage/`w-[160px]` → Title/`flex-1 min-w-0` → Category/`w-[140px]` → Submitted By/`w-[140px]` → Date/`w-[100px]` → Actions/`w-[80px]`; move navigation link from Title cell into Actions column as `<Link to={/ideas/${idea.id}}>View</Link>`; Title remains plain text with attachment-count badge per `data-model.md` (depends on T025)

**Checkpoint**: Ideas table columns in correct order; no text wrapping at 1280px; "View" link in dedicated Actions column.

---

## Phase 8: User Story 6 — Privacy Policy Modal (Priority: P3)

**Goal**: Replace the static "Privacy Policy" text/link on the register page with a button that opens a modal dialog.

**Independent Test**: Visit register page; click "Privacy Policy"; modal opens titled "Privacy Policy" with a "Close" button; click Close or press Esc — modal closes, user stays on register page.

- [X] T027 [P] [US6] Write failing tests for `PrivacyPolicyModal` — renders heading "Privacy Policy"; clicking Close button fires `onClose`; pressing Esc fires `onClose`; modal is responsive (test at narrow width) in `frontend/src/components/auth/__tests__/PrivacyPolicyModal.test.tsx`
- [X] T028 [P] [US6] Write failing test for `RegisterForm` — clicking the "Privacy Policy" element opens `PrivacyPolicyModal`; clicking modal's Close button dismisses the modal in `frontend/src/components/auth/__tests__/RegisterForm.test.tsx`
- [X] T029 [US6] Create `frontend/src/components/auth/PrivacyPolicyModal.tsx` — modal built on `dialog.tsx`; heading "Privacy Policy"; body text: "Our privacy policy will be published here. Please contact your EPAM administrator for details."; single "Close" button that calls `onClose`; Esc calls `onClose` via Radix `onOpenChange`; `max-w-lg w-full mx-4` for 375px responsiveness per `contracts/ui-components.md` (depends on T007, T027)
- [X] T030 [US6] Update `frontend/src/components/auth/RegisterForm.tsx` — replace static "Privacy Policy" text with a `<button type="button">` (or `<span role="button">`) that sets `privacyOpen = true`; render `<PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />` (depends on T028, T029)

**Checkpoint**: Privacy Policy modal opens and dismisses on the register page without any page navigation.

---

## Phase 9: User Story 7 — Entrance Animation + Badge Transition (Priority: P3)

**Goal**: Add fade-in/slide-up entrance animation on `IdeaDetailPage`; smooth badge color transition; suppress both under prefers-reduced-motion.

**Independent Test**: Navigate to idea-detail page — stage content area animates (200–300ms); change a badge state — color transitions smoothly (≤150ms); enable OS reduce-motion — no animation, final state rendered immediately.

- [X] T031 [US7] Add `@keyframes slideUpFade` (from `opacity: 0; transform: translateY(8px)` to `opacity: 1; transform: translateY(0)`, 250ms ease-out) and `.animate-slideUpFade` class to `frontend/src/index.css`; add `@media (prefers-reduced-motion: reduce)` rule disabling all animations (sets `animation: none !important` and `transition: none !important`)
- [X] T032 [P] [US7] Write failing test for `IdeaDetailPage` — stage content area element has `animate-slideUpFade` class (or equivalent) on every mount in `frontend/src/pages/__tests__/IdeaDetailPage.test.tsx`
- [X] T033 [US7] Update `frontend/src/pages/IdeaDetailPage.tsx` — wrap stage content area in `<div key={idea.id} className="animate-slideUpFade">` so the animation fires on every mount via React key remount (depends on T031, T032)
- [X] T034a [P] [US7] Write failing test for `StageBadge` — render the badge and assert its root element's `className` includes both `transition-colors` and `duration-150`; confirm test is RED before T034 runs in `frontend/src/components/ideas/__tests__/StageBadge.test.tsx`
- [X] T034 [P] [US7] Update `frontend/src/components/ideas/StageBadge.tsx` — add `transition-colors duration-150` to the badge element's `className` so color changes animate smoothly (depends on T034a; independent of T033 — different file)

**Checkpoint**: IdeaDetailPage stage content animates on every mount; badge color transitions smoothly; no animation when reduce-motion is enabled.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Design token compliance audit across all pages (US7 / FR-019, FR-020). Verifies the full feature.

- [X] T035 [P] Audit and fix `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/IdeasPage.tsx`, `frontend/src/pages/IdeaDetailPage.tsx`, `frontend/src/pages/SubmitIdeaPage.tsx` — for each: verify `focus-visible:ring-2 focus-visible:ring-primary/50` on all interactive elements; `cursor-pointer` on all buttons; `min-h-[44px] min-w-[44px]` on touch targets; padding/typography (`font-heading`/`font-body`)/card shadows (`shadow-md`/`shadow-sm`)/button variants match `design-system/innovatepam/MASTER.md`; verify all foreground/background text combinations meet WCAG 2.1 AA contrast (≥ 4.5:1) using browser DevTools Accessibility panel or axe-core. **TDD gate**: any className change introduced by this audit requires a corresponding snapshot or unit assertion written first (RED); if the fix is purely visual with no JS logic, document the deviation in a PR comment and mark it for manual review.
- [X] T036 [P] Audit and fix `frontend/src/components/auth/RegisterForm.tsx`, `frontend/src/pages/LoginPage.tsx` (if exists), `frontend/src/pages/ProfilePage.tsx` (if exists) — same design token checks per `design-system/innovatepam/MASTER.md`, including WCAG 2.1 AA contrast (≥ 4.5:1). **TDD gate**: same as T035 — write a failing assertion before each className fix; document visual-only changes with a PR comment.
- [X] T037 [P] Run all frontend tests to confirm all pass: `cd frontend && npm test`
- [X] T038 [P] Run all backend tests to confirm all pass: `cd backend && .venv\Scripts\python -m pytest`

**Checkpoint**: All pages visually consistent with design system; all tests green.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Pre-flight Gate)**: No dependencies — verify MASTER.md before any Phase 1 work
- **Phase 1 (Setup)**: Depends on Phase 0 — start immediately after gate passes
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US3)**: Depends on Phase 2 — BLOCKS Phase 4 (US1 imports STAGE_OPTIONS from StageFilterCards)
- **Phase 4 (US1)**: Depends on Phase 3 completion (needs STAGE_OPTIONS export)
- **Phase 5 (US2)**: Depends on Phase 2 (needs ConfirmationDialog) — can run in parallel with Phase 3 and 4
- **Phase 6 (US4)**: Depends on Phase 2 — can run in parallel with Phases 3–5
- **Phase 7 (US5)**: Depends on Phase 2 — can run in parallel with Phases 3–6
- **Phase 8 (US6)**: Depends on Phase 2 (needs dialog primitive) — can run in parallel with Phases 3–7
- **Phase 9 (US7)**: Depends on Phase 2 — can run in parallel with Phases 3–8
- **Phase 10 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US3 (P1)**: Needs Phase 2. BLOCKS US1.
- **US1 (P1)**: Needs US3 (STAGE_OPTIONS export). Independent of US2, US4, US5, US6, US7.
- **US2 (P1)**: Needs Phase 2 (ConfirmationDialog). Independent of US1, US3.
- **US4 (P2)**: Needs Phase 2. Shares `SubmitIdeaPage.tsx` with US2 — coordinate edits.
- **US5 (P2)**: Needs Phase 2. Fully independent.
- **US6 (P3)**: Needs Phase 2 (dialog primitive). Fully independent.
- **US7 (P3)**: Needs Phase 2. Fully independent.

### Within Each Phase

- TDD: Write failing tests FIRST; run them and confirm RED; then implement until GREEN
- Dependencies listed per task must complete before that task starts
- Commit after each task or logical group for clean git history

### Parallel Opportunities

- T002, T003, T004, T005, T010 can all start simultaneously after T001 (different files)
- T034a must complete before T034 (StageBadge test before implementation)
- T006 starts as soon as T002 is done; T007 as soon as T003 + T006 are done
- T008 starts after T004 + T005; T009 after T008
- T011, T012 can run simultaneously within Phase 3
- T018, T019 can run simultaneously within Phase 5
- T027, T028 can run simultaneously within Phase 8
- T035, T036, T037, T038 can all run simultaneously in Phase 10

---

## Parallel Execution Examples

### Phase 2 Parallel Launch

```bash
# Start all independent test tasks simultaneously:
Task A: T002 Write failing tests for dialog.tsx
Task B: T003 Write failing tests for ConfirmationDialog
Task C: T004 Write backend unit test for multi-stage filter
Task D: T005 Write backend integration test for multi-stage filter
Task E: T010 Update frontend/src/api/ideas.ts

# After T002 → T006 (Create dialog.tsx)
# After T003 + T006 → T007 (Create ConfirmationDialog.tsx)
# After T004 + T005 → T008 (Update routes/ideas.py) → T009 (Update idea_service.py)
```

### Phase 3 + Phase 5 Parallel (after Phase 2)

```bash
# Two developers working in parallel:
Developer A (US3): T011 → T012 → T013 → T014 → T015
Developer B (US2): T018 → T019 → T020 → T021
# Different files — no conflicts
```

---

## Implementation Strategy

### MVP First (US3 + US1 — highest visibility P1 stories)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US3 (Stage Filter Cards)
4. Complete Phase 4: US1 (Home Page Dashboard)
5. **STOP and VALIDATE**: Stage navigation from home page to filtered list in one click; filter persists on refresh
6. Demo if ready; then continue with US2

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US3 → US1 (P1) → Stage navigation MVP; demo
3. US2 (P1) → Confirmation dialogs; demo
4. US4 + US5 (P2, parallel) → Category error fix + table reorder; demo
5. US6 + US7 (P3, parallel) → Privacy modal + animation + polish; demo

### Parallel Team Strategy

After Phase 2 completes:
- Developer A: Phase 3 (US3) → Phase 4 (US1) — sequential (US1 needs STAGE_OPTIONS)
- Developer B: Phase 5 (US2) — ConfirmationDialog integration
- Developer C: Phase 6 (US4) + Phase 7 (US5) — independent pages

---

## Notes

- [P] tasks touch different files and have no outstanding dependencies — safe to run concurrently
- [USn] labels map tasks to user stories for implementation traceability
- TDD gate is mandatory per ADR-004: tests must be RED before implementation begins
- Stage enum source of truth: `frontend/src/types/ideas.ts` — import from there; do not redefine
- All new/modified UI must reference `design-system/innovatepam/MASTER.md` tokens
- No new backend API routes — only the existing `GET /api/v1/ideas` query param is extended
- `STAGE_OPTIONS` in `StageFilterCards.tsx` is the single source of truth for stage labels/values across home page cards and filter cards (FR-001 edge case)
- Stop at each Checkpoint to validate the story independently before proceeding to the next phase
