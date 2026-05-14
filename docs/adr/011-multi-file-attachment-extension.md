# ADR-011: Multi-File Attachment Extension

**Date**: 2026-05-14
**Status**: Accepted
**Scope**: Feature — `006-multimedia-attachments`
**Amends**: ADR-007 (Filesystem Storage for Idea File Attachments)

---

## Context

ADR-007 (feature 002) established filesystem storage for idea attachments with a single-file-per-idea limit (≤ 10 MB), four accepted MIME types (PDF, DOCX, PNG, JPG), and inline attachment columns on the `ideas` table (`attachment_filename`, `attachment_stored_name`, `attachment_mime_type`, `attachment_size`).

Feature 006 requires:
- Up to 5 files per submission
- 50 MB combined total per submission
- 10 MIME types (adds GIF, MP4, MOV, PPTX, PPT, DOC)
- Inline image preview on the detail page for all authenticated viewers
- Download access restricted to the original submitter and admins

The inline column pattern from ADR-007 cannot express 1-to-many without denormalisation. A dedicated `attachments` table is the minimal schema change.

---

## Decision

### Storage model

Replace the four inline `attachment_*` columns on `ideas` with a separate `attachments` table:

```
attachments(id PK, idea_id FK→ideas.id ON DELETE CASCADE,
            filename, stored_name, mime_type, size, uploaded_at)
```

Index: `idx_attachments_idea_id` on `idea_id`.

Storage path convention is **unchanged** from ADR-007: `backend/uploads/{idea_id}/{uuid4}{ext}`.

### Migration

A standalone idempotent script (`backend/scripts/migrate_attachments.py`) migrates existing single-file data from `ideas` into `attachments` and recreates `ideas` without the retired columns. The pattern follows `migrate_extra_data.py`.

### File type expansion

`_ACCEPTED_MIME` and `_ACCEPTED_EXT` in `idea_service.py` are expanded to include GIF (`image/gif`), MP4 (`video/mp4`), MOV (`video/quicktime`), PPTX, PPT, and DOC. Previously accepted types are unchanged.

### Validation limits

- Maximum 5 files per submission (FR-003)
- Maximum 50 MB combined total per submission (FR-004)
- All-or-nothing: if any file write fails, all previously written files for that submission are deleted and the DB commit is aborted (FR-015)

### Serving

Single endpoint `GET /api/v1/ideas/{idea_id}/attachments/{attachment_id}`:
- Image MIME types: any authenticated user; `Content-Disposition: inline`
- Non-image types: submitter or admin only; `Content-Disposition: attachment; filename="..."`

The retired endpoint `GET /api/v1/ideas/{id}/attachment` is removed.

---

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| JSON blob of attachment metadata inline on `ideas` | No atomic per-attachment lookup by ID; forces full parse to find one attachment; not queryable |
| Keep inline columns and add 4 more sets (attachment_2_*, etc.) | Denormalised, brittle, violates 1NF for variable-length collections |
| Separate upload endpoint (pre-upload before idea submit) | Orphaned files if the idea submit fails or user abandons; two-step UX contradicts spec scope |
| S3/object storage | Conflicts with Principle V (Simplicity) and ADR-007; no justification for bootcamp scale |

---

## Consequences

**Positive**:
- Clean 1-to-many relationship; no arbitrary column count
- `attachment_id` enables direct per-attachment download URLs
- `ON DELETE CASCADE` ensures no orphan rows if ideas are deleted
- All existing file data is preserved via migration

**Negative / Trade-offs**:
- The `ideas` table schema changes; the migration must run before deploying new code
- Tests that reference `has_attachment` must be updated to `attachment_count`
- Callers using `IdeaDetailResponse.file` must migrate to `IdeaDetailResponse.attachments`

**Neutral**:
- File storage path and `settings.upload_path` are unchanged; existing files on disk remain valid
- `anyio.to_thread.run_sync` pattern for async file I/O is unchanged
