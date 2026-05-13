# Tasks: Smart Submission Forms

**Input**: Design documents from `specs/005-smart-submission-forms/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**Tests included**: Backend unit + integration tests and frontend component tests are included per Constitution Principle III (TDD gate confirmed in plan.md §Constitution Check).

**Organization**: Tasks are grouped by user story. All test tasks appear **before** their corresponding implementation tasks (Constitution Principle III NON-NEGOTIABLE: Red-Green-Refactor strictly enforced).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2])
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Project documentation verification before implementation begins.

- [X] T001 Verify `docs/adr/010-extra-data-json-column.md` content matches final design decisions in data-model.md and research.md — confirm JSON TEXT column rationale, alternatives table, and two-step migration strategy are accurately recorded; no file creation needed (file already exists and is marked ✅ Complete in plan.md §Phase 1 Design)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema update, backend validation module, SQLAlchemy model and Pydantic changes, and frontend type additions that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create idempotent migration script backend/scripts/migrate_extra_data.py: Step 1 — ALTER TABLE ideas ADD COLUMN extra_data TEXT (skip if column exists); Step 2 — full table recreation to expand ck_ideas_category CHECK from 4 to 7 values (skip if all 7 values already present); include --rollback flag that reverses both steps via table recreation
- [X] T003 [P] Create backend/app/schemas/extra_data.py: define CATEGORY_FIELD_SCHEMA dict keyed by category name, each value a list of field defs (key, label, type, required, max_length?, options?); implement validate_extra_data(category: str, extra_data: dict | None) -> dict[str, str] enforcing required-field presence, max_length on text, numeric check on number, allowed-values check on select, and rejecting non-null extra_data for "other" category
- [X] T004 [P] Update backend/app/models/idea.py: add extra_data = Column(String, nullable=True) below existing columns; expand CheckConstraint ck_ideas_category to include "talent_development", "client_delivery", "workplace_culture" in addition to the existing 4 values
- [X] T005 [P] Update backend/app/schemas/ideas.py: expand IdeaCategory Literal to all 7 values; add extra_data: Optional[dict[str, Any]] = None to both IdeaDetailResponse and IdeaSummaryResponse; add required import for Any from typing
- [X] T006 [P] Update frontend/src/types/ideas.ts: add extra_data: Record<string, unknown> | null to both IdeaDetailResponse and IdeaSummaryResponse interfaces
- [X] T007 Run the migration to update the live database: cd backend && python scripts/migrate_extra_data.py — verify output confirms extra_data column added and 7-value category CHECK in place (depends on T002)

**Checkpoint**: Migration complete and all base models/schemas/types updated — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Submit Idea With Category-Specific Fields (Priority: P1) 🎯 MVP

**Goal**: A submitter selects a category, sees the correct extra fields appear immediately, fills them in, and submits — extra data is stored in the database and returned on the idea detail API response.

**Independent Test**: Submit one idea per all 7 categories; verify correct extra fields render for each; verify required extra fields block submission when blank; verify optional extra fields allow submission when empty (FR-005); verify GET /api/v1/ideas/{id} returns the saved extra_data correctly.

### Backend Tests (MUST FAIL before T012–T013 are written)

> **Write these tests FIRST — ensure they FAIL before writing any production code.**

- [X] T008 [P] [US1] Write backend/tests/test_extra_data_validation.py: unit tests for validate_extra_data() covering — required field absent returns error; text field exceeds max_length returns error; number field non-numeric returns error; select field invalid option returns error; "other" category with non-null extra_data returns error; valid payload returns empty dict; optional number field absent (null extra_data for category with only optional fields) returns empty dict — FR-005 verification
- [X] T009 [P] [US1] Write backend/tests/test_ideas_api_extra_data.py: integration tests for POST /api/v1/ideas covering — (a) valid extra_data for "process_improvement" creates idea and returns extra_data in response; (b) "process_improvement" submitted with optional field estimated_time_saved_per_week absent returns HTTP 201 — optional extra fields MUST NOT block submission (FR-005); (c) missing required field (e.g., projected_annual_saving_usd for cost_saving) returns HTTP 422 with detail.extra_data shaped exactly as {"field_key": "message"} — no extra wrapping, per contracts/api.md §1.1; (d) "other" category with no extra_data creates idea with extra_data: null

### Shared Frontend Schema Constant

- [X] T010 [P] [US1] Create frontend/src/components/ideas/categoryFieldSchema.ts: export CATEGORY_FIELD_SCHEMA constant (all 7 categories with full field definitions: key, label, type, required, max_length?, options?) and export CategoryFieldDef TypeScript type; this is the single frontend source of truth — both ExtraFieldsSection.tsx and ExtraDataDetails.tsx MUST import from this file; prevents schema duplication and component coupling

### Frontend Tests (MUST FAIL before T014 is written)

- [X] T011 [P] [US1] Write frontend/src/components/ideas/__tests__/ExtraFieldsSection.test.tsx: test that each of the 7 categories renders exactly its fields defined in CATEGORY_FIELD_SCHEMA; test that "other" renders no extra fields; test that text fields have the correct maxLength attribute; test that number fields have type="number"; test that the workplace_culture select renders exactly "Recurring" and "One-Time" options — these tests MUST fail at this point; T014 implementation begins only after these tests are confirmed failing (depends on T010)

### Backend Implementation

- [X] T012 [US1] Update backend/app/api/routes/ideas.py create_idea route: add extra_data: Optional[str] = Form(None) parameter; parse JSON string via json.loads (return 422 on parse failure); call validate_extra_data(category, parsed_dict); if errors raise HTTPException(status_code=422, detail={"extra_data": errors}); pass parsed dict to service layer (depends on T003, T005)
- [X] T013 [US1] Update backend/app/services/idea_service.py create_idea method: accept extra_data: dict | None; store json.dumps(extra_data) if not None else None in Idea row; in the return value build IdeaDetailResponse with json.loads(idea.extra_data) if idea.extra_data is not None else None (depends on T003, T004, T005)

### Frontend Implementation

- [X] T014 [P] [US1] Create frontend/src/components/ideas/ExtraFieldsSection.tsx: import CATEGORY_FIELD_SCHEMA and CategoryFieldDef from categoryFieldSchema.ts; accept category and form controller props; render text inputs with CharacterCounter and maxLength hard-cap, number inputs with type="number", and Select components for select fields; render nothing when category is "other" or unknown — write only after T011 tests are confirmed failing (depends on T010; starts after T011 fails)
- [X] T015 [US1] Update frontend/src/api/ideas.ts submitIdea function: collect values for the extra field keys belonging to the current category from form state; coerce empty-string values for number-type extra fields to null before JSON-serialising (empty string and null MUST be treated equivalently per spec Assumption — FR-005); if category is not "other" and there are extra values, append JSON.stringify(extraFieldValues) as "extra_data" to FormData; omit the field entirely for "other" (depends on T006)
- [X] T016 [US1] Update frontend/src/pages/SubmitIdeaPage.tsx: import ExtraFieldsSection from ExtraFieldsSection.tsx and CATEGORY_FIELD_SCHEMA from categoryFieldSchema.ts; register all 13 extra field keys in the Zod schema as z.string().optional() or z.number().optional() as appropriate; render <ExtraFieldsSection category={watchedCategory} /> below the description field; wire form controller props for each extra field; call submitIdea with form values including extra field keys on submit (depends on T014, T015)

**Checkpoint**: US1 complete — ideas with extra data can be submitted for all 7 categories; data persists and appears correctly in GET /api/v1/ideas/{id}.

---

## Phase 4: User Story 2 — Switch Categories Clears Previous Fields (Priority: P2)

**Goal**: When the submitter changes the category, all previously entered extra field values are cleared instantly and the new category's fields appear empty.

**Independent Test**: Select "talent_development", enter values in "Target Audience" and "Skill Area", switch to "client_delivery" — previous fields disappear and new fields are empty; switch to "other" — all extra fields disappear.

- [X] T017 [US2] Update frontend/src/pages/SubmitIdeaPage.tsx: add a useEffect (or form.watch callback) on the watched category value that calls form.resetField for each of the 13 extra field keys whenever the category changes; ensure this fires before ExtraFieldsSection re-renders so no stale values are visible (depends on T016)

**Checkpoint**: US2 complete — category switching clears all stale extra field values; new fields appear empty.

---

## Phase 5: User Story 3 — View Extra Data on Idea Detail Page (Priority: P2)

**Goal**: The idea detail page shows a "Details" section with human-readable labels and saved values when extra_data is present; renders without errors when extra_data is null.

**Independent Test**: View the detail page for an idea from each category with extra_data populated — verify "Details" section with correct labels; view a pre-existing idea (null extra_data) — no error, no "Details" section.

- [X] T018 [US3] Update backend/app/services/idea_service.py get_idea method: when building IdeaDetailResponse, set extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None — mirrors the create path; ensures legacy ideas with null extra_data are returned as extra_data: null (depends on T013)

### Frontend Tests (MUST FAIL before T020 is written)

- [X] T019 [P] [US3] Write frontend/src/components/ideas/__tests__/ExtraDataDetails.test.tsx: test renders "Details" section with correct human-readable labels and values for each category; test null extra_data renders nothing (no "Details" heading emitted); test "other" category renders nothing; test select field shows human-readable label (e.g., "Recurring") not internal key ("recurring") — these tests MUST fail at this point; T020 implementation begins only after these tests are confirmed failing (depends on T010 for CATEGORY_FIELD_SCHEMA)

### Frontend Implementation

- [X] T020 [P] [US3] Create frontend/src/components/ideas/ExtraDataDetails.tsx: import CATEGORY_FIELD_SCHEMA and CategoryFieldDef from categoryFieldSchema.ts; accept category: string and extra_data: Record<string, unknown> | null props; if extra_data is null or no fields defined for category, return null; render a <section> with a "Details" heading and a <dl> where each field definition has a <dt> (label) and <dd> (value from extra_data); for select fields, map internal key to human-readable option label — write only after T019 tests are confirmed failing (depends on T010; starts after T019 fails)
- [X] T021 [US3] Update frontend/src/pages/IdeaDetailPage.tsx: import ExtraDataDetails; render <ExtraDataDetails category={idea.category} extra_data={idea.extra_data} /> in the idea detail view below the description; component handles null gracefully so no conditional guard is needed in IdeaDetailPage (depends on T020)

**Checkpoint**: US3 complete — detail page renders extra data with human-readable labels; null extra_data is handled gracefully.

---

## Phase 6: User Story 4 — Inline Validation on Required Extra Fields (Priority: P2)

**Goal**: Attempting to submit with a blank required extra field or a non-numeric value in a number extra field blocks submission and shows an inline error on that exact field. Server-side validation errors from a 422 response are also displayed inline per field.

**Independent Test**: For each category with required fields, leave each required field blank and click Submit — form is blocked; inline error appears on the blank field. Enter a non-numeric string in a number extra field — inline error appears. Fill all required fields and submit — succeeds.

- [X] T022 [US4] Update frontend/src/pages/SubmitIdeaPage.tsx Zod schema: add .superRefine() callback that reads the current category value, looks up required fields from CATEGORY_FIELD_SCHEMA (imported from categoryFieldSchema.ts), and attaches a ZodIssue (path: [fieldKey], message: "This field is required.") for each required extra field that is empty or undefined (depends on T016)
- [X] T023 [US4] Update frontend/src/pages/SubmitIdeaPage.tsx Zod schema: for each number-type extra field key in CATEGORY_FIELD_SCHEMA, apply z.coerce.number({ invalid_type_error: "Must be a number." }).optional().nullable() so non-numeric input is caught with a per-field inline error before submit — satisfies FR-007; independent of T022 (depends on T016)
- [X] T024 [US4] Update frontend/src/pages/SubmitIdeaPage.tsx submit error handler: on receiving a 422 response, check if response.detail.extra_data is a plain object; call form.setError(fieldKey, { message }) for each key in detail.extra_data so ExtraFieldsSection displays server-side errors inline alongside client-side errors — independent of T022 and T023 (depends on T016 only)

**Checkpoint**: US4 complete — required extra fields and non-numeric number values block submission with inline errors; server-side validation errors surface per-field in the form.

---

## Phase 7: User Story 5 — Extra Data in API Responses (Priority: P3)

**Goal**: Both the idea list endpoint and the detail endpoint return extra_data (or null) for every idea, satisfying the full API contract from contracts/api.md.

**Independent Test**: After submitting ideas with and without extra data, query GET /api/v1/ideas and GET /api/v1/ideas/{id} — extra_data is present in every response entry, either as the correct object or as null (never omitted).

- [X] T025 [US5] Update backend/app/services/idea_service.py list_ideas method: when building each IdeaSummaryResponse, set extra_data=json.loads(idea.extra_data) if idea.extra_data is not None else None — mirrors T018 for the list endpoint (depends on T013)
- [X] T026 [P] [US5] Add list-endpoint assertions to backend/tests/test_ideas_api_extra_data.py: after creating an idea with extra_data, verify GET /api/v1/ideas response contains extra_data on the matching entry; create an idea for "other" category and verify its extra_data is null (not absent) in the list response (depends on T009)

**Checkpoint**: US5 complete — full extra_data API contract satisfied for both list and detail endpoints per contracts/api.md.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, smoke testing, and hardening across all user stories.

- [X] T027 Run full backend test suite: cd backend && pytest tests/test_extra_data_validation.py tests/test_ideas_api_extra_data.py -v — all tests must pass
- [X] T028 [P] Run full frontend test suite: cd frontend && npm run test — ExtraFieldsSection.test.tsx and ExtraDataDetails.test.tsx must pass; no regressions in existing test files
- [X] T029 [P] Execute quickstart.md smoke tests manually: run migration, start backend + frontend, perform all Step 4 manual smoke tests (extra fields appear on category selection, category switch clears extra fields, required-field block, detail-page "Details" section, legacy idea renders without error)
- [X] T030 [P] Verify character hard-cap behavior in ExtraFieldsSection.tsx for text extra fields: confirm maxLength stops input at the limit and CharacterCounter shows remaining characters reaching zero — satisfies SC-001 and FR-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; T002–T006 are fully parallel with each other; T007 (run migration) depends only on T002 — BLOCKS all user stories
- **US1 (Phase 3)**: All of Phase 2 must be complete; T008, T009, T010 are parallel; T011 depends on T010 (and must fail before T014); T012 depends on T003/T005; T013 depends on T003/T004/T005; T014 depends on T010 and starts after T011 is confirmed failing; T015 depends on T006; T016 depends on T014 and T015
- **US2 (Phase 4)**: T017 depends on T016
- **US3 (Phase 5)**: T018 depends on T013; T019 depends on T010 (and must fail before T020); T020 depends on T010 and starts after T019 is confirmed failing; T021 depends on T020
- **US4 (Phase 6)**: T022, T023, and T024 each depend only on T016 — all three are independent of each other and can run in parallel
- **US5 (Phase 7)**: T025 depends on T013; T026 depends on T009
- **Polish (Phase 8)**: All user story phases must be complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no story-level dependencies
- **US2 (P2)**: Depends on US1 T016 (SubmitIdeaPage) — builds on the existing form integration
- **US3 (P2)**: Depends on US1 T013 (service) and T010 (schema constant) — detail-page work is otherwise independent
- **US4 (P2)**: Depends on US1 T016 (form) — validation layer built on top of the submit flow
- **US5 (P3)**: Depends on US1 T013 (service) — backend-only addition, no frontend changes

### Within Each User Story (TDD Order — NON-NEGOTIABLE)

- T008 (unit tests) must fail → T012/T013 (backend implementation)
- T009 (integration tests) must fail → T012/T013 (backend implementation)
- T010 (schema constant) → T011 (frontend tests must fail) → T014 (ExtraFieldsSection implementation)
- T010 (schema constant) → T019 (frontend tests must fail) → T020 (ExtraDataDetails implementation)
- Backend: schema module (T003) → route (T012) → service (T013)
- Frontend form: schema constant (T010) → ExtraFieldsSection (T014) → SubmitIdeaPage (T016)

### Parallel Opportunities

- T002–T006 (Phase 2): all five in parallel
- T008, T009, T010 (US1 backend tests + schema constant): parallel
- T011 (US1 frontend tests): after T010
- T012, T013, T014 (backend + ExtraFieldsSection): T012 and T013 parallel; T014 after T011 fails
- T018, T019 (US3 backend service + frontend tests): parallel
- T020 (ExtraDataDetails): after T019 fails
- T022, T023, T024 (US4): all three in parallel (all depend only on T016)
- T025, T026 (US5): parallel
- T027, T028, T029, T030 (Polish): all parallel

---

## Parallel Example: User Story 1

```bash
# Step 1 — backend tests and schema constant (parallel):
T008: Write backend/tests/test_extra_data_validation.py
T009: Write backend/tests/test_ideas_api_extra_data.py
T010: Create frontend/src/components/ideas/categoryFieldSchema.ts

# Step 2 — frontend tests after schema constant (must fail before T014):
T011: Write frontend/src/components/ideas/__tests__/ExtraFieldsSection.test.tsx

# Step 3 — backend + ExtraFieldsSection implementation (parallel after tests fail):
T012: Update backend/app/api/routes/ideas.py
T013: Update backend/app/services/idea_service.py
T014: Create frontend/src/components/ideas/ExtraFieldsSection.tsx

# Step 4 — sequential frontend wiring:
T015: Update frontend/src/api/ideas.ts
T016: Update frontend/src/pages/SubmitIdeaPage.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify ADR)
2. Complete Phase 2: Foundational — migration script + run it + extra_data.py + model + schemas + types
3. Complete Phase 3: User Story 1 — tests → schema constant → route → service → ExtraFieldsSection → api → SubmitIdeaPage
4. **STOP and VALIDATE**: run pytest + npm test + quickstart.md Step 4 smoke tests for US1
5. Demo / review before committing to US2–US5

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Submit + store + retrieve → **MVP**
3. Phase 4 (US2) → Category switching clears extra fields
4. Phase 5 (US3) → Detail page renders extra data
5. Phase 6 (US4) → Inline validation complete
6. Phase 7 (US5) → List API includes extra_data
7. Phase 8 → Polish and final verification

### Parallel Team Strategy

With two developers:
- **Developer A (backend)**: T002–T005 → T007 → T008 → T009 → T012 → T013 → T018 → T025 → T026 → T027
- **Developer B (frontend)**: T006 → T010 → T011 → T014 → T015 → T016 → T017 → T019 → T020 → T021 → T022 → T023 → T024 → T028–T030

---

## Notes

- **TDD is NON-NEGOTIABLE** (Constitution Principle III): T011 must fail before T014; T019 must fail before T020. Do not skip these gates.
- [P] tasks = different files, no unmet dependencies — safe to execute in parallel
- [USx] label maps each task to its user story for end-to-end traceability
- `categoryFieldSchema.ts` (T010) is the single frontend source of truth for extra field definitions — ExtraFieldsSection.tsx, ExtraDataDetails.tsx, and SubmitIdeaPage.tsx all import from it; never duplicate this schema
- All 13 extra field keys (target_process, estimated_time_saved_per_week, technology_tool_name, affected_systems_or_teams, current_annual_cost_usd, projected_annual_saving_usd, target_audience, skill_area, estimated_duration_hours, affected_delivery_phase, client_impact, target_group, recurring_or_one_time) must be pre-registered in the Zod schema as optional; T022's superRefine enforces required per category; T023's coerce.number() enforces numeric type
- Empty-string values from number HTML inputs MUST be coerced to null before JSON serialisation (T015) — empty string and null are treated equivalently per spec Assumption
- US4 tasks T022, T023, T024 are fully independent of each other — all depend only on T016; run all three in parallel
- T007 (run migration) MUST complete before any integration test (T009, T026) can pass
- The migration is idempotent — safe to run multiple times during development
- Idea editing is out of scope; extra_data is write-once — no PATCH route changes needed (plan.md Assumption)
