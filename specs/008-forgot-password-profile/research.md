# Research: Forgot Password & My Profile

**Feature**: `008-forgot-password-profile` | **Date**: 2026-05-14

---

## 1. Inline Forgot-Password — No Email / Token Architecture

**Decision**: Direct, local-only password reset via the login page. No email, no reset token, no TTL flow.

**Rationale**: The spec explicitly states "No email-sending or token mechanism is required; the reset is direct and local-only." The application is an intranet-style portal with no email infrastructure. The backend already has `hash_password` and `verify_password` from `passlib`; a reset is simply a lookup by email + `UPDATE hashed_password`.

**Alternatives considered**:
- Token + email flow: Rejected — email infrastructure unavailable; adds complexity not required by spec.
- Time-limited reset link: Rejected — no email delivery; would require an extra `reset_tokens` table for no benefit.

**Security note**: FR-007 explicitly allows an enumeration-revealing error message ("No account found with that email address"). The spec documents this as an intentional usability tradeoff for a local app.

---

## 2. Forgot-Password Endpoint Placement

**Decision**: `POST /api/v1/auth/reset-password` — unauthenticated, under the auth router.

**Rationale**: The endpoint is part of the authentication surface (not a user-management action). It requires no current session. Placing it under `/auth` mirrors existing patterns (`/auth/login`, `/auth/register`).

**Alternatives considered**:
- `POST /api/v1/users/reset-password`: Rejected — the `/users` router is for admin user management; reset-password is a self-service auth action.

---

## 3. Profile Update Endpoints

**Decision**: Two separate endpoints:
- `PATCH /api/v1/users/me` — update `full_name` only
- `POST /api/v1/users/me/change-password` — change password (requires current password)

**Rationale**: Separating name update from password change mirrors the spec's two-card layout and reduces request payload complexity. `PATCH /users/me` is a standard REST pattern for partial self-profile updates. Using `POST` for `change-password` is conventional for action-oriented endpoints.

**Alternatives considered**:
- Single `PUT /api/v1/users/me` with all fields: Rejected — mixes two distinct security contexts (unauthenticated name change vs. re-verified password change) into one payload.

---

## 4. AuthContext — `updateUser` Method

**Decision**: Add `updateUser(user: User) => void` to the `AuthContextValue` interface and implement it as `setUser(user)`.

**Rationale**: After a successful profile name update, `FR-015` requires the change to propagate immediately to all UI surfaces (sidebar, etc.). The AuthContext already owns the `user` state; exposing `updateUser` allows `AccountInfoSection` to push the fresh `UserResponse` from the server into global state without a page reload.

**Alternatives considered**:
- Re-fetching `/api/v1/auth/me` after update: Possible but requires an extra network round-trip. Directly calling `updateUser(responseUser)` is simpler and equally correct.
- Using React Query / SWR cache invalidation: Rejected — not installed; would add a dependency.

---

## 5. Session Continuity After Password Change

**Decision**: Password change via `/users/me/change-password` does NOT invalidate the current session; a success message is shown and the user remains logged in.

**Rationale**: Clarification confirmed: "Remain logged in — session continues and a success message is shown." The session token is stored in a separate `sessions` table and references `user_id`, not `hashed_password`. Changing the password does not rotate the session token.

**Alternatives considered**:
- Invalidate all sessions on password change: Rejected — explicitly contradicted by spec clarification.

---

## 6. Frontend Form Library & Validation

**Decision**: React Hook Form + Zod already installed (`frontend/node_modules/` confirms `react-hook-form`, `zod`, `zod-validation-error`). No new dependencies needed.

**Rationale**: All existing forms (`LoginForm`, `RegisterForm`) use this stack. Consistency; no justification for a different approach.

---

## 7. ADR Gap — Inline Password Reset

**Decision**: Create `docs/adr/013-inline-forgot-password.md` before finalizing this plan.

**Rationale**: The constitution requires every architectural decision not covered by an existing ADR to be documented before the plan is finalized. No existing ADR covers the inline, no-email reset flow. ADR-006 covers the auth system in general but not this specific sub-decision.
