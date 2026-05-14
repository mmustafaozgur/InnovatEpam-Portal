---
description: "Task list for 006 Multi-Media Attachments implementation"
---

# Tasks: Multi-Media Attachments (006)

**Input**: Design documents from `specs/006-multimedia-attachments/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**Tests**: Included — TDD enforced by constitution (Principle III). Write failing tests first, verify they fail, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Project documentation — ADR 011 records the multi-file extension decision before any code changes.

- [X] T001 Create ADR 011 at `docs/adr/011-multi-file-attachment-extension.md` documenting the move from inline `attachment_*` columns to `attachments` table, new file type set, migration strategy, and atomic-save rationale (see plan.md Key Design Decisions D1–D5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer, type contracts, and design system gate that ALL user stories depend on. No story work can begin until this phase is complete.

**⚠️ CRITICAL**: Run `python backend/scripts/migrate_attachments.py` after T002 before running any backend tests. Complete T007 (design gate) before any Phase 4 or Phase 5 UI task.

- [X] T002 Create idempotent migration script `backend/scripts/migrate_attachments.py` with `forward()` (create `attachments` table + index, migrate existing `attachment_*` rows, recreate `ideas` table without inline columns and CHECK) and `--rollback` flag following the pattern of `backend/scripts/migrate_extra_data.py`
- [X] T003 [P] Create `Attachment` SQLAlchemy model in `backend/app/models/attachment.py` with columns `id` (TEXT PK), `idea_id` (FK → `ideas.id` ON DELETE CASCADE), `filename`, `stored_name`, `mime_type`, `size` (Integer), `uploaded_at` (TEXT ISO 8601), and `idx_attachments_idea_id` index (see data-model.md §4)
- [X] T004 [P] Remove `attachment_filename`, `attachment_stored_name`, `attachment_mime_type`, `attachment_size` columns and `ck_ideas_attachment_consistency` CHECK from `backend/app/models/idea.py`
- [X] T005 [P] Update `backend/app/schemas/ideas.py`: add `AttachmentInfo` schema (id, name, size, mime_type, is_image); replace `file: Optional[FileInfo]` with `attachments: list[AttachmentInfo] = []` on `IdeaDetailResponse`; replace `has_attachment: bool` with `attachment_count: int` on `IdeaSummaryResponse`; remove `FileInfo` (see data-model.md §5)
- [X] T006 [P] Update `frontend/src/types/ideas.ts`: add `AttachmentInfo` interface; replace `file: FileInfo | null` with `attachments: AttachmentInfo[]` on `IdeaDetailResponse`; replace `has_attachment: boolean` with `attachment_count: number` on `IdeaSummaryResponse`; remove `FileInfo` (see data-model.md §9)
- [X] T007 **[DESIGN GATE — BLOCKING for Phase 4 & 5]** Amend `design-system/innovatepam/MASTER.md` via `/ui-ux-pro-max` before any UI work: (1) update `FileUploadControl` from single-file to multi-file — new interface `onFilesChange: (files: File[]) => void`, preview tile design for image thumbnails and non-image icons; (2) add `AttachmentsSection` component specification — inline `<img>` display for image attachments, file-type icon + filename + conditional download link for non-image; (3) expand icon mapping to include `Video` for MP4/MOV, `Presentation` for PPTX/PPT, `FileText` for DOC, `Paperclip` as fallback (see research.md R5). Phase 4 and Phase 5 MUST NOT begin until MASTER.md reflects these additions.

**Checkpoint**: Foundation ready — run migration (T002) and amend MASTER.md (T007) before proceeding to user story phases.

---

## Phase 3: User Story 1 — Attach Files During Idea Submission (Priority: P1) 🎯 MVP

**Goal**: Backend validation, atomic file-save, updated API routes, and frontend submission flow that stores up to 5 files (≤ 50 MB total) with the idea record.

**Independent Test**: Submit an idea with 1–3 files via the API and verify the `attachments` rows are persisted, the files exist at `backend/uploads/{idea_id}/{stored_name}`, and the response includes the `attachments` array. Submit with a 6th file or unsupported type and verify 400 is returned with no partial state written.

### Tests for User Story 1 (write first — must FAIL before implementation) ⚠️

- [X] T008 [US1] Write failing unit tests covering `validate_files()` (unsupported MIME → 400, > 5 files → 400, > 50 MB total → 400, valid set passes) and `save_files_atomic()` (OSError on second write rolls back first write) in `backend/tests/unit/test_idea_service.py`
- [X] T009 [US1] Write failing integration tests for: multi-file upload (2 files — verify DB rows + files on disk); file-type rejection (400); atomic rollback on simulated write failure (idea row not inserted, no orphan files); `has_attachment` field removed from list response (`attachment_count` present instead); download access control (image accessible to all authed users, non-image returns 403 for non-owner); **retired `GET /ideas/{idea_id}/attachment` endpoint returns 404** in `backend/tests/integration/test_idea_routes.py`

### Implementation for User Story 1

- [X] T010 [US1] Add `_ACCEPTED_MIME`, `_ACCEPTED_EXT`, `_IMAGE_MIME` sets and `MAX_FILES = 5`, `MAX_TOTAL_BYTES = 50 * 1024 * 1024` constants; implement `validate_files(files: list[UploadFile]) -> None` that raises `HTTPException(400)` for type, count, or total-size violations in `backend/app/services/idea_service.py`
- [X] T011 [US1] Implement `save_files_atomic(idea_id: str, files: list[tuple[Path, bytes]]) -> None` using `anyio.to_thread.run_sync` with write-then-cleanup rollback: track successfully written paths; on any `OSError` delete all written paths and raise `HTTPException(500)` in `backend/app/services/idea_service.py`
- [X] T012 [US1] Update `create_idea()` in `backend/app/services/idea_service.py`: call `validate_files`, read file bytes, call `save_files_atomic`, insert `Attachment` rows (UUID id, stored_name = `uuid4 + ext`), commit all in one `await db.commit()` after all file writes succeed
- [X] T013 [US1] Update `get_idea()` in `backend/app/services/idea_service.py` to load `Attachment` rows via `SELECT … WHERE idea_id = ?` (single query, indexed by `idx_attachments_idea_id`), set `is_image = mime_type.startswith("image/")`, and return `attachments: list[AttachmentInfo]`
- [X] T014 [US1] Update `list_ideas()` in `backend/app/services/idea_service.py` to compute `attachment_count` via `SELECT COUNT(*) FROM attachments WHERE idea_id = ideas.id` subquery and return it in `IdeaSummaryResponse`
- [X] T015 [US1] Update POST `/ideas` route in `backend/app/api/routes/ideas.py` to accept `files: List[UploadFile] = File(default=[])` instead of `file: Optional[UploadFile]`; pass files list to service layer
- [X] T016 [US1] Add `GET /ideas/{idea_id}/attachments/{attachment_id}` route in `backend/app/api/routes/ideas.py`: look up `Attachment` row (404 if missing), enforce MIME-based access tier (image → any authed user; non-image → submitter or admin only, else 403), return `FileResponse` with `Content-Disposition: inline` for images or `attachment; filename="..."` for non-images; 404 if file missing from filesystem
- [X] T017 [US1] Remove `GET /ideas/{idea_id}/attachment` route from `backend/app/api/routes/ideas.py` (retired — see contracts/api.md); this endpoint must return 404 after removal (covered by T009)
- [X] T018 [P] [US1] Update `frontend/src/api/ideas.ts`: change `fd.append('file', file)` to `files.forEach(f => fd.append('files', f))`; remove any legacy helper that constructed `/api/v1/ideas/{id}/attachment` URLs

**Checkpoint**: User Story 1 backend + API layer fully functional. Run `cd backend && pytest tests/ -v` — all tests should pass.

---

## Phase 4: User Story 2 — Preview and Remove Attachments Before Submitting (Priority: P2)

**Goal**: `FileUploadControl` rewritten for multi-file with image thumbnails and non-image icons per tile, per-tile remove button, and live count/size validation. `SubmitIdeaPage` holds the canonical `attachedFiles[]` state and wires to the control.

**⚠️ Design Gate**: T007 MUST be complete (MASTER.md updated) before any task in this phase begins.

**State ownership contract** (clarifies T020 / T022 split):
- `FileUploadControl` manages internal preview/blob-URL state and fires `onFilesChange(files: File[])` on every change.
- `SubmitIdeaPage` holds the canonical `attachedFiles: File[]` state (receives updates via `onFilesChange`), uses it to build FormData, and controls the submit button disabled/loading state.
- There is exactly one source of truth for `File[]`: `SubmitIdeaPage`.

**Independent Test**: Select 2–3 files of different types → verify image tile shows thumbnail, PDF tile shows FileText icon + filename; remove one tile → verify it disappears and other form fields are unchanged; attempt to add a 6th file → verify blocked with error message.

### Tests for User Story 2 (write first — must FAIL before implementation) ⚠️

- [X] T019 [US2] Write failing tests for `FileUploadControl`: image tile renders `<img>` thumbnail, non-image tile renders lucide icon + filename, remove button removes only that tile, adding 6th file shows count error, adding file that exceeds 50 MB total shows size error, `onFilesChange` callback fires with correct `File[]` after add and remove in `frontend/src/components/ideas/__tests__/FileUploadControl.test.tsx`
- [X] T021 [US2] Write failing tests for multi-file `SubmitIdeaPage` form submission: files appended to FormData under key `files`, submit button disabled during in-progress upload, button re-enables on completion or error in `frontend/src/pages/__tests__/SubmitIdeaPage.test.tsx`

### Implementation for User Story 2

- [X] T020 [US2] Rewrite `frontend/src/components/ideas/FileUploadControl.tsx`: accept `onFilesChange: (files: File[]) => void` prop (controlled — FileUploadControl does NOT hold canonical `File[]` state); add `ACCEPTED_MIME`, `ACCEPTED_EXT`, `MAX_FILES = 5`, `MAX_TOTAL_BYTES` constants; manage internal preview state (blob URLs via `URL.createObjectURL`, revoked on cleanup or file removal); for each accepted file render a tile — image files get `<img>` thumbnail, non-images get lucide-react icon by MIME group (`FileText` for PDF/DOC/DOCX, `Video` for MP4/MOV, `Presentation` for PPTX/PPT, `Paperclip` fallback) + filename; each tile has an `×` remove button; call `onFilesChange` after every add or remove; validate MIME/ext (error if unsupported), count (error if ≥ 5), cumulative size (error if > 50 MB) — all styling per MASTER.md
- [X] T022 [US2] Update `frontend/src/pages/SubmitIdeaPage.tsx`: hold canonical `attachedFiles: File[]` state (updated via `onFilesChange` from `FileUploadControl`); pass `attachedFiles` and `onFilesChange` to `FileUploadControl` as controlled props; on submit, `attachedFiles.forEach(f => fd.append('files', f))`; set submit button to disabled + loading spinner while submission is in-progress; restore on completion or error

**Checkpoint**: User Stories 1 and 2 both work independently. Run `cd frontend && npm test` — FileUploadControl and SubmitIdeaPage tests should pass.

---

## Phase 5: User Story 3 — View Attachments on the Idea Detail Page (Priority: P3)

**Goal**: New `AttachmentsSection` component renders images inline and non-images as icon + filename + conditional download link; `IdeaDetailPage` passes `idea.attachments` and `canDownload`; `IdeasTable` reads `attachment_count`; legacy ideas render without errors.

**⚠️ Design Gate**: T007 MUST be complete (MASTER.md updated) before any task in this phase begins.

**Independent Test**: Open the detail page of an idea with a PNG attachment — verify the image renders inline. Open as a non-owner non-admin — verify no download link appears for a PDF attachment. Open an idea with no attachments — verify the page loads without errors and shows no attachment section (or empty state).

### Tests for User Story 3 (write first — must FAIL before implementation) ⚠️

- [X] T023 [US3] Write failing tests for `AttachmentsSection`: image attachment renders as `<img>` with correct src; non-image attachment renders lucide icon + filename; download link visible when `canDownload=true`; download link absent when `canDownload=false`; empty attachments array renders nothing (or empty state) in `frontend/src/components/ideas/__tests__/AttachmentsSection.test.tsx`
- [X] T025 [US3] Write failing tests for `IdeaDetailPage`: attachments section rendered for idea with attachments; correct `canDownload` passed based on viewer role; page renders without errors for idea with empty `attachments: []` in `frontend/src/pages/__tests__/IdeaDetailPage.test.tsx`
- [X] T027 [P] [US3] Write failing tests for `IdeasTable` (or whichever list component renders idea rows): `attachment_count` field is read and displayed correctly; `has_attachment` field is NOT referenced in `frontend/src/components/ideas/__tests__/IdeasTable.test.tsx` (or the existing test file for that component)

### Implementation for User Story 3

- [X] T024 [US3] Create `frontend/src/components/ideas/AttachmentsSection.tsx`: accept `attachments: AttachmentInfo[]`, `ideaId: string`, `canDownload: boolean` props; for each attachment — if `is_image`, render `<img src="/api/v1/ideas/{ideaId}/attachments/{id}">` inline; otherwise render lucide-react icon (by MIME group per MASTER.md icon mapping) + filename + conditional `<a href="..." download>` shown only when `canDownload` is true; render nothing (or an empty state) when `attachments.length === 0` — all styling per MASTER.md
- [X] T026 [US3] Update `frontend/src/pages/IdeaDetailPage.tsx`: read `idea.attachments` (replaces legacy `idea.file`); derive `canDownload = currentUser.id === idea.submitter_id || currentUser.role === 'admin'`; render `<AttachmentsSection attachments={idea.attachments} ideaId={idea.id} canDownload={canDownload} />`; remove any reference to legacy `file` field or `has_attachment`
- [X] T028 [P] [US3] Update `frontend/src/components/ideas/IdeasTable.tsx` to read `attachment_count: number` instead of `has_attachment: boolean`; display attachment count badge or icon when `attachment_count > 0` — per MASTER.md styling

**Checkpoint**: All three user stories independently functional. Run `cd frontend && npm test` — all tests should pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate end-to-end integration, run smoke tests, confirm all test suites pass, and verify constraint requirements.

- [X] T029 [P] Run full backend test suite and confirm all tests pass: `cd backend && pytest tests/ -v`
- [X] T030 [P] Run full frontend test suite and confirm all tests pass: `cd frontend && npm test`
- [X] T031 Run smoke test checklist from `specs/006-multimedia-attachments/quickstart.md`: submit idea with mixed file types, verify inline image + PDF download link on detail page, verify 403 for non-owner non-image download, verify legacy idea loads without errors, verify 6-file and unsupported-type rejections
- [X] T032 Verify migration rollback works cleanly: `cd backend && python scripts/migrate_attachments.py --rollback` then re-run forward to confirm idempotency
- [X] T033 Verify FR-013 and FR-014 constraint enforcement: confirm no `DELETE`, `PATCH`, or `PUT` routes for attachments exist in `backend/app/api/routes/ideas.py`; confirm backend integration tests assert that attempting to modify or delete an attachment after submission returns 404 or 405

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user story phases**; run migration (T002) and complete design gate (T007) before any story work
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US1 (Phase 3) and US2 (Phase 4): sequential — US2 depends on the US1 backend contract being in place; US2 UI work also requires T007 (design gate)
  - US3 (Phase 5): depends on Phase 2 types (T006) and US1 `get_idea()` response shape (T013); also requires T007 (design gate)
- **Polish (Phase 6)**: Depends on all desired user story phases completing

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no story dependencies
- **US2 (P2)**: Can start after Phase 2; `FileUploadControl` (T020) is independent of US1, but `SubmitIdeaPage` (T022) should integrate after T018 (frontend API layer) is in place; both require T007 design gate
- **US3 (P3)**: Can start after Phase 2 + T013 (`get_idea()`) is complete for the API response shape; `AttachmentsSection` (T024) is independent of US1/US2; requires T007 design gate

### Within Each User Story

- Tests MUST be written and fail before implementation
- Constants/validation before service logic
- Service layer before route handlers
- Backend route before frontend API layer
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 2**: T003, T004, T005, T006 are all [P] — different files, can run simultaneously
- **Phase 3**: T008 and T009 (tests) are [P] with each other; T018 (frontend API layer) is [P] with T015–T017 (backend routes)
- **Phase 5**: T023, T025, and T027 (tests) are all [P]; T028 (IdeasTable) is [P] with T024–T026
- **Phase 6**: T029 (backend tests) and T030 (frontend tests) are [P]

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These four tasks can run simultaneously (different files):
Task T003: "Create backend/app/models/attachment.py"
Task T004: "Update backend/app/models/idea.py"
Task T005: "Update backend/app/schemas/ideas.py"
Task T006: "Update frontend/src/types/ideas.ts"

# Then T007 (design gate — MASTER.md) must complete before Phase 4 and 5 begin.
```

## Parallel Example: User Story 3

```bash
# Write all three tests in parallel:
Task T023: "AttachmentsSection tests — frontend/src/components/ideas/__tests__/AttachmentsSection.test.tsx"
Task T025: "IdeaDetailPage tests — frontend/src/pages/__tests__/IdeaDetailPage.test.tsx"
Task T027: "IdeasTable tests — frontend/src/components/ideas/__tests__/IdeasTable.test.tsx"

# After tests fail, run implementations:
Task T024: "Create AttachmentsSection.tsx"       # depends on T023 failing
Task T026: "Update IdeaDetailPage.tsx"           # depends on T025 failing
Task T028: "Update IdeasTable.tsx"  [P]          # depends on T027 failing; independent file
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T007) — run migration after T002; complete MASTER.md gate (T007)
3. Complete Phase 3: User Story 1 (T008–T018)
4. **STOP and VALIDATE**: `pytest tests/ -v` passes; submit idea with files via API
5. Deploy/demo backend capability

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (includes MASTER.md amendment)
2. Add US1 → Test independently → Backend capable of storing multi-file attachments (MVP)
3. Add US2 → Test independently → Full submission UI with preview tiles and remove
4. Add US3 → Test independently → Attachment display on detail page, access control enforced
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With two developers:

1. Both complete Setup + Foundational together (including T007 design gate)
2. Once Phase 2 is done:
   - Developer A: US1 (backend + API routes) → US3 (detail page display)
   - Developer B: US2 (FileUploadControl + SubmitIdeaPage) → US3 frontend wiring
3. Stories complete and integrate at Phase 6 polish

---

## Notes

- [P] tasks = different files, no shared state dependencies
- [US#] label maps each task to its user story for traceability
- Run `python scripts/migrate_attachments.py` after T002 before any backend tests
- T007 (MASTER.md design gate) MUST complete before any Phase 4 or Phase 5 UI task
- State ownership: `FileUploadControl` fires `onFilesChange`; `SubmitIdeaPage` is the single source of truth for `File[]`
- Verify each test FAILS before writing the implementation it covers
- All stored files live at `backend/uploads/{idea_id}/{stored_name}` — directory is auto-created; must be in `.gitignore`
- `stored_name` format: `{uuid4}{original_ext}` (prevents collisions and path-traversal)
- No new pip or npm dependencies — `anyio`, `lucide-react`, `msw` already in the project
