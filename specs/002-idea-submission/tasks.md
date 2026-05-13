# Tasks: Idea Submission System

**Input**: Design documents from `specs/002-idea-submission/`

**Branch**: `002-idea-submission` | **Date**: 2026-05-13

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**Tests**: Included — constitution Principle III mandates TDD (Red-Green-Refactor). All test tasks
MUST be confirmed **failing** before the corresponding implementation task begins.

**Organization**: Tasks grouped by user story. Each story is independently completable and testable.

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Parallelizable (different files, no incomplete dependency)
- **[Story]**: User story this task belongs to (US1 / US2 / US3)
- All implementation tasks have exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and add feature infrastructure before any story work begins.

- [X] T001 Install `@radix-ui/react-select` (`npm install @radix-ui/react-select` in `frontend/`) and add shadcn/ui components (`npx shadcn@latest add select textarea` in `frontend/`) — modifies `frontend/package.json` and creates `frontend/src/components/ui/select.tsx`, `frontend/src/components/ui/textarea.tsx`
- [X] T002 [P] Add `UPLOAD_DIR: str = "./uploads"` setting and `upload_path(idea_id, stored_name)` helper method to `backend/app/core/config.py`
- [X] T003 [P] Add `uploads/` entry to `backend/.gitignore` (or root `.gitignore`) to exclude uploaded files from version control
- [X] T004 [P] Add shimmer animation keyframe and `.animate-shimmer` utility class to `frontend/src/index.css` per MASTER.md §"Idea Submission Components"

**Checkpoint**: Dependencies installed, upload directory configured, shimmer CSS ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer and shared types that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create `Idea` SQLAlchemy model with all columns, CHECK constraints, and indices in `backend/app/models/idea.py` — see data-model.md for exact schema
- [X] T006 Add `import app.models.idea  # noqa: F401` to `backend/app/database.py` alongside existing Session import so `Base.metadata.create_all` registers the `ideas` table
- [X] T007 [P] Create Pydantic schemas `IdeaDetailResponse`, `IdeaSummaryResponse`, `IdeaListResponse` in `backend/app/schemas/ideas.py` — see contracts/api.md for field definitions
- [X] T008 [P] Create TypeScript types `IdeaDetailResponse`, `IdeaSummaryResponse`, `IdeaListResponse`, `FileInfo` in `frontend/src/types/ideas.ts` — mirrors contracts/api.md response schemas

**Checkpoint**: Foundation ready — `ideas` table will be created on next backend start; all type contracts established

---

## Phase 3: User Story 1 — Submit an Idea (Priority: P1) 🎯 MVP

**Goal**: Submitter fills title + description + category, submits, is redirected to the new idea's
detail page. Evaluators see a restriction notice. Unauthenticated users are redirected to login.

**Independent Test**: Log in as a Submitter → fill and submit the idea form → verify redirect to
detail page → verify idea appears in the DB with correct `submitter_id`. Log in as an Evaluator →
visit `/submit` → confirm the restriction notice renders instead of the form.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL before T014

- [X] T009 [US1] Write unit tests for `idea_service.create_idea`: required field validation (missing title/desc/category → ValueError), category enum rejection, correct `submitter_id` assignment, returned `IdeaDetailResponse` shape — `backend/tests/unit/test_idea_service.py`
- [X] T010 [P] [US1] Write integration tests for `POST /api/v1/ideas`: 201 + body on valid Submitter request, 400 on missing title/description/category, 403 for Evaluator role, 401 for unauthenticated — `backend/tests/integration/test_idea_routes.py`
- [X] T011 [P] [US1] Write Vitest tests for `CharacterCounter`: normal state text, warning state (red) at ≤10% remaining, correct `{current} / {max}` output — `frontend/src/components/ideas/__tests__/CharacterCounter.test.tsx`
- [X] T012 [P] [US1] Write Vitest tests for `CategoryBadge`: renders correct label for all four category values, unknown value falls back to raw value — `frontend/src/components/ideas/__tests__/CategoryBadge.test.tsx`
- [X] T013 [P] [US1] Write RTL tests for `SubmitIdeaPage`: shows form for Submitter, shows `RoleRestrictionNotice` for Evaluator, form shows validation errors on empty submit, successful submit calls `submitIdea` and redirects — `frontend/src/pages/__tests__/SubmitIdeaPage.test.tsx`

### Implementation for User Story 1

- [X] T014 [US1] Implement `create_idea(db, current_user, title, description, category)` in `backend/app/services/idea_service.py` — generates UUID, persists row, returns `IdeaDetailResponse` using `current_user.full_name` (no extra query needed for submitter name on create)
- [X] T015 [US1] Create `backend/app/api/routes/ideas.py` with `POST /ideas` route (role guard: 403 if `current_user.role == "admin"`); include `ideas_router` with prefix `/api/v1` in `backend/main.py`
- [X] T016 [P] [US1] Create `CharacterCounter` component per MASTER.md spec in `frontend/src/components/ideas/CharacterCounter.tsx`
- [X] T017 [P] [US1] Create `CategoryBadge` component (grey pill, CATEGORY_LABELS map) per MASTER.md spec in `frontend/src/components/ideas/CategoryBadge.tsx`
- [X] T018 [P] [US1] Create `RoleRestrictionNotice` component (blue-tinted banner, `role="status"`) per MASTER.md spec in `frontend/src/components/ideas/RoleRestrictionNotice.tsx`
- [X] T019 [US1] Implement `submitIdea(data: FormData): Promise<IdeaDetailResponse>` in `frontend/src/api/ideas.ts` — POST to `/api/v1/ideas`, `credentials: 'include'`, multipart/form-data via native FormData
- [X] T020 [US1] Create `SubmitIdeaPage` with `IdeaSubmissionForm` (title Input+CharacterCounter, description Textarea+CharacterCounter, category Select, submit Button) using react-hook-form + zod — no file field yet — in `frontend/src/pages/SubmitIdeaPage.tsx`; on 201 redirect to `/ideas/{id}`
- [X] T021 [US1] Add `/submit` protected route (requires auth; renders `SubmitIdeaPage`) to `frontend/src/App.tsx`

**Checkpoint**: Submitters can submit text-only ideas; role guard and redirect work; Evaluators see restriction notice

---

## Phase 4: User Story 2 — Attach a File to an Idea (Priority: P2)

**Goal**: Submitter may optionally attach a single PDF/DOCX/PNG/JPG (≤ 10 MB) when submitting.
File is stored on disk; download is accessible only to the idea's submitter and Evaluators.

**Independent Test**: Submit an idea with a valid PDF attachment → verify file exists at
`uploads/{idea_id}/` → verify the `attachment_*` columns are populated → log in as the submitter
and verify download succeeds (200) → log in as a different Submitter and verify download returns 403.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL before T026

- [X] T022 [US2] Write unit tests for file validation: accepted MIME types pass, disallowed types raise 400, file > 10 MB raises 400, `save_file` writes bytes to correct path — `backend/tests/unit/test_idea_service.py`
- [X] T023 [P] [US2] Write integration tests for `POST /api/v1/ideas` with file: 201 with `file` in response on valid upload, 400 on wrong MIME type, 400 on oversized file, 201 with `file: null` when no file attached, **200 with single-file behaviour when two `file` fields sent in same multipart request (only first used; H3 fix)** — `backend/tests/integration/test_idea_routes.py`
- [X] T024 [P] [US2] Write integration tests for `GET /api/v1/ideas/{id}/attachment`: 200 + file bytes for idea's submitter, 200 + file bytes for Evaluator, 403 for another Submitter, 404 when idea has no attachment (`attachment_stored_name IS NULL`), **404 when `attachment_stored_name` is set in DB but file is absent on disk (EC-002; M1 fix)**, 401 unauthenticated — `backend/tests/integration/test_idea_routes.py`
- [X] T025 [P] [US2] Write Vitest tests for `FileUploadControl`: idle shows "Attach a file" button, selecting valid file shows filename row and clear button, selecting wrong type shows type error, selecting oversized file shows size error, clicking clear resets to idle — `frontend/src/components/ideas/__tests__/FileUploadControl.test.tsx`

### Implementation for User Story 2

- [X] T026 [US2] Add `validate_file(file)` (MIME + extension check, size check) and `save_file(idea_id, dest, data)` helpers; extend `create_idea` to accept `file: UploadFile | None` and persist attachment metadata — `backend/app/services/idea_service.py`
- [X] T027 [US2] Update `POST /api/v1/ideas` route to accept optional `file: UploadFile | None = File(None)`; add `GET /api/v1/ideas/{id}/attachment` route (ownership+role guard → FileResponse) — `backend/app/api/routes/ideas.py`
- [X] T028 [P] [US2] Create `FileUploadControl` component (idle/selected/error states, Paperclip + X icons, `ACCEPTED_TYPES` and `MAX_SIZE_BYTES` validation) per MASTER.md spec — `frontend/src/components/ideas/FileUploadControl.tsx`
- [X] T029 [P] [US2] Create `FileDownloadBlock` component (file type icon, filename, Download button) per MASTER.md spec — `frontend/src/components/ideas/FileDownloadBlock.tsx`
- [X] T030 [US2] Update `SubmitIdeaPage` to append `FileUploadControl` to the form; wire file state into the `FormData` sent by `submitIdea` — `frontend/src/pages/SubmitIdeaPage.tsx`

**Checkpoint**: File uploads and authorised downloads work end-to-end; file type/size validation surfaces correctly in the UI

---

## Phase 5: User Story 3 — List and View Ideas (Priority: P3)

**Goal**: Any authenticated user can browse a newest-first paginated list of ideas and navigate
to a detail page. The file download link is shown only to the idea's submitter or Evaluators.

**Independent Test**: Submit several ideas as different Submitters → navigate to `/ideas` → verify
table shows correct title, category, submitter name, date, newest first → click an idea → verify
detail page shows all fields → verify download link visible for submitter and Evaluator,
absent for a different Submitter → verify empty-state renders when no ideas exist.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL before T037

- [X] T031 [US3] Write unit tests for `idea_service.list_ideas` (returns newest-first, pagination offsets correct, submitter name in response) and `idea_service.get_idea` (returns full detail, raises 404 on miss) — `backend/tests/unit/test_idea_service.py`
- [X] T032 [P] [US3] Write integration tests for `GET /api/v1/ideas`: 200 + list on success, empty `ideas` array when none exist, `total`/`page`/`limit` fields present, 401 unauthenticated — `backend/tests/integration/test_idea_routes.py`
- [X] T033 [P] [US3] Write integration tests for `GET /api/v1/ideas/{id}`: 200 + detail on valid id, `file` field present when attachment exists, `file` null when no attachment, 404 for unknown id, 401 unauthenticated — `backend/tests/integration/test_idea_routes.py`
- [X] T034 [P] [US3] Write Vitest tests for `IdeasTableSkeleton`: renders wrapper with `aria-label="Loading ideas"`, renders 5 skeleton rows with correct column-width classes — `frontend/src/components/ideas/__tests__/IdeasTableSkeleton.test.tsx`
- [X] T035 [P] [US3] Write RTL tests for `IdeasPage`: shows skeleton while loading, shows empty state with Lightbulb icon for Submitter (with CTA) and without CTA for Evaluator, renders table rows when ideas returned — `frontend/src/pages/__tests__/IdeasPage.test.tsx`
- [X] T036 [P] [US3] Write RTL tests for `IdeaDetailPage`: displays title/category/description/submitter/date, renders `FileDownloadBlock` when `canDownload` is true and file exists, does NOT render block for other Submitters — `frontend/src/pages/__tests__/IdeaDetailPage.test.tsx`

### Implementation for User Story 3

- [X] T037 [US3] Implement `list_ideas(db, page, limit)` (paginated JOIN + COUNT query, newest-first via `idx_ideas_submitted_at`) and `get_idea(db, idea_id)` (single JOIN, 404 on miss) in `backend/app/services/idea_service.py`
- [X] T038 [US3] Add `GET /ideas` (list, `?page=&limit=`) and `GET /ideas/{id}` (detail) routes in `backend/app/api/routes/ideas.py`
- [X] T039 [P] [US3] Add `listIdeas(page?, limit?)` and `getIdea(id)` functions to `frontend/src/api/ideas.ts`
- [X] T040 [P] [US3] Create `IdeasTableSkeleton` component (5 shimmer rows matching Ideas List table columns) per MASTER.md spec — `frontend/src/components/ideas/IdeasTableSkeleton.tsx`
- [X] T041 [US3] Create `IdeasTable` component (Table with Title/Category/Submitter/Date columns, `CategoryBadge`, title Link) per MASTER.md spec — `frontend/src/components/ideas/IdeasTable.tsx`
- [X] T042 [US3] Create `IdeasPage` (loading → `IdeasTableSkeleton`; empty → Lightbulb empty state with conditional CTA; loaded → `IdeasTable`) per MASTER.md spec — `frontend/src/pages/IdeasPage.tsx`
- [X] T043 [US3] Create `IdeaDetailPage` (header, `CategoryBadge`, meta row, description, conditional `FileDownloadBlock` using `canDownload` rule) per MASTER.md spec — `frontend/src/pages/IdeaDetailPage.tsx`
- [X] T044 [US3] Add `/ideas` and `/ideas/:id` protected routes in `frontend/src/App.tsx`

**Checkpoint**: All three user stories independently functional; full idea lifecycle works end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation sweep, security audit, and end-to-end smoke test.

- [X] T045 [P] Run full backend test suite `pytest tests/ -v` from `backend/` — confirm all T009–T033 tests pass with zero failures
- [X] T046 [P] Run full frontend test suite `npm test` from `frontend/` — confirm all T011–T036 tests pass with zero failures
- [X] T047 [P] Verify DB indices: start backend, open `innovatepam.db` with sqlite3, run `.schema ideas` and confirm `idx_ideas_submitted_at` and `idx_ideas_submitter_id` are present
- [X] T048 [P] XSS audit: search `frontend/src/` for any `dangerouslySetInnerHTML` usage in idea components; confirm none present (JSX auto-escaping covers all idea text fields)
- [X] T049 [P] Validate success criteria SC-001 through SC-007 against running app: submission under 2 min (SC-001), list load (SC-002), file validation feedback (SC-003), attribution (SC-004), Evaluator block (SC-005), unauth redirect (SC-006), download enforcement (SC-007)
- [X] T050 End-to-end smoke test per quickstart.md: register two Submitters + one Evaluator → submit idea with file as Submitter-A → verify Submitter-A can download → verify Submitter-B cannot download → verify Evaluator can download → verify Evaluator cannot access `/submit`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002/T003/T004 parallel with T001
- **Foundational (Phase 2)**: Requires Phase 1 complete; T007/T008 parallel with T005/T006
- **US1 (Phase 3)**: Requires Phase 2 complete; test tasks T009–T013 before impl tasks T014–T021
- **US2 (Phase 4)**: Requires Phase 3 complete (file upload extends the form and route from US1)
- **US3 (Phase 5)**: Requires Phase 2 complete; test tasks T031–T036 before impl T037–T044
- **Polish (Phase 6)**: Requires all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story
- **US2 (P2)**: Depends on US1 (extends `create_idea`, updates `SubmitIdeaPage`)
- **US3 (P3)**: Depends on Foundational only — can run in parallel with US1/US2 on the backend layer; frontend pages need the API functions from `api/ideas.ts` (started in US1)

### Within Each User Story

```
Tests written → Tests confirmed FAILING → Model/Service → Route → Frontend component → Page → Route wired
```

Strictly follow Red-Green-Refactor. Do not write implementation until the corresponding test is red.

---

## Parallel Opportunities

### Phase 1 (after T001 completes)
```
T002: Add UPLOAD_DIR to config.py
T003: Update .gitignore
T004: Add shimmer CSS to index.css
```

### Phase 2 (after Phase 1 completes)
```
Stream A: T005 → T006 (model + DB registration)
Stream B: T007 (Pydantic schemas)
Stream C: T008 (TypeScript types)
```

### Phase 3 (US1) — tests first
```
Tests (parallel):    T009 | T010 | T011 | T012 | T013
Impl (after tests):  T016 | T017 | T018   ← parallel (different files)
                     T014 → T015          ← sequential (service before route)
                     T019 → T020 → T021   ← sequential (api → page → route)
```

### Phase 5 (US3) — parallel with Phase 4 on backend
```
Backend US3 tests:    T031 | T032 | T033  ← parallel
Frontend US3 tests:   T034 | T035 | T036  ← parallel
Backend impl:         T037 → T038
Frontend impl:        T039 | T040         ← parallel
                      T041 → T042 → T043 → T044
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational ⚠️ blocks all stories
3. Complete Phase 3: User Story 1 (text-only submission + redirect)
4. **STOP and VALIDATE**: Submit an idea, verify DB row, verify redirect to detail page
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → skeleton in place
2. Add US1 → text idea submission works end-to-end (MVP)
3. Add US2 → file attachments and authorised downloads
4. Add US3 → ideas list + detail pages visible to all authenticated users
5. Polish → full quality gate

---

## Notes

- `[P]` = different files, no dependency on an incomplete task in the same phase
- `[US1/US2/US3]` maps the task to a user story for traceability
- Constitution Principle III: every test task MUST be confirmed red before its implementation task
- Constitution Principle IV: all component classes must be from `design-system/innovatepam/MASTER.md`
- Constitution Principle V: `@radix-ui/react-select` is the only new dependency; justify any additional dep in plan.md before introducing it
- Commit after each completed phase checkpoint at minimum
