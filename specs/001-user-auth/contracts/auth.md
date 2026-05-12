# API Contract: Authentication Endpoints

**Feature**: `001-user-auth` | **Base path**: `/api/v1/auth`

All responses are `application/json`. All requests that set a session send the JWT as an
`httpOnly`, `SameSite=Lax`, `Path=/` cookie named `access_token` (configurable via
`settings.COOKIE_NAME`). Browsers send this cookie automatically on every same-origin
request; no `Authorization` header is used.

---

## POST /api/v1/auth/register

Register a new employee account.

### Request

```json
{
  "full_name": "Jane Smith",
  "email": "jane.smith@epam.com",
  "password": "mypassword123",
  "privacy_policy_accepted": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | string | yes | Non-empty after strip |
| `email` | string (email) | yes | RFC 5322 format; normalised to lowercase |
| `password` | string | yes | Min 8 characters |
| `privacy_policy_accepted` | boolean | yes | Must be `true` |

### Responses

**201 Created** — account created, session established, httpOnly cookie set.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Jane Smith",
  "email": "jane.smith@epam.com",
  "role": "admin"
}
```

`role` is `"admin"` if this is the first successfully registered user; `"submitter"` otherwise.

**400 Bad Request** — `privacy_policy_accepted` is `false`.

```json
{ "detail": "Privacy Policy must be accepted to register." }
```

**409 Conflict** — email already registered.

```json
{ "detail": "Email already registered." }
```

**422 Unprocessable Entity** — Pydantic validation failure (missing field, invalid email format, password too short).

```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error.email" }
  ]
}
```

### Side Effects

- Inserts one row in `users` table.
- If `privacy_policy_accepted = false` or validation fails, no row is persisted (FR-008 edge case: first-user slot not consumed on failure).
- After successful insert, creates one row in `sessions` table with `expiry_time = now + 8h`.
- Sets `Set-Cookie: access_token=<JWT>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`.

---

## POST /api/v1/auth/login

Authenticate an existing employee.

### Request

```json
{
  "email": "jane.smith@epam.com",
  "password": "mypassword123"
}
```

### Responses

**200 OK** — credentials valid, session established, httpOnly cookie set.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Jane Smith",
  "email": "jane.smith@epam.com",
  "role": "admin"
}
```

**401 Unauthorized** — credentials invalid (email not found or password wrong).

```json
{ "detail": "Invalid credentials." }
```

Note: the response does **not** reveal whether the email or password was wrong (FR-006).

**422 Unprocessable Entity** — missing or malformed request body.

### Side Effects

- Creates one row in `sessions` table (multiple concurrent sessions allowed; ADR-006 D2).
- Sets `Set-Cookie: access_token=<JWT>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`.

---

## POST /api/v1/auth/logout

End the current session.

### Request

No body. The session is identified by the `access_token` cookie sent automatically.

### Responses

**200 OK** — session invalidated.

```json
{ "message": "Logged out successfully." }
```

**401 Unauthorized** — no valid session cookie present.

```json
{ "detail": "Not authenticated." }
```

### Side Effects

- Deletes the matching row from `sessions` table (FR-008, ADR-006 D1).
- Sets `Set-Cookie: access_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` (clears cookie).
- Only the current session is invalidated; other sessions for the same user are unaffected (ADR-006 D2).

---

## GET /api/v1/auth/me

Return the current authenticated user's profile. Used by the frontend `AuthProvider` on
page load to hydrate auth state (R-006).

### Request

No body. Authenticated via `access_token` cookie.

### Responses

**200 OK** — valid session.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Jane Smith",
  "email": "jane.smith@epam.com",
  "role": "admin"
}
```

**401 Unauthorized** — no cookie, invalid JWT, or expired/deleted session row.

```json
{ "detail": "Not authenticated." }
```

### Side Effects

- If the session row is found but `expiry_time < now`, the row is deleted and 401 is returned (lazy expiry; ADR-006 D5).

---

## Middleware Behaviour (all protected endpoints)

The `get_current_user` FastAPI dependency (used by `/auth/logout`, `/auth/me`, and all
`/users/*` endpoints) performs the following checks in order:

1. Read `access_token` cookie from request. If absent → **401**.
2. Decode JWT with PyJWT, verify signature and `exp` claim. If invalid/expired → **401**.
3. Extract `session_id` from payload. Query `sessions` by PK. If row absent → **401**.
4. Check `session.expiry_time > utcnow()`. If stale → delete row → **401** (ADR-006 D5).
5. Return `User` ORM object for use in the route handler.
