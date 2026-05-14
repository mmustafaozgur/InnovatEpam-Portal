# Contract: Update Profile (Account Information)

**Endpoint**: `PATCH /api/v1/users/me`
**Auth required**: Yes (session cookie)
**Router**: `backend/app/api/routes/users.py`

---

## Request

```http
PATCH /api/v1/users/me
Content-Type: application/json
Cookie: access_token=<jwt>

{
  "full_name": "Alice Updated"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | string | yes | Non-empty after strip |

---

## Responses

### 200 OK — success

```json
{
  "id": "uuid",
  "full_name": "Alice Updated",
  "email": "alice@epam.com",
  "role": "submitter"
}
```

Returns `UserResponse` (same schema as `/auth/me`).

### 401 Unauthorized — not authenticated

```json
{ "detail": "Not authenticated." }
```

### 422 Unprocessable Entity — validation failure

```json
{
  "detail": [
    { "loc": ["body", "full_name"], "msg": "full_name must not be empty", "type": "value_error" }
  ]
}
```

---

## Service logic (`user_service.update_profile`)

```python
async def update_profile(db: AsyncSession, user_id: str, full_name: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    user.full_name = full_name.strip()
    await db.commit()
    await db.refresh(user)
    return user
```

**Frontend side-effect**: On success, call `updateUser(responseUser)` from `AuthContext` so the name propagates to Sidebar and other consumers immediately.
