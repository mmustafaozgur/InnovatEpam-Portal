# ADR-013: Inline Forgot Password — No Email / No Token

**Status**: Accepted
**Date**: 2026-05-14
**Feature**: `008-forgot-password-profile`

---

## Context

Users who forget their password must be able to reset it without contacting an administrator. The InnovatEpam Portal is an intranet-style local application with no email infrastructure; no SMTP server, no email delivery service, and no token-storage table exist.

## Decision

Implement password reset as a direct, local-only operation:

- A "Forgot password?" link on the login page reveals an inline reset form on the **same page** (no navigation).
- The form collects: email address, new password, confirm new password.
- On submission, the backend looks up the user by email, hashes the new password, and writes it directly to `users.hashed_password`.
- No reset token is generated; no email is sent; no time-limited link is produced.
- If the email is not found, the error message explicitly states "No account found with that email address." (enumeration disclosure is acceptable for a local, intranet-only application per the spec clarification).

## Consequences

**Positive**:
- No new tables, no email infrastructure, no token lifecycle to manage.
- Password recovery is immediate and requires no external dependency.
- Implementation is minimal (one endpoint, one service function, one frontend component).

**Negative**:
- No identity verification beyond knowing the email address. Any person with physical or network access who knows a user's email can reset their password. This is acceptable for the intranet scope.
- Cannot be adapted for a public-facing application without adding a token + email flow.

## Constraints

This decision is valid only while the application remains a local-only, intranet-style system as defined in `specs/008-forgot-password-profile/spec.md` (Assumptions section). If the application is ever exposed publicly, this ADR must be superseded with a token + email flow.
