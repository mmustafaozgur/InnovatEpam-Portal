# Data Model: Forgot Password & My Profile

**Feature**: `008-forgot-password-profile` | **Date**: 2026-05-14

---

## Entities

### User (existing — no schema migration required)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `String` (UUID) | PK | Immutable |
| `full_name` | `String` | NOT NULL | Editable via My Profile |
| `email` | `String` | NOT NULL, UNIQUE, indexed | Immutable; used as lookup key for forgot-password |
| `hashed_password` | `String` | NOT NULL | Updated by reset-password and change-password |
| `role` | `String` | `CHECK IN ('admin','submitter')` | Unchanged by this feature |
| `privacy_policy_accepted` | `Integer` | NOT NULL | Unchanged by this feature |
| `created_at` | `String` | server default | Unchanged by this feature |

**State transitions for this feature**:

```
User.full_name:          any non-empty string  →  new non-empty string (via PATCH /users/me)
User.hashed_password:    current hash          →  hash(new_password)   (via reset-password or change-password)
```

**Validation rules**:

| Field | Rule | Enforcement layer |
|-------|------|-------------------|
| `full_name` | Non-empty after strip | Pydantic (`UpdateProfileRequest`) + frontend Zod |
| `new_password` | Min 8 characters | Pydantic + frontend Zod |
| `confirm_password` | Must match `new_password` | Frontend Zod (`refine`) |
| `current_password` | Must verify against stored hash | `auth_service.change_password()` |
| `email` (reset) | Must exist in DB | `auth_service.reset_password()` |

---

## Pydantic Schemas (new)

### `ResetPasswordRequest` (backend/app/schemas/auth.py)

```python
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    # confirm_password validated client-side only; server validates min length

    @field_validator("email")
    @classmethod
    def email_must_be_epam(cls, v: str) -> str:
        if not v.lower().endswith("@epam.com"):
            raise ValueError("Only @epam.com email addresses are allowed")
        return v

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v
```

### `UpdateProfileRequest` (backend/app/schemas/users.py)

```python
class UpdateProfileRequest(BaseModel):
    full_name: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name must not be empty")
        return v
```

### `ChangePasswordRequest` (backend/app/schemas/users.py)

```python
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v
```

---

## Frontend TypeScript Interfaces (new)

```typescript
// frontend/src/api/auth.ts additions

interface ResetPasswordRequest {
  email: string
  new_password: string
}

interface UpdateProfileRequest {
  full_name: string
}

interface ChangePasswordRequest {
  current_password: string
  new_password: string
}
```

---

## Zod Schemas (frontend, new)

### Forgot Password Form

```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email').endsWith('@epam.com', 'Only @epam.com emails'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
```

### Account Info Form

```typescript
const accountInfoSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').trim(),
})
```

### Change Password Form

```typescript
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
```
