# Contract: Change Password (My Profile)

**Endpoint**: `POST /api/v1/users/me/change-password`
**Auth required**: Yes (session cookie)
**Router**: `backend/app/api/routes/users.py`

---

## Request

```http
POST /api/v1/users/me/change-password
Content-Type: application/json
Cookie: access_token=<jwt>

{
  "current_password": "oldpass123",
  "new_password": "newpass456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `current_password` | string | yes | Must verify against stored hash |
| `new_password` | string | yes | Min 8 characters |

*Note*: `confirm_password` matching is enforced client-side only via Zod `refine`.

---

## Responses

### 200 OK — success

```json
{ "message": "Password changed successfully." }
```

### 400 Bad Request — current password wrong

```json
{ "detail": "Current password is incorrect." }
```

### 401 Unauthorized — not authenticated

```json
{ "detail": "Not authenticated." }
```

### 422 Unprocessable Entity — validation failure

```json
{
  "detail": [
    { "loc": ["body", "new_password"], "msg": "password must be at least 8 characters", "type": "value_error" }
  ]
}
```

---

## Service logic (`user_service.change_password`)

```python
async def change_password(
    db: AsyncSession,
    user_id: str,
    current_password: str,
    new_password: str,
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.hashed_password = hash_password(new_password)
    await db.commit()
```

**Session invariant**: The existing session token is NOT invalidated. The user remains logged in after a successful password change.
