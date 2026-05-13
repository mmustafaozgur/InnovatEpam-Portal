# API Contract: Idea Submission System

**Phase**: 1 — Design
**Branch**: `002-idea-submission`
**Date**: 2026-05-13
**Base prefix**: `/api/v1` (consistent with existing routes)

Authentication: httpOnly cookie (`access_token`). All endpoints require a valid session.
Unauthenticated requests receive `401 Not authenticated.`

---

## Endpoints

### POST /api/v1/ideas

Create a new idea. Submitter role only.

**Request**

```
Content-Type: multipart/form-data

Fields:
  title        string  required  Max 150 chars
  description  string  required  Max 3,000 chars
  category     string  required  One of: process_improvement | technology | cost_saving | other
  file         file    optional  PDF, DOCX, PNG, JPG — max 10 MB
```

**Responses**

| Status | Body | When |
|--------|------|------|
| 201 Created | `IdeaDetailResponse` | Idea saved; file stored if provided |
| 400 Bad Request | `{ detail: ValidationError[] }` | Missing/invalid field or file rejection |
| 401 Unauthorized | `{ detail: "Not authenticated." }` | No valid session |
| 403 Forbidden | `{ detail: "Evaluators cannot submit ideas." }` | Role is `admin`/Evaluator |

**Behaviour**:
- `submitter_id` is set from the session; the client cannot supply it.
- On success, the response body contains the full idea detail including `id`.
- Frontend redirects to `/ideas/{id}` after receiving 201.
- The submit button is disabled on first click (client-side) to prevent double submission.

---

### GET /api/v1/ideas

List all submitted ideas, newest first.

**Request**

```
Query parameters:
  page   integer  optional  Default: 1, Min: 1
  limit  integer  optional  Default: 20, Min: 1, Max: 100
```

**Responses**

| Status | Body | When |
|--------|------|------|
| 200 OK | `IdeaListResponse` | Success |
| 401 Unauthorized | `{ detail: "Not authenticated." }` | No valid session |

---

### GET /api/v1/ideas/{idea_id}

Get full detail for a single idea.

**Request**: No body. `idea_id` is a UUID string in the path.

**Responses**

| Status | Body | When |
|--------|------|------|
| 200 OK | `IdeaDetailResponse` | Idea found |
| 401 Unauthorized | `{ detail: "Not authenticated." }` | No valid session |
| 404 Not Found | `{ detail: "Idea not found." }` | Unknown `idea_id` |

---

### GET /api/v1/ideas/{idea_id}/attachment

Download the file attached to an idea. **Submitter of the idea or Evaluator role only.**

**Request**: No body. `idea_id` is a UUID string in the path.

**Responses**

| Status | Headers / Body | When |
|--------|----------------|------|
| 200 OK | `Content-Type: {mime}`, `Content-Disposition: attachment; filename="{original}"` | Authorised download |
| 401 Unauthorized | `{ detail: "Not authenticated." }` | No valid session |
| 403 Forbidden | `{ detail: "You are not authorised to download this file." }` | Other Submitter |
| 404 Not Found | `{ detail: "Idea not found." }` or `{ detail: "No attachment." }` | No idea or no file |

**Note**: The 403 is enforced server-side. The frontend additionally hides the download link
for unauthorised users (FR-013 dual enforcement).

---

## Response Schemas

### IdeaDetailResponse

```typescript
interface IdeaDetailResponse {
  id: string;                  // UUID
  title: string;
  description: string;
  category: string;            // DB value: process_improvement | technology | cost_saving | other
  submitter_id: string;        // UUID — used for canDownload check on frontend
  submitter_name: string;      // users.full_name
  submitted_at: string;        // ISO-8601 UTC, e.g. "2026-05-13T10:30:00Z"
  file: FileInfo | null;       // null when no attachment
}

interface FileInfo {
  name: string;        // Original filename
  size: number;        // Bytes
  mime_type: string;
}
```

The download URL is always `/api/v1/ideas/{id}/attachment` when `file` is non-null.
The frontend constructs this URL from the idea's `id` — it is not embedded in the response.

### IdeaSummaryResponse

```typescript
interface IdeaSummaryResponse {
  id: string;
  title: string;
  category: string;
  submitter_name: string;
  submitted_at: string;        // ISO-8601 UTC
  has_attachment: boolean;
}
```

### IdeaListResponse

```typescript
interface IdeaListResponse {
  ideas: IdeaSummaryResponse[];
  total: number;               // Total ideas (for pagination controls)
  page: number;
  limit: number;
}
```

---

## Validation Rules (Backend)

| Field | Rule | HTTP status on violation |
|-------|------|--------------------------|
| `title` | Required, 1–150 chars | 400 |
| `description` | Required, 1–3,000 chars | 400 |
| `category` | Required, must be one of the four enum values | 400 |
| `file.content_type` | Must be in accepted MIME list (when file provided) | 400 |
| `file.size` | Must be ≤ 10,485,760 bytes (10 MB) | 400 |
| Role | Must be `submitter` to POST | 403 |

Pydantic validates `title`, `description`, `category` before any file I/O occurs.
File validation happens after field validation — a form error on a text field returns
immediately without reading the file.

---

## Error Body Format

All errors follow FastAPI's default format:

```json
{ "detail": "Human-readable message" }
```

Validation errors from Pydantic use FastAPI's standard 422 shape:

```json
{
  "detail": [
    { "loc": ["body", "title"], "msg": "Field required", "type": "missing" }
  ]
}
```

---

## Frontend API Client

Module: `frontend/src/api/ideas.ts`

```typescript
// Key function signatures
export async function submitIdea(data: FormData): Promise<IdeaDetailResponse>
export async function listIdeas(page?: number, limit?: number): Promise<IdeaListResponse>
export async function getIdea(id: string): Promise<IdeaDetailResponse>
```

All calls use `credentials: 'include'` (httpOnly cookie forwarding).
`submitIdea` sends `Content-Type: multipart/form-data` via native `FormData`.
