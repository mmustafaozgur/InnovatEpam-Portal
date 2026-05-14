# Tasks: Multi-Stage Review Pipeline

**Input**: Design documents from `/specs/007-multi-stage-review/`

**Prerequisites**: plan.md ✓ · spec.md ✓ · research.md ✓ · data-model.md ✓ · contracts/api.md ✓ · quickstart.md ✓

**Tests**: Included — Constitution Principle III (TDD) is a NON-NEGOTIABLE gate. Tests are written in Phase 1 **before any model or implementation code exists**. A failing import (ImportError) counts as the required "red" state.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every task description

---

## Phase 1: TDD Baseline

**Purpose**: Write ALL backend tests and establish frontend type infrastructure **before any model or implementation code is created**. Tests will fail with `ImportError` at first — that is the required red state per Constitution Principle III (NON-NEGOTIABLE).

> **⚠️ TDD GATE: Complete T001–T002 and confirm both FAIL before proceeding to Phase 2.**

- [ ] T001 [P] [US1] Write failing unit tests for `advance_stage()`: valid sequential advances, stage-skip rejection, backward-advance rejection, non-assigned-admin rejection after initial claim, first-admin race condition (409), and **comment exceeding 1000 chars rejected with 422** (SC-007) in `backend/tests/unit/test_idea_service.py`
- [ ] T002 [P] [US1] Write failing integration tests for `POST /api/v1/ideas/{id}/reviews`: 201 happy path with full `IdeaDetailResponse`, 403 non-assigned admin, 409 race condition, 401 unauthenticated, **422 when comment > 1000 chars**, and **`PATCH /api/v1/ideas/{id}/evaluate` returns 404/405** (removed endpoint verification) in `backend/tests/integration/test_idea_routes.py`
- [ ] T003 [P] Replace `EvaluationStatus`, `EvaluationInfo`, `EvaluateIdeaRequest` with `Stage`, `Outcome`, `StageReviewRecord`, `AdvanceStageRequest` types; update `IdeaDetailResponse` and `IdeaSummaryResponse` shapes in `frontend/src/types/ideas.ts`
- [ ] T004 [P] Remove `evaluateIdea()`, add `advanceStage(id: string, body: AdvanceStageRequest): Promise<IdeaDetailResponse>`, update `listIdeas()` (`status` param → `stage` param), update `getIdea()` return type in `frontend/src/api/ideas.ts`

**Checkpoint**: T001 and T002 confirmed failing (ImportError or assertion failures). T003 and T004 pass type checks. Model creation can now begin.

---

## Phase 2: Foundational (Models, Schemas, Submission Audit)

**Purpose**: Create models and schemas now that tests exist in their red state. Also audit the idea submission path (FR-011) and update schemas so all user stories have the types they need.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [ ] T005 Create `StageReview` SQLAlchemy model with all seven columns and `idx_stage_reviews_idea_id` index in `backend/app/models/stage_review.py`
- [ ] T006 Add `current_stage TEXT NOT NULL DEFAULT 'new_idea'` column with stage `CheckConstraint` and `idx_ideas_current_stage` index to Idea model in `backend/app/models/idea.py`
- [ ] T007 Add `StageReviewRecord`, `AdvanceStageRequest` Pydantic schemas; update `IdeaDetailResponse` (add `current_stage`, `stage_reviews`, `assigned_admin_id`, `assigned_admin_name`; remove `evaluation` block) and `IdeaSummaryResponse` (`evaluation_status` → `current_stage`) in `backend/app/schemas/ideas.py`
- [ ] T008 Audit idea creation code path for FR-011: locate and remove any explicit `evaluation_status = 'submitted'` assignment in `backend/app/services/idea_service.py` and `backend/app/api/routes/ideas.py`; confirm new ideas default to `current_stage = 'new_idea'` via schema `DEFAULT`; verify `POST /api/v1/ideas` response shape includes `current_stage`

**Checkpoint**: T001/T002 tests now fail on assertions (not ImportError) — models exist but services are unimplemented. Foundation ready.

---

## Phase 3: User Story 1 — Admin Advances Idea Through Stages (Priority: P1) 🎯 MVP

**Goal**: Admins can advance ideas sequentially through non-terminal stages (`new_idea` → `initial_screening` → `technical_review` → `business_impact_assessment`). The first admin to advance from `new_idea` becomes the assigned admin; only the assigned admin can continue from `initial_screening` onward. Stage skipping and backward movement are rejected. Simultaneous first-admin claims return 409 Conflict.

**Independent Test**: Log in as Admin A, open a `new_idea` idea, and advance it to `initial_screening` with a 1001-character comment — confirm rejection 422. Retry with a valid comment — confirm Admin A is now `assigned_admin_id` and a `stage_review` record exists. Advance through `technical_review` and `business_impact_assessment`. Attempt by Admin B to advance is rejected 403. Attempt to skip a stage is rejected 422.

### Backend Implementation for User Story 1

- [ ] T009 [US1] Implement `advance_stage(idea_id, acting_admin_id, comment, outcome)` with stage-ordering validation, first-admin assignment logic, non-assigned-admin rejection, serialized write-lock pre-condition check for 409 race condition, immutable `stage_review` record creation, and 422 on comment > 1000 chars in `backend/app/services/idea_service.py`
- [ ] T010 [US1] Add `POST /api/v1/ideas/{idea_id}/reviews` endpoint and remove `PATCH /api/v1/ideas/{idea_id}/evaluate` in `backend/app/api/routes/ideas.py`
- [ ] T011 [US1] Update `list_ideas()` to filter by `current_stage` via `stage` query parameter, removing the `status` parameter in `backend/app/services/idea_service.py`
- [ ] T012 [US1] Update `GET /api/v1/ideas` route to accept `stage: Stage | None` query param; remove `status` param in `backend/app/api/routes/ideas.py`

### Design System Gate — MUST COMPLETE BEFORE ANY FRONTEND COMPONENT TASK (Constitution Principle IV)

- [ ] T013 Read `design-system/innovatepam/MASTER.md`; extract and document the applicable color tokens, typography scale, spacing, and interactive-state patterns for `StageBadge`, `StageFilter`, `StageTimeline`, and `StageAdvanceForm` before writing any component implementation in `frontend/src/components/ideas/`

### Frontend for User Story 1

> **⚠️ TDD GATE: Write T014–T015 first and confirm they FAIL before implementing T016–T017.**

- [ ] T014 [P] [US1] Write failing test for `StageBadge`: renders correct label and color per stage value in `frontend/src/components/ideas/__tests__/StageBadge.test.tsx`
- [ ] T015 [P] [US1] Write failing test for `StageFilter`: renders all five stage options and fires the filter callback correctly in `frontend/src/components/ideas/__tests__/StageFilter.test.tsx`
- [ ] T016 [US1] Create `StageBadge` component using design system tokens from T013 with stage-to-label and stage-to-color mappings, replacing `EvaluationStatusBadge` in `frontend/src/components/ideas/StageBadge.tsx`
- [ ] T017 [US1] Create `StageFilter` component using design system tokens from T013 with all five `Stage` values, replacing `StatusFilter` in `frontend/src/components/ideas/StageFilter.tsx`

**Checkpoint**: T001/T002 tests pass. `POST /reviews` creates `stage_review` records for non-terminal stages. `GET /ideas?stage=` filters correctly. StageBadge and StageFilter pass their tests. T013 design notes documented.

---

## Phase 4: User Story 2 — Admin Completes Final Selection (Priority: P1)

**Goal**: The assigned admin can advance an idea from `business_impact_assessment` to `final_selection` by providing an explicit `outcome` (accepted or rejected). After transition, the idea is permanently locked — no further stage advances or comments are permitted at either the API or UI layer.

**Independent Test**: Advance idea to `business_impact_assessment`; POST to `/reviews` without `outcome` — expect 422. POST with `outcome=accepted` — expect 201 with `current_stage=final_selection`. Attempt any further POST to `/reviews` — expect 422. Confirm `StageAdvanceForm` absent in UI for the locked idea.

### Tests for User Story 2

> **⚠️ TDD GATE: Write T018–T019 first and confirm they FAIL before implementing T020.**

- [ ] T018 [P] [US2] Write failing unit tests for final_selection: missing `outcome` rejected (422), successful `accepted`/`rejected` transitions create `stage_review` with correct `outcome`, any advance of a locked idea rejected (422) in `backend/tests/unit/test_idea_service.py`
- [ ] T019 [P] [US2] Write failing integration tests: 422 when `outcome` absent on final_selection advance, 422 on any action after locking, correct `outcome` value persisted in `stage_review` record in `backend/tests/integration/test_idea_routes.py`

### Implementation for User Story 2

- [ ] T020 [US2] Extend `advance_stage()` — implemented in T009 — to require non-null `outcome` when advancing to `final_selection` (422 if absent) and reject any advance when `current_stage == 'final_selection'` with 422 (locked); note: **depends on T009** in `backend/app/services/idea_service.py`
- [ ] T021 [US2] Write failing test for `StageAdvanceForm`: renders comment textarea, shows outcome radio group only when `nextStage === 'final_selection'`, hidden entirely when idea is locked in `frontend/src/components/ideas/__tests__/StageAdvanceForm.test.tsx`
- [ ] T022 [US2] Create `StageAdvanceForm` component using design system tokens from T013, with comment textarea (max 1000 chars enforced at input level) and outcome radio group rendered only when advancing to `final_selection`, calling `advanceStage()` on submit in `frontend/src/components/ideas/StageAdvanceForm.tsx`
- [ ] T023 [US2] Update `IdeaDetailPage` to show `StageAdvanceForm` only when the current user is the assigned admin and idea is not at `final_selection` in `frontend/src/pages/IdeaDetailPage.tsx`

**Checkpoint**: Final selection works end-to-end with outcome. Idea permanently locked post-transition. `StageAdvanceForm` absent for locked ideas and for non-assigned admins.

---

## Phase 5: User Story 3 — Idea Detail Page Shows Stage Timeline (Priority: P2)

**Goal**: The idea detail page shows a chronological stage timeline for all completed transitions. Server-side visibility filtering per FR-009: assigned admin / other admins / original submitter receive the full `stage_reviews` array; all other authenticated users receive `stage_reviews: []`. The `current_stage` label is always visible to all authenticated users regardless of timeline eligibility. When an idea has no review records (still `new_idea`), the timeline shows a single greyed pending "New Idea" entry.

**Independent Test**: Advance idea through three stages with comments. View as: (1) assigned admin — full 3-entry timeline; (2) other admin — full timeline, no action controls; (3) original submitter — full timeline, read-only; (4) different submitter — `stage_reviews: []`, `current_stage` label still visible; (5) fresh idea with no records — single greyed "New Idea" pending entry.

### Tests for User Story 3

> **⚠️ TDD GATE: Write T024–T025 first and confirm they FAIL before implementing T026–T027.**

- [ ] T024 [P] [US3] Write failing unit tests for `get_idea()` visibility filtering: assigned admin receives full `stage_reviews`, other admin receives full array, original submitter receives full array, other authenticated user receives `[]` in `backend/tests/unit/test_idea_service.py`
- [ ] T025 [P] [US3] Write failing integration tests for `GET /api/v1/ideas/{id}`: `stage_reviews` content per caller role, `assigned_admin_name` present; also **verify that no `PATCH` or `DELETE` endpoints exist for stage review records** (FR-012 — immutability enforced by absence of endpoint) in `backend/tests/integration/test_idea_routes.py`

### Implementation for User Story 3

- [ ] T026 [US3] Implement server-side `stage_reviews` visibility filtering in `get_idea()` using the FR-009 visibility matrix (role check + `submitter_id` equality check) in `backend/app/services/idea_service.py`
- [ ] T027 [US3] Update `GET /api/v1/ideas/{idea_id}` route to embed visibility-filtered `stage_reviews` array and `assigned_admin_name` in the `IdeaDetailResponse` in `backend/app/api/routes/ideas.py`
- [ ] T028 [US3] Write failing test for `StageTimeline`: renders chronological entries (stage name, reviewer name, timestamp, optional comment); shows greyed pending "New Idea" entry when `stage_reviews` is empty in `frontend/src/components/ideas/__tests__/StageTimeline.test.tsx`
- [ ] T029 [US3] Create `StageTimeline` component using design system tokens from T013, with chronological review entries and a greyed pending "New Idea" entry when `stage_reviews` is empty in `frontend/src/components/ideas/StageTimeline.tsx`
- [ ] T030 [US3] Update `IdeaDetailPage` to render `StageTimeline` for assigned admin, other admins, and original submitter; omit `StageTimeline` for non-eligible users — **`current_stage` label MUST remain visible to all authenticated users even when the timeline is omitted** (FR-009) in `frontend/src/pages/IdeaDetailPage.tsx`

**Checkpoint**: Stage timeline visible to all authorized roles; empty for others; pending "New Idea" entry shown correctly. `current_stage` label present for all users regardless of role.

---

## Phase 6: User Story 4 — Migration from Previous Evaluation Workflow (Priority: P2)

**Goal**: All existing ideas migrated from `evaluation_status` to `current_stage` per the defined mapping without data loss. Migration is idempotent. After verification, `evaluation_status`, `evaluation_comment`, and `evaluated_at` columns are dropped.

**Independent Test**: Run migration on dev DB snapshot. Verify: `submitted` → `new_idea` (no `stage_review`); `under_review` → `initial_screening` (one record, comment migrated, nullable `reviewed_by`); `accepted`/`rejected` → `final_selection` (record with outcome). Run again — no duplicate records. Confirm old columns absent.

### Tests for User Story 4

> **⚠️ TDD GATE: Write T031 first and confirm it FAILS before implementing T032.**

- [ ] T031 [US4] Write failing unit tests for migration in **new file not listed in plan.md — add `backend/tests/unit/test_migrate_stage_reviews.py` to plan.md file list**: all four `evaluation_status` → `current_stage` mappings, correct `stage_reviews` creation per mapping, idempotency (ideas with `current_stage` already populated are skipped, no duplicate records), NULL `reviewed_by` for `under_review` ideas without `assigned_admin_id` in `backend/tests/unit/test_migrate_stage_reviews.py`

### Implementation for User Story 4

- [ ] T032 [US4] Implement idempotent migration script: (1) ALTER `ideas` to add `current_stage DEFAULT 'new_idea'`; (2) INSERT `stage_reviews` per the mapping table for non-submitted ideas; (3) ALTER `ideas` to DROP `evaluation_status`, `evaluation_comment`, and `evaluated_at` in `backend/scripts/migrate_stage_reviews.py`
- [ ] T033 [US4] Manual verification — run `python scripts/migrate_stage_reviews.py` against the dev database (not a test fixture); confirm old columns absent via `sqlite3 backend/innovatepam.db ".schema ideas"`; run the script a second time and confirm row counts in `stage_reviews` are unchanged (idempotency); report any discrepancies before proceeding to Final Phase

**Checkpoint**: Migration verified idempotent and complete. All historical data preserved. Legacy columns absent from schema.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: UI integration across the ideas list page and full end-to-end validation.

- [ ] T034 [P] Discover the ideas list component filename by searching `frontend/src/` for the component that renders the paginated ideas list (the file name is not specified in plan.md — run a targeted search before editing); then update that file to use `StageFilter` and `StageBadge`, removing old `StatusFilter` and `EvaluationStatusBadge` references
- [ ] T035 [P] Verify `docs/adr/012-stage-review-table.md` is complete, references plan.md, and correctly supersedes ADR-009
- [ ] T036 Run full `specs/007-multi-stage-review/quickstart.md` validation checklist end-to-end and confirm all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **TDD Baseline (Phase 1)**: No dependencies — write tests immediately; confirm red state before Phase 2
- **Foundational (Phase 2)**: Depends on Phase 1 tests existing — models created here cause tests to shift from ImportError → assertion failures
- **US1 (Phase 3)**: Unblocked after Phase 2 — no dependency on US2, US3, or US4
- **US2 (Phase 4)**: Depends on US1 — T020 extends `advance_stage()` implemented in T009
- **US3 (Phase 5)**: Depends on US1 — T026 extends `get_idea()` which must include `stage_reviews`; T030 depends on T023 (IdeaDetailPage from US2)
- **US4 (Phase 6)**: Depends on Phase 2 only — fully independent of US1/US2/US3; can run in parallel with them
- **Polish (Final Phase)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2
- **US2 (P1)**: Depends on US1 — T020 extends T009's `advance_stage()`; T023 modifies `IdeaDetailPage` started in US1
- **US3 (P2)**: Depends on US1 for `stage_reviews` in response shape; T030 depends on T023 from US2
- **US4 (P2)**: Unblocked after Phase 2 — run in parallel with US1/US2/US3 if staffed

### Within Each User Story

- **TDD Gate (NON-NEGOTIABLE)**: Phase 1 tests (T001, T002) must be written and failing before Phase 2 begins. Each subsequent story's tests must be written and failing before that story's implementation begins.
- Frontend types (T003, T004) before frontend component tests (T014, T015, T021, T028)
- Design gate (T013) before any frontend component implementation (T016, T017, T022, T029)
- Services before routes: T009 before T010; T026 before T027
- Story implementation complete before moving to next priority

### Parallel Opportunities

| Parallel Group | Tasks | Why Safe |
|----------------|-------|----------|
| Phase 1 tests + types | T001, T002, T003, T004 | Different files — unit/integration/types/api-client |
| Phase 2 models | T005, T006 | Different model files |
| US1 frontend tests | T014, T015 | Different component test files |
| US1 frontend components | T016, T017 | Different component files |
| US2 backend tests | T018, T019 | Different files (unit vs. integration) |
| US3 backend tests | T024, T025 | Different files (unit vs. integration) |
| US4 vs US2/US3 | T031–T033 vs T018–T030 | US4 is independent after Phase 2 |
| Polish cleanup | T034, T035 | Different files |

---

## Parallel Example: User Story 1

```bash
# Step 1 — Write ALL Phase 1 tests in parallel (different files):
Task T001: "Write failing advance_stage() unit tests (incl. comment > 1000 chars) in backend/tests/unit/test_idea_service.py"
Task T002: "Write failing integration tests (incl. PATCH /evaluate → 405) in backend/tests/integration/test_idea_routes.py"
Task T003: "Update frontend types in frontend/src/types/ideas.ts"
Task T004: "Update frontend API client in frontend/src/api/ideas.ts"
# ↑ Confirm T001 and T002 both fail (red) before Phase 2

# Step 2 — Create models and schemas (sequential — ordering matters):
Task T005: "Create StageReview model in backend/app/models/stage_review.py"
Task T006: "Update Idea model in backend/app/models/idea.py"
Task T007: "Update Pydantic schemas in backend/app/schemas/ideas.py"
Task T008: "Audit submission code path in idea_service.py and routes/ideas.py"
# ↑ After Phase 2: T001/T002 now fail on assertions, not ImportError

# Step 3 — Backend implementation (US1, sequential — same service file):
Task T009: "Implement advance_stage() in backend/app/services/idea_service.py"
Task T010: "Add POST /reviews + remove PATCH /evaluate in backend/app/api/routes/ideas.py"
Task T011: "Update list_ideas() stage filter in backend/app/services/idea_service.py"
Task T012: "Update GET /ideas route in backend/app/api/routes/ideas.py"

# Step 4 — Design gate (blocking for all component work):
Task T013: "Read design-system/innovatepam/MASTER.md; document tokens for all 4 new components"

# Step 5 — Frontend component tests in parallel (different files):
Task T014: "Write failing StageBadge test in frontend/src/components/ideas/__tests__/StageBadge.test.tsx"
Task T015: "Write failing StageFilter test in frontend/src/components/ideas/__tests__/StageFilter.test.tsx"
# ↑ Confirm both fail before Step 6

# Step 6 — Frontend components in parallel (different files):
Task T016: "Create StageBadge in frontend/src/components/ideas/StageBadge.tsx"
Task T017: "Create StageFilter in frontend/src/components/ideas/StageFilter.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: TDD Baseline (T001–T004) — confirm tests red
2. Complete Phase 2: Foundational (T005–T008) — models + schemas; tests shift to assertion failures
3. Complete Phase 3: User Story 1 (T009–T017) — including design gate T013
4. Complete Phase 4: User Story 2 (T018–T023)
5. **STOP and VALIDATE**: Full pipeline `new_idea` → `final_selection` working; all backend tests pass
6. Deploy/demo

### Incremental Delivery

1. TDD Baseline + Foundational → red tests and schema foundations ready
2. US1 → stage advance for non-terminal stages; StageBadge + StageFilter (**MVP!**)
3. US2 → final selection with outcome; StageAdvanceForm; locking
4. US3 → stage timeline in detail page; visibility filtering per role
5. US4 → migration from old evaluation workflow; legacy columns dropped
6. Polish → list page integration; ADR verification; full end-to-end validation

### Parallel Team Strategy

After Phase 2 is complete:
- **Developer A**: US1 + US2 — backend `advance_stage()` + frontend advance form
- **Developer B**: US3 — visibility filtering + `StageTimeline` component
- **Developer C**: US4 — migration script + tests (fully independent after Phase 2)

---

## Notes

- **[P]** tasks operate on different files with no shared dependencies — safe to parallelize
- **[Story]** label maps every task to a specific user story for full traceability
- **TDD ordering**: Tests (Phase 1) → Models (Phase 2) → Implementation (Phase 3+). This matches quickstart.md steps 1–6 exactly.
- **Design gate (T013)**: Constitution Principle IV is a hard gate — T013 must be completed before T016, T017, T022, or T029 begins
- `comment` max 1000 chars enforced at three layers: SQLAlchemy `CheckConstraint`, Pydantic `max_length=1000`, and frontend input `maxLength`
- `final_selection` is the only terminal stage — once reached, the idea is permanently locked; `current_stage` label remains visible to all authenticated users even when locked
- Migration (T032) is idempotent — safe to re-run; always verify on dev DB before running on any shared environment
- SQLite serializes all write transactions — no external lock needed for race-condition handling; use an in-transaction pre-condition check returning 409 on conflict
- `test_migrate_stage_reviews.py` (created in T031) is a new file not in plan.md's project structure — update plan.md file list at or before T031
- T034 requires file discovery before editing — the ideas list component filename is not specified in plan.md
