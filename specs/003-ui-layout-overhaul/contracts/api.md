# API Contract: UI Layout Overhaul — Fixed Sidebar Shell

**Branch**: `003-ui-layout-overhaul` | **Date**: 2026-05-13

---

## Scope

Only one API endpoint is modified by this feature. All other endpoints are unchanged.

---

## Modified Endpoint: `GET /api/v1/ideas`

### Change Summary

A new optional query parameter `mine` is added. All existing behaviour (without `mine`) is
preserved exactly — no breaking changes.

### Request

```
GET /api/v1/ideas?page={page}&limit={limit}&mine={mine}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer ≥ 1 | No | `1` | Page number for pagination |
| `limit` | integer 1–100 | No | `20` | Results per page |
| `mine` | boolean | No | `false` | When `true`, returns only ideas submitted by the authenticated user |

**Auth**: Session cookie required (`credentials: 'include'`). Returns `401` if unauthenticated.

**Security note**: When `mine=true`, the server derives the submitter ID from the authenticated
session (`current_user.id`). The client MUST NOT pass a user ID in the request — it is
ignored even if provided.

### Response (unchanged schema)

**Status**: `200 OK`

```json
{
  "ideas": [
    {
      "id": "string",
      "title": "string",
      "category": "process_improvement | technology | cost_saving | other",
      "submitter_name": "string",
      "submitted_at": "2026-05-13T10:00:00Z",
      "has_attachment": false
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

**`total`**: When `mine=true`, reflects the count of only the current user's ideas (not the
global total). Pagination controls should use this value to compute the number of pages.

### Error Responses (unchanged)

| Status | Condition |
|--------|-----------|
| `401` | No valid session cookie |
| `422` | Invalid query parameter types (e.g., `page=abc`) |

### Examples

```
# All ideas, page 1 (unchanged behaviour)
GET /api/v1/ideas

# All ideas, page 2
GET /api/v1/ideas?page=2

# Current user's ideas only, page 1
GET /api/v1/ideas?mine=true

# Current user's ideas only, page 2
GET /api/v1/ideas?mine=true&page=2
```

### Frontend URL ↔ API mapping

The frontend stores filter state in the browser URL and derives API call parameters from it:

| Browser URL | API call |
|-------------|----------|
| `/ideas` | `GET /api/v1/ideas?page=1` |
| `/ideas?page=2` | `GET /api/v1/ideas?page=2` |
| `/ideas?mine=1` | `GET /api/v1/ideas?mine=true&page=1` |
| `/ideas?mine=1&page=3` | `GET /api/v1/ideas?mine=true&page=3` |

Note: The frontend uses `mine=1` (truthy string) in the URL; the API uses `mine=true` (boolean).
The `listIdeas` function in `api/ideas.ts` handles this translation.

---

## Unchanged Endpoints

The following endpoints are unchanged by this feature. Listed for completeness.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ideas` | Submit a new idea |
| `GET` | `/api/v1/ideas/{id}` | Get idea detail |
| `GET` | `/api/v1/ideas/{id}/attachment` | Download attachment |
| `POST` | `/api/v1/auth/login` | Log in |
| `POST` | `/api/v1/auth/logout` | Log out |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/users` | List users (admin) |
| `POST` | `/api/v1/users/{id}/promote` | Promote user (admin) |
