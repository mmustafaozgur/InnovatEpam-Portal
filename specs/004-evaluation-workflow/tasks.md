# Tasks: Evaluation Workflow

**Input**: Design documents from `/specs/004-evaluation-workflow/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/evaluate-idea.md ✅ · quickstart.md ✅

**TDD**: Test tasks are **required** — Constitution Principle III enforces Red-Green-Refactor. Write tests first, confirm they FAIL, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Migration script, ADR, and design system gate — must complete before any feature work.

- [X] T001 Create migration script `backend/scripts/migrate_eval.py` that issues `ALTER TABLE ideas ADD COLUMN` for evaluation_status, evaluation_comment, evaluated_at, assigned_admin_id using `PRAGMA table_info` guard and creates `idx_ideas_evaluation_status` index (see data-model.md §5 for exact script)
- [X] T002 [P] Create ADR `docs/adr/009-evaluation-inline-storage.md` documenting the inline-column decision vs a separate evaluations table (see research.md §8)
- [X] T003 ⚠️ **DESIGN SYSTEM GATE** — Run `/ui-ux-pro-max` to register three new components in `design-system/innovatepam/MASTER.md`: EvaluationStatusBadge (4 color variants: submitted=slate, under_review=blue, accepted=green, rejected=red), EvaluationForm (admin panel with locked status select + comment textarea with 1,000-char counter), StatusFilter (dropdown in filter bar alongside "My Ideas" toggle). **No frontend UI task (T015–T017, T024) may begin until MASTER.md is updated.**

**Checkpoint**: Migration script ready; ADR filed; MASTER.md amended — feature implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + type changes that ALL user stories depend on. Must complete before any story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Add four evaluation columns (`evaluation_status`, `evaluation_comment`, `evaluated_at`, `assigned_admin_id`), `CheckConstraint("evaluation_status IN ('submitted','under_review','accepted','rejected')", name="ck_ideas_evaluation_status")`, and `Index("idx_ideas_evaluation_status", "evaluation_status")` to the `Idea` model in `backend/app/models/idea.py` (see data-model.md §1.3)
- [X] T005 [P] Add `EvaluationStatus = Literal["submitted","under_review","accepted","rejected"]`, `EvaluateIdeaRequest(status, comment)`, and `EvaluationInfo(status, comment, evaluated_at, assigned_admin_id)` Pydantic models to `backend/app/schemas/ideas.py` (see data-model.md §2.1)
- [X] T006 Update `IdeaDetailResponse` (add `evaluation: EvaluationInfo` field) and `IdeaSummaryResponse` (add `evaluation_status: EvaluationStatus` field) in `backend/app/schemas/ideas.py` — depends on T005 (see data-model.md §2.2)
- [X] T007 [P] Add `EvaluationStatus` union type, `EvaluationInfo` interface, `EvaluateIdeaRequest` interface to `frontend/src/types/ideas.ts`; update `IdeaDetailResponse` (add `evaluation: EvaluationInfo`) and `IdeaSummaryResponse` (add `evaluation_status: EvaluationStatus`) interfaces (see data-model.md §4)

**Checkpoint**: Schema + types are complete — user story implementation can now begin.

---

## Phase 3: User Story 1 — Admin Evaluates a Submitted Idea (Priority: P1) 🎯 MVP

**Goal**: Admins can move ideas through the state machine (submitted → under_review → accepted | rejected), attach a comment, and be exclusively bound to ideas they pick up.

**Independent Test**: Submit an idea as a regular user → log in as admin → PATCH /ideas/{id}/evaluate → verify new status, comment, and timestamp appear in the response.

### Tests for User Story 1 ⚠️ Write FIRST — confirm RED before implementing

- [X] T008 [P] [US1] Write unit tests U-01 to U-10 for `evaluate_idea()` (state machine transitions, lock enforcement, admin assignment, comment-only update, non-admin rejection) in `backend/tests/unit/test_idea_service.py`; run `pytest backend/tests/unit/test_idea_service.py -v` and **confirm all 10 tests FAIL**
- [X] T009 [P] [US1] Write integration tests I-01 to I-06 and I-12 for `PATCH /ideas/{id}/evaluate` (unauthenticated 401, submitter 403, valid transition 200, invalid transition 400, locked 409, non-assigned admin 403, comment >1,000 chars → 422) in `backend/tests/integration/test_idea_routes.py`; run `pytest backend/tests/integration/test_idea_routes.py -v` and **confirm all 7 tests FAIL**

### Implementation for User Story 1

- [X] T010 [US1] Implement `evaluate_idea(db, idea_id, acting_admin, new_status, comment)` in `backend/app/services/idea_service.py` with: ALLOWED_TRANSITIONS dict, 404/403/400/409 guards in the exact order from data-model.md §3.2, `assigned_admin_id` set on first under_review transition, `evaluated_at = utc_now_iso()`, single atomic `db.commit()` returning `IdeaDetailResponse` with visibility applied (see data-model.md §3.1–3.2 and research.md §3–4) — **Visibility note**: the caller is always an admin here (route enforces admin JWT), so all evaluation fields are visible; if `build_evaluation_info()` (T014) is already implemented call it with `acting_admin`; otherwise return the full evaluation fields directly — T014 introduces the canonical helper and will be the single authority thereafter
- [X] T011 [US1] Add `PATCH /ideas/{idea_id}/evaluate` route to `backend/app/api/routes/ideas.py` that requires admin JWT, parses `EvaluateIdeaRequest` body, calls `idea_service.evaluate_idea()`, and returns 200 `IdeaDetailResponse` (see contracts/evaluate-idea.md §1)

**Checkpoint**: User Story 1 fully functional — `pytest backend/tests/unit/test_idea_service.py backend/tests/integration/test_idea_routes.py -v` should show U-01..U-10 and I-01..I-06 GREEN.

---

## Phase 4: User Story 2 — Status and Comment Visibility for All Users (Priority: P2)

**Goal**: All authenticated users see a status badge on every idea; comment visibility is gated by role and status (hidden from submitters while under_review).

**Independent Test**: Submit idea → admin evaluates through all 4 statuses in turn → verify correct badge and comment visibility on the detail page for both submitter and admin roles.

### Tests for User Story 2 ⚠️ Write FIRST — confirm RED before implementing

- [X] T012 [P] [US2] Write unit tests U-11 to U-13 for `build_evaluation_info()` and updated `get_idea()` visibility rules (submitter sees under_review with comment=None, admin sees comment, submitter sees accepted with comment) in `backend/tests/unit/test_idea_service.py`; **confirm 3 tests FAIL**
- [X] T013 [P] [US2] Write integration tests I-10 to I-11 for `GET /ideas/{id}` visibility (submitter under_review → comment absent; admin under_review → comment present) in `backend/tests/integration/test_idea_routes.py`; **confirm 2 tests FAIL**
- [X] T030 [P] [US2] Write Vitest + RTL tests for: **EvaluationStatusBadge** (renders correct label and Tailwind color class for each of the 4 status values), **EvaluationForm** (State A — status selectable with only "Under Review" available; State B — status field disabled, comment textarea editable; 1,000-char counter decrements; submit fires the `onSubmit` prop), and **IdeaDetailPage** comment-visibility (submitter + `under_review` → comment block absent from DOM; submitter + `accepted` → comment block present; admin + `under_review` → comment block present) in `frontend/src/components/ideas/EvaluationStatusBadge.test.tsx`, `frontend/src/components/ideas/EvaluationForm.test.tsx`, and `frontend/src/pages/IdeaDetailPage.test.tsx`; run `npm test` and **confirm all tests FAIL**

### Implementation for User Story 2

- [X] T014 [US2] Implement `build_evaluation_info(idea, caller)` with the visibility rule table from data-model.md §3.3 and research.md §5; update `get_idea()` in `backend/app/services/idea_service.py` to call `build_evaluation_info()` before returning `IdeaDetailResponse` — also ensure `IdeaSummaryResponse` items in `list_ideas()` include `evaluation_status` from the DB row
- [X] T015 [P] [US2] Create `EvaluationStatusBadge` React component (4 color variants per MASTER.md: submitted=slate, under_review=blue, accepted=green, rejected=red) in `frontend/src/components/ideas/EvaluationStatusBadge.tsx` — **requires T003 complete, T030 RED confirmed**
- [X] T016 [P] [US2] Create `EvaluationForm` React component (admin-only panel: **State A** — idea in `submitted`, status `<select>` shows only "Under Review" pre-selected (only valid next transition); **State B** — idea in `under_review`, status field is read-only/disabled, only `<textarea>` with 1,000-char counter and submit button editable) in `frontend/src/components/ideas/EvaluationForm.tsx` — **requires T003 complete, T030 RED confirmed**
- [X] T017 [P] [US2] Add `evaluateIdea(ideaId: string, payload: EvaluateIdeaRequest): Promise<IdeaDetailResponse>` function calling `PATCH /ideas/{id}/evaluate` in `frontend/src/api/ideas.ts`
- [X] T018 [US2] Update `frontend/src/pages/IdeaDetailPage.tsx` to: render `EvaluationStatusBadge` (all users), render `EvaluationForm` (admin only), display evaluation comment block when `evaluation.comment` is non-null (per visibility rules from contract); depends on T015, T016, T017, T030
- [X] T019 [US2] Update `frontend/src/pages/IdeasPage.tsx` to render `EvaluationStatusBadge` on each idea list row using `IdeaSummaryResponse.evaluation_status`; depends on T015

**Checkpoint**: User Story 2 fully functional — all 4 statuses show correct badges on list + detail; comment is hidden from submitters while under_review; admin sees comment. T012, T013, T030 tests GREEN.

---

## Phase 5: User Story 3 — Filter Ideas by Status (Priority: P3)

**Goal**: A dropdown in the filter bar lets any authenticated user filter the ideas list by a single status; the filter combines as logical AND with the existing "My Ideas" toggle.

**Independent Test**: Seed ideas across all 4 statuses → apply each status filter → verify only matching ideas are returned; combine with "My Ideas" toggle and verify AND semantics; apply unknown status → verify 422.

### Tests for User Story 3 ⚠️ Write FIRST — confirm RED before implementing

- [X] T020 [P] [US3] Write unit tests U-14 to U-15 for `list_ideas()` `status_filter` parameter (filter returns only matching ideas; AND combination with submitter_id_filter) in `backend/tests/unit/test_idea_service.py`; **confirm 2 tests FAIL**
- [X] T021 [P] [US3] Write integration tests I-07 to I-09 for `GET /ideas?status=` (submitted filter, accepted+mine AND, invalid status → 422) in `backend/tests/integration/test_idea_routes.py`; **confirm 3 tests FAIL**
- [X] T031 [P] [US3] Write Vitest + RTL tests for: **StatusFilter** (renders 5 options: "All statuses", "Submitted", "Under Review", "Accepted", "Rejected"; `onChange` fires with the correct status string, or `undefined` when "All statuses" is selected) and **IdeasPage** status-filter integration (selecting a status from `StatusFilter` passes `status` param to the mocked `listIdeas`; "My Ideas" toggle + status filter simultaneously → both params present in the `listIdeas` mock call) in `frontend/src/components/ideas/StatusFilter.test.tsx` and `frontend/src/pages/IdeasPage.test.tsx`; run `npm test` and **confirm all tests FAIL**

### Implementation for User Story 3

- [X] T022 [US3] Update `list_ideas(db, caller, page, limit, submitter_id_filter, status_filter)` signature in `backend/app/services/idea_service.py` to add optional `status_filter: Optional[EvaluationStatus] = None` and apply `WHERE evaluation_status = :status` clause when provided (see data-model.md §3.4)
- [X] T023 [US3] Update `GET /ideas` route handler in `backend/app/api/routes/ideas.py` to accept optional `status: Optional[EvaluationStatus] = Query(None)` query parameter and pass it as `status_filter` to `list_ideas()` (see contracts/evaluate-idea.md §2)
- [X] T024 [US3] Create `StatusFilter` dropdown component (`<select>` with options: All statuses, Submitted, Under Review, Accepted, Rejected) in `frontend/src/components/ideas/StatusFilter.tsx` — **requires T003 complete, T031 RED confirmed**
- [X] T025 [US3] Update `listIdeas()` in `frontend/src/api/ideas.ts` to accept optional `status?: EvaluationStatus` param and append `?status=…` to the request URL; update `frontend/src/pages/IdeasPage.tsx` to render `StatusFilter` in the filter bar alongside the existing "My Ideas" toggle and pass status state to `listIdeas()`; depends on T024, T019, T031

**Checkpoint**: User Story 3 fully functional — status dropdown in filter bar; AND combination with "My Ideas" works; empty state shown when no match. T020, T021, T031 tests GREEN.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation runs and final quality checks across all user stories.

- [X] T026 [P] Run full backend evaluation test suite and confirm all 27 tests pass (15 unit: U-01..U-15 · 12 integration: I-01..I-12): `pytest backend/tests/unit/test_idea_service.py backend/tests/integration/test_idea_routes.py -v`
- [X] T027 [P] Run frontend test suite and confirm all new tests GREEN (T030: EvaluationStatusBadge, EvaluationForm, IdeaDetailPage visibility; T031: StatusFilter, IdeasPage filter integration) and no regressions in existing tests: `npm test` in `frontend/`
- [X] T028 [P] Verify migration script idempotency by running `python backend/scripts/migrate_eval.py` twice on an existing `backend/innovatepam.db`; confirm second run prints "Skipped (exists)" for all columns and exits cleanly
- [ ] T029 Execute the full quickstart.md manual validation: sections 6.1 (Happy Path lifecycle), 6.2 (Status Filter + AND with "My Ideas"), 6.3 (Lock Enforcement via curl), 6.4 (Non-Assigned Admin Blocked)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — no dependency on US2 or US3
- **User Story 2 (Phase 4)**: Depends on Phase 2 — no dependency on US1 or US3 (US2 builds on what US1 evaluates, but is independently testable)
- **User Story 3 (Phase 5)**: Depends on Phase 2 — no dependency on US1 or US2
- **Polish (Phase 6)**: Depends on all story phases being complete

### User Story Dependencies

- **US1 (P1)**: Start after Foundational — no cross-story deps
- **US2 (P2)**: Start after Foundational — independent; assumes some evaluations exist for manual testing, but automated tests are fully self-contained
- **US3 (P3)**: Start after Foundational — independent; test seeding does not require US1 endpoint

### Within Each User Story

1. Tests MUST be written first and confirmed FAILING
2. Service layer before route layer
3. Backend complete before frontend components
4. Components before page integration

### Parallel Opportunities

Within Phase 1: T002 ∥ T003 (ADR and design system gate in parallel after T001)
Within Phase 2: T004 ∥ T005 ∥ T007 (different files); T006 after T005 (same file)
Within Phase 3: T008 ∥ T009 (test files); T010 → T011 (service before route)
Within Phase 4: T012 ∥ T013 ∥ T030 (test files); T015 ∥ T016 ∥ T017 (different component/API files, after T030 RED); T018 and T019 after their deps
Within Phase 5: T020 ∥ T021 ∥ T031 (test files); T022 → T023 (service before route); T024 → T025 (component before page, after T031 RED and T019)

---

## Parallel Example: User Story 1

```bash
# Step 1 — Write tests in parallel (RED):
Task T008: unit tests U-01..U-10 in backend/tests/unit/test_idea_service.py
Task T009: integration tests I-01..I-06 in backend/tests/integration/test_idea_routes.py

# Step 2 — Implement (sequential, GREEN):
Task T010: evaluate_idea() service in backend/app/services/idea_service.py
Task T011: PATCH route in backend/app/api/routes/ideas.py
```

## Parallel Example: User Story 2

```bash
# Step 1 — Write tests in parallel (RED):
Task T012: unit tests U-11..U-13 in backend/tests/unit/test_idea_service.py
Task T013: integration tests I-10..I-11 in backend/tests/integration/test_idea_routes.py
Task T030: frontend RTL tests for EvaluationStatusBadge, EvaluationForm, IdeaDetailPage visibility

# Step 2 — Frontend components in parallel (after T003 + T030 RED confirmed):
Task T015: EvaluationStatusBadge.tsx
Task T016: EvaluationForm.tsx
Task T017: evaluateIdea() in api/ideas.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T007) — **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T008–T011)
4. **STOP and VALIDATE**: run T026 partial (US1 tests), use quickstart.md §6.3 curl test
5. Demo admin evaluation flow end-to-end

### Incremental Delivery

1. Setup + Foundational → DB and schema ready
2. US1 (T008–T011) → Admin can evaluate ideas (MVP!)
3. US2 (T012–T019, T030) → Users see status badges and role-aware comments
4. US3 (T020–T025, T031) → Filter bar with status dropdown
5. Polish (T026–T029) → Full validation

### Parallel Team Strategy

With multiple developers, after Phase 2 completes:
- **Developer A**: User Story 1 (T008–T011)
- **Developer B**: User Story 2 backend (T012–T014)
- **Developer C**: User Story 2 frontend (T030 RED → T015–T019, after T003)
- **Developer D**: User Story 3 (T031 RED → T020–T025)

---

## Notes

- `[P]` tasks touch different files and have no blocking inter-task dependencies
- TDD is non-negotiable (Constitution Principle III) — run tests before implementing and confirm RED
- T003 (MASTER.md via `/ui-ux-pro-max`) is a **hard gate** — no `.tsx` file for this feature may be written before it completes (Constitution Principle IV)
- Migration script (T001) is idempotent — safe to run on existing DBs; new DBs auto-create correct schema via `create_all`
- Visibility logic lives exclusively in the service layer (research.md §5) — do not duplicate in routes or schemas
- State machine transitions are enforced by `ALLOWED_TRANSITIONS` dict (data-model.md §3.1) — use it as the single source of truth
