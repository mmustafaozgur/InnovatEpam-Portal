# API Contract: Multi-Media Attachments (006)

**Date**: 2026-05-14 | **Branch**: `006-multimedia-attachments`

Base URL: `/api/v1`

---

## Changed Endpoints

### POST /ideas — Submit Idea

**Change**: `file` field replaced by `files` (multi-value).

#### Request (multipart/form-data)

| Field | Type | Required | Change |
|-------|------|----------|--------|
| `title` | string | yes | unchanged |
| `description` | string | yes | unchanged |
| `category` | string | yes | unchanged |
| `extra_data` | string (JSON) | no | unchanged |
| `files` | UploadFile[] | no | **CHANGED** — was `file: UploadFile` (single) |

- 0 to 5 `files` entries accepted.
- Combined size of all files must not exceed 50 MB.
- Each file must be one of: `.png`, `.jpg`, `.jpeg`, `.gif`, `.pdf`, `.mp4`, `.mov`, `.pptx`, `.ppt`, `.docx`, `.doc`.

#### Response (200 OK) — `IdeaDetailResponse`

```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "category": "technology",
  "submitter_id": "uuid",
  "submitter_name": "Alice Smith",
  "submitted_at": "2026-05-14T10:00:00Z",
  "attachments": [
    {
      "id": "uuid",
      "name": "prototype.pdf",
      "size": 204800,
      "mime_type": "application/pdf",
      "is_image": false
    },
    {
      "id": "uuid",
      "name": "mockup.png",
      "size": 51200,
      "mime_type": "image/png",
      "is_image": true
    }
  ],
  "evaluation": { "status": "submitted", "comment": null, "evaluated_at": null, "assigned_admin_id": null, "assigned_admin_name": null },
  "extra_data": null
}
```

**Change from previous**: `"file": { ... }` field **removed**; `"attachments": [...]` field **added**.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | File type not in allowed set |
| 400 | More than 5 files submitted |
| 400 | Total file size exceeds 50 MB |
| 403 | Admin users cannot submit ideas (existing rule) |
| 500 | File write failure (atomic rollback performed) |

---

### GET /ideas/{idea_id} — Get Idea Detail

**Change**: Response shape updated.

#### Response (200 OK) — `IdeaDetailResponse`

Same shape as POST /ideas response above. `attachments` array is empty (`[]`) for ideas with no attachments.

**Change from previous**: `"file"` field removed; `"attachments"` array added.

---

### GET /ideas — List Ideas

**Change**: `has_attachment` replaced by `attachment_count`.

#### Response item shape (within `ideas[]`)

```json
{
  "id": "uuid",
  "title": "...",
  "category": "technology",
  "submitter_name": "Alice Smith",
  "submitted_at": "2026-05-14T10:00:00Z",
  "attachment_count": 2,
  "evaluation_status": "submitted",
  "reviewer_name": null,
  "extra_data": null
}
```

**Change from previous**: `"has_attachment": bool` replaced by `"attachment_count": int`.

---

## New Endpoint

### GET /ideas/{idea_id}/attachments/{attachment_id}

Serves a single attachment file. Access rules are enforced server-side.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `idea_id` | string (UUID) | The parent idea |
| `attachment_id` | string (UUID) | The specific attachment |

#### Access Control

| Caller | Image MIME (`image/*`) | Non-Image MIME |
|--------|------------------------|----------------|
| Unauthenticated | 401 | 401 |
| Authenticated, not submitter, not admin | Allowed (inline) | 403 |
| Original submitter | Allowed (download) | Allowed (download) |
| Admin | Allowed (download) | Allowed (download) |

#### Response Headers

| Condition | `Content-Disposition` |
|-----------|-----------------------|
| Image MIME type | `inline` |
| Non-image MIME type, authorised | `attachment; filename="<original filename>"` |

#### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Non-image file, caller is neither submitter nor admin |
| 404 | Idea not found |
| 404 | Attachment record not found |
| 404 | File missing from filesystem |

---

## Retired Endpoint

### ~~GET /ideas/{idea_id}/attachment~~ — REMOVED

This endpoint is retired in this feature. All callers must migrate to `GET /ideas/{idea_id}/attachments/{attachment_id}`.

---

## Frontend `api/ideas.ts` Changes

### `submitIdea(data: FormData)`

No signature change. Callers must now append files under the key `files` (not `file`):

```typescript
// BEFORE
fd.append('file', file)

// AFTER
files.forEach(f => fd.append('files', f))
```

### Removed helper (if present)

Any helper that constructed `/api/v1/ideas/{id}/attachment` URLs is removed. Attachment URLs are now constructed from `AttachmentInfo.id`:

```typescript
// New pattern used in AttachmentsSection
`/api/v1/ideas/${ideaId}/attachments/${attachment.id}`
```
