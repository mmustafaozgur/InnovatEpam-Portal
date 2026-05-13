# ADR-006: User Authentication System Design Decisions

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Feature — `001-user-auth`

> Stack decisions (Python/FastAPI, SQLite, React/Vite) are governed by ADR-000 through ADR-002.
> This ADR documents only decisions specific to the user authentication feature.

---

## Decision 1: JWT Session Architecture — httpOnly Cookie + Server-Side Sessions Table

### Context

FR-007 requires a "secure, time-limited session" and FR-008 requires that logout "immediately invalidates" the session. A pure stateless JWT makes true server-side invalidation impossible without a revocation list. Three storage mechanisms were evaluated: cookie-based, localStorage-based, and a hybrid in-memory + refresh-token pattern.

### Decision

JWTs are delivered to the client exclusively via an httpOnly, SameSite=Lax cookie. Active sessions are persisted in a server-side `sessions` table in SQLite (see ADR-001). Logout deletes the corresponding row, satisfying the "immediate invalidation" requirement in FR-008. Session lifetime is 8 hours, matching the standard EPAM working day.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| JWT in localStorage | JavaScript-accessible; vulnerable to XSS token theft; logout cannot truly invalidate — deleting from localStorage leaves the cryptographically valid token usable until expiry |
| Short-lived JWT in memory + refresh token in httpOnly cookie | Correct industry-standard SPA pattern but highest implementation complexity; unjustified for an internal employee portal (Principle V: complexity must be justified) |
| httpOnly cookie, stateless (no server-side table) | Cookie storage without a revocation table cannot honour FR-008's "immediate invalidation" requirement — logout would only clear the cookie client-side while the JWT remains valid |

### Consequences

**Positive**: True session invalidation on logout satisfies FR-008; httpOnly cookie prevents XSS token theft; SameSite=Lax mitigates CSRF for standard navigation flows; adds one lightweight `sessions` table to SQLite.

**Negative / Trade-offs**: Backend must validate the session row on every authenticated request (one DB lookup per request); sessions table must be included in the data model and migration.

**Neutral**: The `sessions` table schema: `token` (JWT string), `user_id` (FK), `expiry_time` (timestamp), `created_at` (timestamp).

---

## Decision 2: Concurrent Session Policy — Multiple Active Sessions Per User

### Context

With a server-side sessions table, a design choice exists between allowing a user to hold multiple active sessions (e.g., desktop + laptop) or enforcing a single active session (new login invalidates all prior sessions). The choice affects the insert/delete logic on login and logout.

### Decision

Multiple concurrent sessions per user are permitted. Each successful login creates a new row in the `sessions` table. Logout deletes only the row matching the cookie presented in the current request — other sessions for the same user are unaffected.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Single active session (new login deletes all prior sessions) | Silently invalidating other devices is a surprising UX for an employee portal where desktop + laptop use is common; adds a DELETE-all-for-user step on every login without meaningful security benefit for an internal tool |

### Consequences

**Positive**: Natural multi-device experience; simpler insert logic on login (no prior session cleanup required).

**Negative / Trade-offs**: Stale rows accumulate if a user never explicitly logs out from a device; mitigated by the lazy expiry check (see Decision 5).

**Neutral**: No "log out all devices" feature is in scope for this release.

---

## Decision 3: Role Claim Trust and Promotion Deferral to Re-Login

### Context

FR-011 requires that when an Admin promotes a Submitter, "the change MUST take effect immediately." With JWTs embedding the user's role as a claim at issuance time, there is a tension between the DB state (updated immediately) and the active session's embedded role claim (stale until re-issued). Two approaches were considered: re-validating role from the DB on every request, or trusting the JWT claim and requiring re-login after promotion.

### Decision

The JWT role claim is the authoritative source for route authorization decisions. When a Submitter is promoted to Admin, the role is persisted immediately in the `users` table (visible in the admin user list at once), but the promoted user's existing sessions continue to carry the `Submitter` role claim until they log out and back in. "Takes effect immediately" refers to the database state, not the active session.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Re-check role from DB on every protected request | Satisfies instantaneous promotion but adds one DB lookup per request to every protected endpoint; introduces stateful middleware that couples route authorization to the database on the hot path; unjustified complexity for an internal tool (Principle V) |
| Invalidate all sessions on promotion | Would force immediate logout of the promoted user across all devices; disruptive UX not warranted for a role promotion that benefits the user |

### Consequences

**Positive**: Middleware remains stateless with respect to role — it trusts the JWT claim without a DB round-trip; simpler to implement and test.

**Negative / Trade-offs**: There is a window between promotion and the user's next login during which they cannot access Admin routes; acceptable given the infrequent nature of role promotions in an internal portal.

**Neutral**: Acceptance scenario 2 of User Story 4 must be written to reflect that "takes effect" means the DB and user list update immediately, while route access changes on next login.

---

## Decision 4: No Login Rate Limiting for MVP

### Context

Without rate limiting, the login endpoint (FR-005/FR-006) is vulnerable to brute-force password guessing. Three approaches were evaluated. The portal is an internal EPAM employee-only tool, not publicly accessible.

### Decision

No login rate limiting is implemented in this release. Brute-force protection is explicitly deferred to a future security hardening feature.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| IP-based rate limit (e.g., 5 failures / 15 min, HTTP 429) | Adds middleware state management (counters per IP); not justified for a non-public internal tool in the MVP scope |
| Account lockout after N failed attempts | Adds Admin unlock workflow complexity; risk of accidental self-lockout for internal users; out of scope for MVP |

### Consequences

**Positive**: No additional middleware complexity or state management for MVP.

**Negative / Trade-offs**: Login endpoint is open to brute-force attempts; acceptable risk given internal-only access; must be revisited before any public exposure of the portal.

**Neutral**: This decision must be re-evaluated if the portal's network exposure changes (e.g., public internet access, external partners).

---

## Decision 5: Session Expiry via Lazy Per-Request Check — No Background Cleanup Job

### Context

The `sessions` table accumulates rows over time. Expired rows (past `expiry_time`) must be detected and handled. Two mechanisms were considered: checking expiry on each request (lazy) and a background job that periodically deletes expired rows.

### Decision

Session expiry is enforced by a lazy check in the authentication middleware: on every protected request, the middleware validates `sessions.expiry_time > now`. If the row is absent or expired, the request is rejected with HTTP 401 and the expired row is deleted at that point. No background cleanup job is implemented for MVP.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Background periodic cleanup only (no per-request check) | Does not enforce SC-006 ("expired session results in redirection to login on the very next protected-page access") — a valid-looking cookie with a stale row could pass without per-request validation |
| Both lazy check + background cleanup | Correct but adds a background worker for a low-volume internal tool; complexity not justified (Principle V); lazy deletion keeps the table tidy without a separate process |

### Consequences

**Positive**: SC-006 is satisfied exactly — expiry is enforced on the very next request; no background process or scheduler needed; expired rows are cleaned up naturally through use.

**Negative / Trade-offs**: Rows for sessions that expire while the user is inactive (never makes another request) linger in the table until a future request or manual cleanup; acceptable for MVP given the expected low user volume of an internal portal.

**Neutral**: The `expiry_time` index on the `sessions` table should be evaluated during the planning phase per Principle II (query patterns reviewed at planning time, not after).

---

## Decision 6: First-Registered User Automatically Becomes Admin

### Context

The portal requires an initial Admin account to manage users (FR-010, FR-011). No seed data or manual bootstrap script was specified. A rule is needed to establish the first Admin without requiring out-of-band setup.

### Decision

The first user to successfully complete registration is automatically assigned the `Admin` role. All subsequent users receive the `Submitter` role. The persistence layer must guarantee atomicity: a failed mid-registration transaction must not consume the "first user" slot. Concurrent simultaneous first registrations are handled by the DB constraint ensuring only one row can ever hold the first-registered distinction.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Seed script / pre-created admin account | Requires out-of-band setup step; complicates deployment and test environment setup; adds an undocumented bootstrap dependency |
| Manual admin flag set via environment variable | Couples admin assignment to infrastructure configuration; non-obvious and untestable through the standard registration acceptance scenarios |
| All users start as Submitter; first login via a setup wizard grants Admin | Adds a separate setup flow not described in the feature input; unjustified complexity (Principle V) |

### Consequences

**Positive**: Zero-configuration bootstrap — deploying the portal and registering the first account is sufficient to establish an Admin; fully testable via the registration acceptance scenarios (AC-1 of User Story 1).

**Negative / Trade-offs**: If the first registration is made by accident or with wrong credentials, that account holds Admin; there is no way to re-assign the first-Admin designation in this release (Admin demotion is out of scope).

**Neutral**: The atomicity guarantee is delegated to the SQLite persistence layer; the application layer must use a transaction or a `COUNT(*) = 0` check within the same transaction to determine role assignment.

---

## Decision 7: MVP Scope Boundaries

### Context

Several authentication-adjacent features were explicitly evaluated during specification and excluded from this release to keep scope focused and deliverable within the bootcamp timeline.

### Decision

The following are **out of scope** for this release and must not be implemented:

- **Email verification on registration** — the portal is internal; EPAM employees are trusted; email verification adds infrastructure complexity (mail server, token flow) unjustified for MVP.
- **Forgot password / password reset flow** — no email infrastructure in scope; users must contact an Admin if locked out.
- **Admin demotion (Admin → Submitter)** — role changes are one-directional in this release; adding demotion requires additional admin safeguards (e.g., preventing removal of the last Admin) out of scope for MVP.
- **User deletion or suspension** — the user management page supports view + promote only; no destructive user operations are in scope.
- **Password complexity rules beyond 8-character minimum** — minimum 8 characters is the only enforced constraint; no uppercase, symbol, or history requirements for MVP.

### Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Include email verification | Requires a mail server or third-party email service; adds a multi-step registration flow; not justified for an internal employee-only tool |
| Include password reset | Depends on email infrastructure excluded above |
| Include admin demotion | Requires last-Admin guard logic and additional test coverage; deferred to keep this feature focused on the core auth flow |

### Consequences

**Positive**: Scope is tightly bounded, making the feature fully implementable and testable within the bootcamp sprint.

**Negative / Trade-offs**: Admins cannot be demoted; there is no self-service password recovery; these gaps must be addressed in follow-on features before any broader rollout.

**Neutral**: Each excluded item should be tracked as a future feature request; none of the exclusions affect the correctness of the features that are in scope.
