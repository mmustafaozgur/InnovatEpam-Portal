# Research: Idea Submission System

**Phase**: 0 — Pre-design research
**Branch**: `002-idea-submission`
**Date**: 2026-05-13

---

## 1. FastAPI Multipart / File Upload

**Decision**: Use FastAPI `UploadFile` with `Form()` fields on the same endpoint.

**Pattern**:
```python
@router.post("/ideas", status_code=201)
async def create_idea(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...
```

`python-multipart` is already in `requirements.txt`. `Content-Type: multipart/form-data` is
required from the client.

**Alternatives considered**: JSON body with base64-encoded file — rejected (inflates payload size,
complex client-side encoding, non-standard).

---

## 2. Async File Write (No New Dependencies)

**Decision**: Use `anyio.to_thread.run_sync` + stdlib `pathlib.Path.write_bytes()` for file
persistence. `anyio` is a transitive dependency of FastAPI; no new package required.

**Pattern**:
```python
import anyio
from pathlib import Path

async def save_upload(dest: Path, data: bytes) -> None:
    def _write():
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    await anyio.to_thread.run_sync(_write)
```

`UploadFile.read()` is async; file content is read into memory before the thread-pool write.
At ≤ 10 MB this is acceptable — no streaming chunked write needed.

**Alternatives considered**: `aiofiles` — functionally equivalent but adds a new pip dependency
unjustified by the marginal ergonomic difference (Principle V).

---

## 3. File Serving with Authentication Enforcement

**Decision**: Serve attachments via a FastAPI route that runs `get_current_user` + ownership
check before returning `starlette.responses.FileResponse`.

`FileResponse` (already in starlette, a FastAPI dep) handles `Content-Disposition`, MIME type,
`ETag`, and `Range` headers automatically.

**Pattern**:
```python
from fastapi.responses import FileResponse

@router.get("/ideas/{idea_id}/attachment")
async def download_attachment(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await get_idea_or_404(idea_id, db)
    if not idea.attachment_stored_name:
        raise HTTPException(404)
    if current_user.role != "admin" and current_user.id != idea.submitter_id:
        raise HTTPException(403)
    path = settings.upload_path(idea_id, idea.attachment_stored_name)
    if not path.exists():
        raise HTTPException(404, "File not found on disk")
    return FileResponse(
        path,
        filename=idea.attachment_filename,
        media_type=idea.attachment_mime_type,
    )
```

`StaticFiles` mount was rejected: it bypasses FastAPI middleware so per-request auth is
impossible (FR-013 requires server-side enforcement).

---

## 4. File Type Validation

**Decision**: Validate both MIME type (from UploadFile.content_type) and file extension.
MIME sniffing alone can be spoofed; extension-only check is unreliable. Dual check provides defence.

Accepted MIME types:
| Extension | MIME type |
|-----------|-----------|
| .pdf | `application/pdf` |
| .docx | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| .png | `image/png` |
| .jpg / .jpeg | `image/jpeg` |

Size check: `file.size` is available on `UploadFile` when `python-multipart` is used. If not
set, read content and check `len(content)`.

**Alternatives considered**: `python-magic` (libmagic binding for content-based MIME detection) —
rejected as an additional C-extension dependency unjustified for a bootcamp tool (Principle V).

---

## 5. Idempotent Submission (Double-Click Prevention)

**Decision**: Client-side only — disable the submit button on first click and show a loading
spinner. This is sufficient for the MVP.

Server-side deduplication (e.g., idempotency key header) is not required because:
- The submission form redirects immediately on success, preventing a second submit
- A 200–500 ms network round-trip makes truly simultaneous duplicate POSTs unlikely
- Principle V: add complexity only when needed

The button's `disabled` state is set during `form.handleSubmit(onSubmit)` via `isSubmitting`
from `react-hook-form`'s `formState`.

---

## 6. Ideas List — Pagination Strategy

**Decision**: Backend offset pagination via `?page=&limit=` query params (default: page=1, limit=20).

Spec SC-002 targets ≤ 1 s for lists up to 500 ideas. With the `idx_ideas_submitted_at` index,
a `LIMIT 20 OFFSET 0` query returns in single-digit milliseconds. Full-table scan at 500 rows
is also fast in SQLite, so pagination is an optimisation rather than a hard requirement.

The list endpoint returns `{ ideas, total, page, limit }` so the frontend can render simple
"Previous / Next" controls if desired. For the bootcamp scope, the frontend may display all ideas
on one page if the total is small.

**Alternatives considered**: Cursor-based pagination — correct for infinite scroll but adds
complexity (stable cursor column, encoding) not needed at this scale (Principle V).

---

## 7. New shadcn/ui Components Required

The following shadcn/ui components are needed but not yet installed:

| Component | Radix dep | Used in |
|-----------|-----------|---------|
| Select | `@radix-ui/react-select` | CategorySelect in IdeaSubmissionForm |
| Textarea | None (Radix-free) | Description field in IdeaSubmissionForm |

Both are standard shadcn/ui CLI installs (`npx shadcn@latest add select textarea`). The `@radix-ui/react-select` package is the only new npm dependency introduced by this feature.

---

## 8. Frontend API Client Pattern

**Decision**: Follow the existing pattern in `frontend/src/api/auth.ts` — plain `fetch` calls
wrapped in typed async functions, with cookie credentials included via `credentials: 'include'`.

A new `frontend/src/api/ideas.ts` module will expose:
- `submitIdea(formData: FormData): Promise<IdeaDetailResponse>`
- `listIdeas(page?: number, limit?: number): Promise<IdeaListResponse>`
- `getIdea(id: string): Promise<IdeaDetailResponse>`

No additional HTTP client library is needed (Principle V).

---

## Summary of New Dependencies

| Layer | Package | Reason |
|-------|---------|--------|
| Frontend | `@radix-ui/react-select` | shadcn/ui Select component for Category field |
| Backend | None | No new pip packages required |
