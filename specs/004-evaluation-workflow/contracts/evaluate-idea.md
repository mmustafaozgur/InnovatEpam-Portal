# API Contract: Evaluate Idea

**Feature**: Evaluation Workflow (`004-evaluation-workflow`)
**Date**: 2026-05-13

---

## New Endpoint: Evaluate an Idea

### `PATCH /ideas/{idea_id}/evaluate`

Performs an evaluation action on an idea. Only admins may call this endpoint. The first admin to
move an idea to `under_review` becomes the assigned admin for that idea; only the assigned admin
may perform any further evaluation actions on it.

#### Authentication

| Requirement | Value |
|-------------|-------|
| Required | Yes — Bearer JWT |
| Allowed roles | `admin` only |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `idea_id` | string (UUID) | The ID of the idea to evaluate |

#### Request Body

`Content-Type: application/json`

```json
{
  "status": "under_review",
  "comment": "Initial review started — looks promising."
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `status` | string enum | Yes | One of: `submitted`, `under_review`, `accepted`, `rejected` | Target status. `submitted` is not a valid target — sending it results in 400. |
| `comment` | string | No | Max 1,000 characters | Evaluation comment. `null` or absent clears any existing comment. |

**Valid `status` targets**: `under_review`, `accepted`, `rejected`
(Sending `status: "submitted"` is always rejected with 400.)

#### Responses

**200 OK** — Evaluation saved successfully.

```json
{
  "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "title": "Automated onboarding assistant",
  "description": "...",
  "category": "technology",
  "submitter_id": "abc123",
  "submitter_name": "Jane Doe",
  "submitted_at": "2026-05-10T09:00:00Z",
  "file": null,
  "evaluation": {
    "status": "under_review",
    "comment": "Initial review started — looks promising.",
    "evaluated_at": "2026-05-13T14:22:00Z",
    "assigned_admin_id": "admin001"
  }
}
```

**400 Bad Request** — Invalid status transition or missing required field.

```json
{ "detail": "Invalid status transition: submitted → accepted. Allowed next status: under_review." }
```

**401 Unauthorized** — Missing or invalid JWT.

```json
{ "detail": "Not authenticated." }
```

**403 Forbidden** — Caller is not an admin, or is not the assigned admin for this idea.

```json
{ "detail": "Only the assigned admin may evaluate this idea." }
```

**404 Not Found** — Idea does not exist.

```json
{ "detail": "Idea not found." }
```

**409 Conflict** — Idea is in a terminal state (`accepted` or `rejected`) and cannot be modified.

```json
{ "detail": "This idea is locked (status: accepted). No further evaluation actions are permitted." }
```

**422 Unprocessable Entity** — Pydantic validation failure (e.g., comment exceeds 1,000 chars).

---

## Updated Endpoint: List Ideas

### `GET /ideas`

Existing endpoint. Two additions for this feature:

#### New Query Parameter: `status`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string enum | No | Filter ideas by evaluation status. One of: `submitted`, `under_review`, `accepted`, `rejected`. When absent, all ideas are returned. |

The `status` filter is applied as logical AND with the existing `mine` filter.

**Example**:
```
GET /ideas?status=under_review&mine=true
```
Returns only the caller's own ideas that are currently under review.

**Validation**: An unknown `status` value returns 422.

#### Updated Response Schema

Each item in `ideas[]` now includes `evaluation_status`:

```json
{
  "ideas": [
    {
      "id": "3f2504e0-...",
      "title": "Automated onboarding assistant",
      "category": "technology",
      "submitter_name": "Jane Doe",
      "submitted_at": "2026-05-10T09:00:00Z",
      "has_attachment": false,
      "evaluation_status": "under_review"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## Updated Endpoint: Get Idea Detail

### `GET /ideas/{idea_id}`

Existing endpoint. The response now always includes an `evaluation` object.

#### Response Change

```json
{
  "id": "3f2504e0-...",
  "title": "Automated onboarding assistant",
  "description": "...",
  "category": "technology",
  "submitter_id": "abc123",
  "submitter_name": "Jane Doe",
  "submitted_at": "2026-05-10T09:00:00Z",
  "file": null,
  "evaluation": {
    "status": "under_review",
    "comment": null,
    "evaluated_at": "2026-05-13T14:22:00Z",
    "assigned_admin_id": null
  }
}
```

**Visibility rules for `evaluation.comment`**:

| Idea status | Caller role | `comment` value in response |
|-------------|-------------|----------------------------|
| `submitted` | any | `null` (no comment yet) |
| `under_review` | `admin` | actual comment (may be null) |
| `under_review` | `submitter` | **always `null`** (hidden) |
| `accepted` | any | actual comment (may be null) |
| `rejected` | any | actual comment (may be null) |

**Visibility rules for `evaluation.assigned_admin_id`**:
- Visible only to callers with role `admin`; always `null` in responses to submitters.

---

## Error Glossary

| HTTP Status | When | Distinguishing `detail` phrase |
|-------------|------|-------------------------------|
| 400 | Invalid transition | "Invalid status transition" |
| 400 | Sending `status: submitted` | "Invalid status transition" |
| 401 | No/invalid JWT | "Not authenticated" |
| 403 | Non-admin caller | "Only admins may evaluate ideas" |
| 403 | Non-assigned admin | "Only the assigned admin may evaluate this idea" |
| 404 | Idea not found | "Idea not found" |
| 409 | Terminal state locked | "This idea is locked" |
| 422 | Schema validation fail | (Pydantic default) |
