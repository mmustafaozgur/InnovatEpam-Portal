# Quickstart: Forgot Password & My Profile

**Feature**: `008-forgot-password-profile` | **Date**: 2026-05-14

---

## What was built

Two features added to the InnovatEpam Portal:

1. **Forgot Password** — an inline reset form on the login page (no email/token; direct local update).
2. **My Profile** — a protected `/profile` page with Account Information (editable name) and Change Password sections, accessible from the sidebar.

---

## How to test manually

### Forgot Password

1. Start the backend: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173/login`
4. Click **"Forgot password?"** below the login form
5. Enter a registered `@epam.com` email, a new password (≥ 8 chars), and confirm it
6. Click **"Reset Password"** — a success message appears and the form returns to login
7. Log in with the new password to confirm the reset worked

**Edge cases to verify**:
- Non-existent email → "No account found with that email address."
- Password < 8 chars → inline field error, no request sent
- Mismatched passwords → inline field error, no request sent

---

### My Profile — Sidebar Navigation

1. Log in as any user (admin or submitter)
2. Verify **"My Profile"** appears in the sidebar
3. Click it → navigates to `/profile`

---

### My Profile — Account Information

1. Navigate to `/profile`
2. Edit the **Full Name** field (email is read-only)
3. Click **"Save Changes"**
4. Verify the name updates immediately in the sidebar footer

**Edge cases**:
- Empty name → inline validation error
- Server error → error alert shown

---

### My Profile — Change Password

1. Navigate to `/profile`
2. Scroll to **Change Password** section
3. Enter current password, a new password (≥ 8 chars), and confirm
4. Click **"Change Password"**
5. A success message appears; you remain logged in
6. Log out and log back in with the new password

**Edge cases**:
- Wrong current password → "Current password is incorrect."
- New password < 8 chars → inline field error
- Mismatched confirmation → inline field error

---

## Running the tests

```bash
# Backend unit + integration tests
cd backend
pytest -q

# Frontend component tests
cd frontend
npm run test
```
