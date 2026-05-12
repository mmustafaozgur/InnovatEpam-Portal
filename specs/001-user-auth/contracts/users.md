# API Contract: User Management Endpoints

**Feature**: `001-user-auth` | **Base path**: `/api/v1/users`

All endpoints require authentication via `access_token` httpOnly cookie.
All endpoints additionally require `role = "admin"` in the JWT payload.
Non-admin requests return **403 Forbidden** before any business logic executes.

---

## GET /api/v1/users

Return the full list of registered portal users. **Admin only** (FR-010, FR-012).

### Request

No body. Authenticated via `access_token` cookie.

### Responses

**200 OK** — list of all registered users.

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Jane Smith",
      "email": "jane.smith@epam.com",
      "role": "admin",
      "created_at": "2026-05-12T09:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "full_name": "Bob Lee",
      "email": "bob.lee@epam.com",
      "role": "submitter",
      "created_at": "2026-05-12T09:15:00Z"
    }
  ]
}
```

**401 Unauthorized** — missing or invalid session.

```json
{ "detail": "Not authenticated." }
```

**403 Forbidden** — authenticated user is a Submitter.

```json
{ "detail": "Admin access required." }
```

### Notes

- `hashed_password` is never included in any response.
- Results are ordered by `created_at` ascending (oldest first).
- No pagination for MVP; expected user base is small for an internal portal.

---

## PATCH /api/v1/users/{user_id}/promote

Promote a Submitter to Admin. **Admin only** (FR-011).

### Path Parameter

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string (UUID) | ID of the user to promote |

### Request

No body.

### Responses

**200 OK** — role updated immediately in database.

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "full_name": "Bob Lee",
  "email": "bob.lee@epam.com",
  "role": "admin",
  "created_at": "2026-05-12T09:15:00Z"
}
```

**400 Bad Request** — target user is already Admin.

```json
{ "detail": "User is already an Admin." }
```

**400 Bad Request** — Admin attempting to promote themselves (self-promotion guard; US4 AC4).

```json
{ "detail": "Cannot promote your own account." }
```

**401 Unauthorized** — missing or invalid session.

```json
{ "detail": "Not authenticated." }
```

**403 Forbidden** — authenticated user is a Submitter.

```json
{ "detail": "Admin access required." }
```

**404 Not Found** — `user_id` does not match any registered user.

```json
{ "detail": "User not found." }
```

### Side Effects

- Updates `users.role` to `'admin'` for the specified user (single UPDATE by PK).
- Change is visible immediately in subsequent `GET /api/v1/users` responses.
- The promoted user's existing sessions are **not** invalidated. Admin route access takes
  effect on their next login (ADR-006 D3).

---

## RBAC Summary

| Endpoint | Submitter | Admin |
|----------|-----------|-------|
| `POST /auth/register` | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ |
| `POST /auth/logout` | ✅ | ✅ |
| `GET /auth/me` | ✅ | ✅ |
| `GET /users` | ❌ 403 | ✅ |
| `PATCH /users/{id}/promote` | ❌ 403 | ✅ |
