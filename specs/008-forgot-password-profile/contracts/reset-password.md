# Contract: Reset Password (Forgot Password)

**Endpoint**: `POST /api/v1/auth/reset-password`
**Auth required**: No (unauthenticated)
**Router**: `backend/app/api/routes/auth.py`

---

## Request

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "alice@epam.com",
  "new_password": "newpassword123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string (email) | yes | Valid email, must end with `@epam.com` |
| `new_password` | string | yes | Min 8 characters |

*Note*: `confirm_password` matching is enforced client-side only. The server validates only `new_password` length.

---

## Responses

### 200 OK — success

```json
{ "message": "Password reset successfully." }
```

### 404 Not Found — email not in DB

```json
{ "detail": "No account found with that email address." }
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

## Service logic (`auth_service.reset_password`)

```python
async def reset_password(db: AsyncSession, data: ResetPasswordRequest) -> None:
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="No account found with that email address.")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
```
