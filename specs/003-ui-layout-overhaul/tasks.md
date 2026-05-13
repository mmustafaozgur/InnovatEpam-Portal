---

description: "Task list for UI Layout Overhaul — Fixed Sidebar Shell"
---

# Tasks: UI Layout Overhaul — Fixed Sidebar Shell

**Input**: Design documents from `specs/003-ui-layout-overhaul/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**Tests**: Included — TDD is explicitly required by the project constitution (Principle III) and the implementation plan. All test tasks must FAIL before the corresponding implementation task begins (Red-Green-Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup (Design Gate)

**Purpose**: The design gate MUST be cleared before any sidebar code is written (Principle IV, ADR-003). No `Sidebar.tsx` or `AppLayout.tsx` changes are permitted until T001 is complete.

- [X] T001 Amend `design-system/innovatepam/MASTER.md` — add §"Sidebar Shell (Feature 003-ui-layout-overhaul)" section covering: sidebar CSS classes (fixed positioning, 220px width, full viewport height, `bg-white border-r border-border`), nav item default + active pill styles, user footer layout, mobile overlay + hamburger button styles, content area offset (`md:ml-[220px]`), standard page wrapper (`px-6 py-8`), content max-width conventions (`max-w-2xl` for forms, `max-w-3xl` for detail pages, full-width for tables)

**Checkpoint**: MASTER.md updated — sidebar shell section visible and reviewed. No further tasks may touch `Sidebar.tsx` or `AppLayout.tsx` until this checkpoint is passed.

---

## Phase 2: Foundational (No Additional Prerequisites)

**Note**: This feature is a layout refactor with no new database schema, migrations, or npm/pip packages. The sole blocking prerequisite is the design gate in Phase 1. No additional foundational infrastructure is required — all project services (FastAPI, React, SQLite, Tailwind) are already in place.

**Checkpoint**: Phase 1 complete → implementation can begin.

---

## Phase 3: User Story 1 — Navigate via Fixed Sidebar (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user opens any protected page and sees a fixed left sidebar replacing the top navbar. Role-gated nav items, active-page highlight, brand link, and user identity footer with Sign Out are all functional on desktop viewports.

**Independent Test**: Log in as each role (Submitter, Admin), verify the sidebar renders on all 5 protected pages, verify nav items are role-correct, verify the active item is highlighted on the current route and sub-routes (e.g., `/ideas/42` highlights "Ideas"), click each nav item, verify Sign Out redirects to login.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, confirm all FAILING before writing any implementation**

- [X] T002 [US1] Write `frontend/src/components/layout/__tests__/Sidebar.test.tsx` — create file and add all desktop sidebar tests: (1) Submitter role sees Home, Ideas, Submit an Idea nav items and does NOT see Manage Users; (2) Admin role sees Home, Ideas, Manage Users and does NOT see Submit an Idea; (3) current route's nav item is rendered with active pill class; (4) sub-route `/ideas/42` highlights the Ideas nav item (prefix match); (5) brand link renders as an anchor pointing to `/`; (6) footer shows `user.full_name`, role badge, and Sign Out button; (7) Sign Out button calls `logout()` from `useAuth()`

### Implementation for User Story 1

- [X] T003 [US1] Create `frontend/src/components/layout/Sidebar.tsx` — implement desktop sidebar: static `NAV_ITEMS` config with `{ to, label, icon, roles }`, role-filter using `useAuth()` user role, active detection via `pathname === to || (to !== '/' && pathname.startsWith(to))` using `useLocation()`, Lucide icons (`Home`, `Lightbulb`, `PlusCircle`, `Users`), brand link to `/`, active pill highlight using MASTER.md nav item tokens, user identity footer with `full_name`, role badge, Sign Out button calling `logout()` — implement to make T002 tests pass
- [X] T004 [US1] Rewrite `frontend/src/components/layout/AppLayout.tsx` — remove entire `<nav>` top-navbar block; import `<Sidebar />` from `./Sidebar`; render `<Sidebar />` alongside `<div className="md:ml-[220px] min-h-screen bg-background"><Outlet /></div>`; preserve all existing `ProtectedRoute`/`AdminRoute` wrappers

**Checkpoint**: User Story 1 complete — all T002 tests pass. Log in as Submitter and Admin and manually verify sidebar on every protected page before proceeding.

---

## Phase 4: User Story 2 — Responsive Mobile Sidebar (Priority: P2)

**Goal**: On a ≤768px viewport the sidebar is hidden by default; a hamburger button opens it as an overlay; tapping a nav item or outside the sidebar closes it.

**Independent Test**: Open browser DevTools at 375px width; verify sidebar is hidden and hamburger is visible; tap hamburger, confirm sidebar slides in; tap a nav item, confirm navigation occurs and sidebar closes; tap backdrop, confirm sidebar closes; tap hamburger close button, confirm sidebar closes.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, confirm all FAILING before writing any mobile implementation**

- [X] T005 [US2] Add mobile-specific tests to `frontend/src/components/layout/__tests__/Sidebar.test.tsx` — add tests at mobile viewport size: (1) hamburger `<button>` is present in the DOM; (2) sidebar panel has `-translate-x-full` class (hidden) when `mobileOpen` is false; (3) after hamburger click, sidebar panel has `translate-x-0` class (visible); (4) after hamburger click followed by a nav-item click, an `isOpen=false` state change or close callback fires; (5) clicking the backdrop div calls the close handler

### Implementation for User Story 2

- [X] T006 [US2] Add mobile behaviour to `frontend/src/components/layout/Sidebar.tsx` — add `const [mobileOpen, setMobileOpen] = useState(false)`; apply `transition-transform duration-300 z-40 md:translate-x-0` + conditional `translate-x-0 / -translate-x-full` to sidebar panel; add backdrop `<div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />` rendered only when `mobileOpen`; add hamburger `<button className="fixed top-4 left-4 z-50 md:hidden">` showing `<Menu />` / `<X />` icon based on state; call `setMobileOpen(false)` in each nav-item click handler — implement to make T005 tests pass

**Checkpoint**: User Story 2 complete — all T005 tests pass. Verify at 375px: hamburger visible, sidebar slides in/out, nav close, backdrop close, landscape-rotation closes overlay.

---

## Phase 5: User Story 3 — "My Ideas" Filter on Ideas Page (Priority: P3)

**Goal**: A Submitter sees a "My Ideas" toggle on the Ideas page; when active, the list is filtered server-side to only their submissions; filter state and pagination page are URL-persistent. Admins do not see the toggle.

**Independent Test**: Log in as Submitter, enable "My Ideas", verify only that user's ideas appear across pages, check URL has `?mine=1`; disable toggle, verify all ideas return and URL has no `mine` param. Log in as Admin, verify no toggle. Verify paginating with filter active stays filtered.

### Tests for User Story 3

> **NOTE: Write backend unit tests FIRST, confirm FAILING before T008. Write integration tests before T010.**

- [X] T007 [US3] Add `mine` filter unit tests to `backend/tests/unit/test_idea_service.py` — add test cases: (1) `list_ideas(..., submitter_id_filter="user-1-id")` returns only ideas where `submitter_id == "user-1-id"`; (2) `total` count reflects only that user's ideas; (3) `submitter_id_filter=None` (default) returns all ideas unchanged — confirm all FAILING before T008
- [X] T008 [US3] Update `backend/app/services/idea_service.py` — add `submitter_id_filter: str | None = None` parameter to `list_ideas()`; conditionally apply `base_q = base_q.where(Idea.submitter_id == submitter_id_filter)` and `count_q = count_q.where(Idea.submitter_id == submitter_id_filter)` when `submitter_id_filter` is not None — implement to make T007 tests pass
- [X] T009 [US3] Add `mine` filter integration tests to `backend/tests/integration/test_idea_routes.py` — add test cases: (1) `GET /api/v1/ideas?mine=true` as Submitter returns only that submitter's ideas; (2) `GET /api/v1/ideas?mine=true` with pagination returns correctly filtered pages; (3) `GET /api/v1/ideas` without `mine` still returns all ideas (backward compat); (4) `GET /api/v1/ideas?mine=true` while unauthenticated returns 401 — confirm all FAILING before T010
- [X] T010 [US3] Update `backend/app/api/routes/ideas.py` — add `mine: bool = Query(False, description="Filter to current user's ideas")` to the `GET /api/v1/ideas` route handler; pass `submitter_id_filter=current_user.id if mine else None` to `idea_service.list_ideas()` — implement to make T009 tests pass
- [X] T011 [P] [US3] Update `frontend/src/api/ideas.ts` — add optional `mine?: boolean` parameter to the `listIdeas()` function; when `mine` is `true`, append `&mine=true` to the request URL; default remains `false` (no param appended)
- [X] T012 [P] [US3] Add mine-filter + URL-state tests to `frontend/src/pages/__tests__/IdeasPage.test.tsx` — add test cases: (1) Submitter role: "My Ideas" toggle/checkbox is visible; (2) Admin role: toggle is NOT present; (3) activating toggle sets `mine=1` **and resets `page` to `1`** in the URL search params (even when currently on page > 1); (4) when URL has `mine=1`, `listIdeas` is called with `mine: true`; (5) deactivating toggle removes `mine` from URL and resets `page` to `1`; (6) navigating pages while `mine=1` preserves `mine=1` in each paginated URL; (7) when `mine=1` is active and the API returns an empty `ideas` array, an empty-state message is rendered (not a blank list) — confirm all FAILING before T013
- [X] T013 [US3] Update `frontend/src/pages/IdeasPage.tsx` — replace any `useState`-only filter/page state with `useSearchParams()`-driven state; read `mine = searchParams.get('mine') === '1'` and `page = parseInt(searchParams.get('page') ?? '1')`; add "My Ideas" `<label><input type="checkbox">` visible only when `user.role === 'submitter'`; on toggle change, call `setSearchParams` with `mine=1`/remove `mine` and reset `page=1` (both activation and deactivation must reset page); pass `mine` to `listIdeas()` from `api/ideas.ts`; pagination controls update `page` in search params while preserving `mine`; when `mine` is active and the fetched `ideas` array is empty, render an empty-state message (e.g., "You haven't submitted any ideas yet.") instead of a blank list — implement to make T012 tests pass

**Checkpoint**: User Story 3 complete — all T007, T009, T012 tests pass. Verify filter + pagination in browser as Submitter and Admin roles.

---

## Phase 6: User Story 4 — Consistent Page Structure Across All Pages (Priority: P4)

**Goal**: Every protected page uses only design system tokens from MASTER.md — uniform `px-6 py-8` wrapper, correct `max-width` column, `font-heading font-semibold text-xl text-primary mb-6` headings, shadcn/ui card styles — no bespoke one-off classes.

**Independent Test**: Review each page side-by-side against MASTER.md §"Sidebar Shell". Confirm headings, spacing, card styles, and interactive elements match defined tokens. Run `npx tsc --noEmit` and confirm zero type errors.

### Implementation for User Story 4

- [X] T014 [P] [US4] Audit and polish `frontend/src/pages/HomePage.tsx` — apply `<div className="px-6 py-8">` page wrapper, `font-heading font-semibold text-xl text-primary mb-6` heading, MASTER.md card tokens; remove any bespoke style strings that deviate from MASTER.md
- [X] T015 [P] [US4] Audit and polish `frontend/src/pages/IdeaDetailPage.tsx` — apply `<div className="px-6 py-8 max-w-3xl">` wrapper, heading tokens, MASTER.md card/badge tokens; remove bespoke deviations
- [X] T016 [P] [US4] Audit and polish `frontend/src/pages/SubmitIdeaPage.tsx` — apply `<div className="px-6 py-8 max-w-2xl mx-auto">` wrapper for form, heading tokens, MASTER.md form input/button tokens; remove bespoke deviations
- [X] T017 [P] [US4] Audit and polish `frontend/src/pages/UsersPage.tsx` — apply `<div className="px-6 py-8">` full-width wrapper (no max-width for table pages), heading tokens, MASTER.md table/badge tokens; remove bespoke deviations
- [X] T018 [US4] Audit and polish `frontend/src/pages/IdeasPage.tsx` — apply `<div className="px-6 py-8">` full-width wrapper, heading tokens, MASTER.md table/badge tokens; coordinate with T013 changes (preserve `useSearchParams` and mine-filter UI); remove bespoke deviations

**Checkpoint**: All 5 pages pass visual audit against MASTER.md. No one-off style strings remain.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, old-nav removal confirmation, and full test suite sign-off.

- [X] T019 Confirm `frontend/src/components/layout/AppLayout.tsx` has zero `<nav>` remnants from the old top navbar (FR-018) — search file for any `<nav`, `navbar`, or top-navigation class strings and remove if found
- [X] T020 [P] Run `cd frontend && npx tsc --noEmit` — resolve all TypeScript type errors introduced by Sidebar.tsx, AppLayout.tsx, IdeasPage.tsx, and api/ideas.ts changes
- [X] T021 [P] Run full backend test suite `cd backend && pytest -v` — confirm all existing tests still pass plus the new mine-filter tests (T007 + T009)
- [X] T022 [P] Run full frontend test suite `cd frontend && npm test -- --run` — confirm all existing tests still pass plus T002 + T005 + T012 tests
- [ ] T023 Run quickstart.md validation — start both servers (`uvicorn` + `npm run dev`), smoke-test all 5 protected pages as Submitter and Admin, verify sidebar renders on each, verify mine-filter on Ideas page, verify mobile hamburger at ≤768px

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A — no additional infrastructure
- **US1 (Phase 3)**: Requires Phase 1 (design gate) complete — BLOCKS US2, US3, US4
- **US2 (Phase 4)**: Requires US1 complete (extends Sidebar.tsx)
- **US3 (Phase 5)**: Requires US1 complete (sidebar shell context for page chrome); US3 backend tasks can run in parallel with US2
- **US4 (Phase 6)**: Requires US1 complete (sidebar shell provides layout contract); US4 can run in parallel with US2 and US3
- **Polish (Phase 7)**: Requires all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 (design gate). No dependency on other user stories.
- **US2 (P2)**: Depends on US1 (Sidebar.tsx must exist). Extends Sidebar.tsx.
- **US3 (P3)**: Depends on US1 (layout established). Backend tasks (T007–T010) are independent of frontend US2 tasks — run in parallel.
- **US4 (P4)**: Depends on US1 (MASTER.md layout contract must exist). Can be developed in parallel with US2 and US3 once US1 is done.

### Within Each User Story

- TDD tasks: test file MUST be written and FAIL before implementation task begins
- T003 depends on T002 (test before implementation)
- T004 depends on T003 (AppLayout imports Sidebar.tsx)
- T006 depends on T005 (test before mobile implementation)
- T008 depends on T007 (unit tests first)
- T010 depends on T009 (route test after service implemented)
- T011 [P] and T012 [P] can run in parallel (different files)
- T013 depends on T011 and T012 (implement after API layer + tests exist)
- T014 [P], T015 [P], T016 [P], T017 [P] can run in parallel (different page files)
- T018 depends on T013 (coordinate with IdeasPage changes from US3)
- T021 [P] and T022 [P] can run in parallel (different test suites)

---

## Parallel Example: User Story 3 (Backend + Frontend split)

```bash
# Once US1 is complete, backend and frontend US3 work can run independently:

# --- Backend track (sequential TDD chain) ---
Task T007: Write failing unit tests for mine filter in backend/tests/unit/test_idea_service.py
Task T008: Implement submitter_id_filter in backend/app/services/idea_service.py
Task T009: Write failing integration tests in backend/tests/integration/test_idea_routes.py
Task T010: Add mine param to backend/app/api/routes/ideas.py

# --- Frontend track (partial parallel) ---
# T011 and T012 can run in parallel:
Task T011: Add mine param to frontend/src/api/ideas.ts
Task T012: Write failing mine-filter tests in frontend/src/pages/__tests__/IdeasPage.test.tsx
# Then:
Task T013: Implement IdeasPage.tsx with useSearchParams + mine toggle
```

## Parallel Example: User Story 4 (All page polishes run together)

```bash
# Once US1 is complete, all page polishes can run in parallel:
Task T014: Polish frontend/src/pages/HomePage.tsx
Task T015: Polish frontend/src/pages/IdeaDetailPage.tsx
Task T016: Polish frontend/src/pages/SubmitIdeaPage.tsx
Task T017: Polish frontend/src/pages/UsersPage.tsx
# T018 (IdeasPage) runs after T013 (US3 implementation) to coordinate changes
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Design Gate (T001)
2. Complete Phase 3: User Story 1 (T002 → T003 → T004)
3. **STOP and VALIDATE**: All T002 tests pass, sidebar visible on all 5 pages for both roles
4. Deploy/demo if ready — the sidebar shell is immediately useful

### Incremental Delivery

1. Complete Phase 1 (Design Gate) → Gate cleared
2. Complete US1 (T002–T004) → Desktop sidebar live (MVP)
3. Complete US2 (T005–T006) → Mobile users served
4. Complete US3 (T007–T013) → Mine filter live
5. Complete US4 (T014–T018) → Visual consistency achieved
6. Complete Phase 7 (T019–T023) → Full sign-off

### Parallel Team Strategy

With multiple developers (after Phase 1 + Phase 3 complete):

- **Developer A**: US2 — mobile sidebar (T005–T006)
- **Developer B**: US3 backend — mine filter (T007–T010)
- **Developer C**: US3 frontend — ideas API + UI (T011–T013)
- **Developer D**: US4 — page polish (T014–T017, then T018 after C's T013)

---

## Notes

- **Design Gate**: T001 (MASTER.md amendment) is the only task that MUST precede ALL other tasks. Do not begin T002 until T001 is committed and reviewed.
- **TDD discipline**: Every test task explicitly says "confirm FAILING before" the next task. This is mandatory — a test that passes before implementation means either the test is wrong or the feature already exists.
- **Security invariant**: In T010 (route), `submitter_id_filter` MUST be set from `current_user.id` (server session), never from a client-supplied URL value. The `mine` param is a boolean flag, not a user ID.
- **Sidebar is NOT an auth boundary**: T003/T004 implement role-gated nav items as a UX affordance only. Existing `ProtectedRoute`/`AdminRoute` wrappers in `AppLayout.tsx` remain unchanged and are the true authorization boundary.
- **[P] tasks** = different files, no dependencies on incomplete tasks in the same phase
- **[Story] labels** map each task to its user story for traceability
- Commit after each task or logical group
- Stop at each checkpoint to validate the story independently before moving forward
