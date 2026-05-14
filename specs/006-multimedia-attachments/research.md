# Research: Multi-Media Attachments (006)

**Date**: 2026-05-14 | **Branch**: `006-multimedia-attachments`

---

## R1 — Migration Strategy (NEEDS CLARIFICATION resolved)

**Question**: How to migrate from the existing `attachment_*` inline columns on `ideas` to the new `attachments` table without data loss?

**Decision**: Standalone idempotent migration script at `backend/scripts/migrate_attachments.py`, following the exact pattern of `migrate_extra_data.py` already in the codebase.

**Rationale**:
- SQLite does not support `DROP COLUMN` in versions < 3.35; the project targets SQLite bundled with Python 3.11 (3.39+), which does support it. However, we also need to drop the `ck_ideas_attachment_consistency` CHECK constraint, which requires table recreation regardless.
- The established project pattern (see `migrate_extra_data.py`, `migrate_eval.py`) is table-recreation — copy data to `ideas_new`, rename. This is safe, idempotent, and tested.
- The migration must: (1) create `attachments` table if not present, (2) insert one row per idea that has `attachment_stored_name IS NOT NULL`, (3) recreate `ideas` without the four `attachment_*` columns and the consistency CHECK.
- Migration is run manually before deploying new application code.

**Alternatives considered**:

| Option | Reason rejected |
|--------|-----------------|
| Alembic | Not in use; Principle V — don't introduce for one migration |
| `ALTER TABLE DROP COLUMN` (SQLite 3.35+) | Does not remove CHECK constraints; still need recreation to drop `ck_ideas_attachment_consistency` |
| Keep old columns, add new table, dual-read | Leaves dead columns forever; violates Principle V (no speculative retention) |

---

## R2 — Atomic File Save with Rollback (FR-015)

**Question**: How to ensure all files are saved before the DB row is inserted, and roll back file writes if any write fails?

**Decision**: Write-then-cleanup pattern. `save_files_atomic` in `idea_service.py` accepts a list of `(dest: Path, data: bytes)` pairs and an `idea_id`. It writes files sequentially, tracking each successfully written path. On any `OSError`, it deletes all already-written paths and propagates an `HTTPException(500)`. The `Idea` DB row and `Attachment` rows are inserted only after all writes succeed; the entire DB write is a single `await db.commit()`.

**Rationale**:
- Filesystem writes can fail independently of the DB (full disk, permission error). The DB must never reference a file that does not exist.
- `anyio.to_thread.run_sync` is already used for single-file writes (ADR 007); the pattern extends directly.
- No two-phase commit or distributed transaction needed — the writes are sequential and any failure aborts before the DB commit.

**Alternatives considered**:

| Option | Reason rejected |
|--------|-----------------|
| Write files after DB commit | DB references non-existent files if writes fail later |
| Background task for file writes | Complicates error reporting to the client; out of scope |
| Temporary directory + atomic rename | Adds complexity for a max-5-file submission; overkill |

---

## R3 — Image Inline Access vs. Download Access Tiers

**Question**: The spec requires inline image display for all authenticated viewers but download-link access restricted to submitter/admin. How to satisfy both without two separate endpoints?

**Decision**: Single endpoint `GET /api/v1/ideas/{idea_id}/attachments/{attachment_id}` with MIME-type-based access tier:
- **Image MIME** (`image/png`, `image/jpeg`, `image/gif`): any authenticated user; `Content-Disposition: inline`
- **Non-image MIME**: submitter or admin only; `Content-Disposition: attachment; filename="..."`

The frontend uses the endpoint URL directly as `<img src>` for images (browser sends session cookie automatically) and as `href` for non-image download links (shown only to submitter/admin).

**Rationale**:
- Avoids a separate `/preview` endpoint (Principle V).
- `Content-Disposition: inline` causes browsers to render the image in-page; `attachment` triggers a Save dialog.
- Server-side enforcement satisfies FR-016: a non-authorised user directly requesting a non-image attachment URL receives `403 Forbidden`.
- Unauthenticated requests receive `401 Unauthorized` from `get_current_user`, satisfying the base authentication gate.

---

## R4 — Frontend Image Thumbnail Preview (Pre-Submission Tiles)

**Question**: How to display image thumbnails in the upload tile before the form is submitted (without uploading to the server)?

**Decision**: `URL.createObjectURL(file)` to generate a temporary blob URL for each selected image file. The URL is used as `<img src>`. The component revokes the object URL in a cleanup function (or when the file is removed) to avoid memory leaks.

**Rationale**:
- Built into all modern browsers; no library needed.
- Zero network traffic before submission.
- `URL.revokeObjectURL` in the component's cleanup prevents memory leaks.
- Pattern is idiomatic for `<input type="file">` + preview in React.

**Alternatives considered**:

| Option | Reason rejected |
|--------|-----------------|
| `FileReader.readAsDataURL` | Synchronous base64 encoding is slower and produces larger strings; blob URLs are preferred |
| Canvas thumbnail generation | Adds complexity; full-resolution preview is acceptable at tile size |
| Upload-on-select (optimistic upload) | Premature upload before submission; complicates rollback if user abandons form |

---

## R5 — Non-Image File Type Icons

**Question**: Which icons to use for PDF, video, presentation, and document attachment tiles?

**Decision**: `lucide-react` icons, already a project dependency (confirmed in `FileUploadControl.tsx` and `FileDownloadBlock.tsx`). Mapping:

| Type | Icon |
|------|------|
| PDF | `FileText` |
| Video (MP4, MOV) | `Video` |
| Presentation (PPTX, PPT) | `Presentation` |
| Document (DOCX, DOC) | `FileText` |
| Fallback | `Paperclip` |

**Rationale**: No new dependency; `lucide-react` is already imported in existing attachment components.

---

## R6 — `has_attachment` vs `attachment_count` in List Response

**Question**: The existing `IdeaSummaryResponse` has `has_attachment: bool`. Should this be replaced by `attachment_count: int`?

**Decision**: Replace `has_attachment: bool` with `attachment_count: int`. Computed in `list_ideas` via a subquery or eager load of the `attachments` table. Any consumer can derive `has_attachment` from `attachment_count > 0`. The `IdeasTable.tsx` component that currently reads `has_attachment` will be updated.

**Rationale**: Keeping `has_attachment` while adding `attachment_count` doubles the field with redundant information (Principle V). `attachment_count` is strictly more expressive.

---

## R7 — msw Test Patterns for Multi-File FormData

**Question**: How do existing frontend tests mock the submit endpoint, and how does the multi-file change affect them?

**Finding**: `SubmitIdeaPage.test.tsx` uses `msw` `http.post` handlers. The handler receives a `FormData` body. For multi-file, the handler will receive multiple `files` entries. The `msw` `FormData` API is identical — `request.formData()` returns all entries. Test fixtures will append 1–5 `File` objects under the key `files`. No additional msw or testing-library dependencies needed.
