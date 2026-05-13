# ADR-007: Filesystem Storage for Idea File Attachments

**Date**: 2026-05-13
**Status**: Accepted
**Scope**: Feature — `002-idea-submission`

> Stack decisions (Python/FastAPI, SQLite, React/Vite) are governed by ADR-000 through ADR-002.
> This ADR documents only the file attachment storage decision for the idea submission feature.

---

## Context

FR-005 through FR-008 require the system to accept optional file attachments (PDF, DOCX, PNG, JPG;
≤ 10 MB; one per idea). FR-013 requires that download access be enforced server-side — not merely
hidden in the UI. FR-016 explicitly states "File storage uses the filesystem under a dedicated
`/uploads` directory. SQLite BLOB storage is out of scope for v1."

Three storage mechanisms were evaluated.

## Decision

Files are stored on the **filesystem** under `backend/uploads/{idea_id}/{uuid4}{ext}`.

- The `idea_id/` subdirectory isolates each idea's file and prevents filename collisions.
- The stored name is a UUID4-based slug with the original extension — prevents path traversal and
  collisions, while preserving the MIME-determinable file type.
- The original filename is persisted in the `ideas.attachment_filename` column for display and
  `Content-Disposition` response headers.
- Files are **not** served via `StaticFiles` mount. They are served exclusively through a FastAPI
  authenticated endpoint (`GET /api/v1/ideas/{id}/attachment`) that checks role and ownership
  before returning a `FileResponse`. This satisfies FR-013's server-side enforcement requirement.
- File writes use `anyio.to_thread.run_sync` (transitive dep via FastAPI) — no new dependencies
  required. `FileResponse` (starlette, already a FastAPI dep) handles async file serving.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| SQLite BLOB storage | Explicitly out of scope per FR-016; also inflates the DB file and impairs SQLite's write-lock behaviour under concurrent reads |
| S3 / object storage | External infrastructure not justified for a bootcamp-scoped internal tool; conflicts with Principle V (Simplicity & Minimalism) |
| `StaticFiles` mount (direct URL) | Cannot enforce per-request auth; FR-013 requires that "direct requests to the file URL by unauthorized users MUST be rejected" — static mounts bypass FastAPI middleware |
| `aiofiles` for async writes | Viable, but `anyio.to_thread.run_sync` is already available as a transitive dep, keeping the dependency footprint minimal (Principle V) |

## Consequences

**Positive**: Zero new npm/pip dependencies; files stay out of the database; authenticated
download route satisfies FR-013 server-side enforcement; `FileResponse` handles `Range` headers
and conditional GET for free.

**Negative / Trade-offs**: Files are not in version control and must be backed up separately;
the `uploads/` directory must be created at startup and must be `.gitignore`d; if the backend
process moves to a different host the upload directory must be migrated alongside the DB file.

**Neutral**: The `uploads/` directory path is configured via `settings.UPLOAD_DIR` in
`backend/app/core/config.py` (default: `./uploads` relative to the backend working directory).
