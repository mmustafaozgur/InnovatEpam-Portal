# Implementation Plan: User Authentication System

**Branch**: `001-user-auth` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-auth/spec.md`

---

## Summary

Build a complete user authentication system for the InnovatEpam Portal: employee
registration with automatic role assignment (first registered user = Admin, all others =
Submitter), JWT-based login/logout with httpOnly cookie delivery and a server-side
`sessions` table for true immediate invalidation, protected route enforcement on the
frontend, and an Admin-only user management page (view all users, promote Submitter to
Admin). Stack: FastAPI + SQLite (backend) / React + Vite + TypeScript (frontend).

---

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript 5.x (frontend)

**Primary Dependencies**:
- Backend: FastAPI, Pydantic v2 (`pydantic[email]`), `PyJWT >= 2.8.0`, `passlib[bcrypt]`,
  SQLAlchemy (async), `aiosqlite`, `uvicorn[standard]`
- Frontend: React 18, React Router v6, Vite, Tailwind CSS, shadcn/ui
- Testing: pytest, `pytest-asyncio`, `httpx` (backend) · Vitest, React Testing Library (frontend)

**Storage**: SQLite — `users` table + `sessions` table. Full schema in `data-model.md`.

**Testing**: pytest + httpx (backend async test client) · Vitest + React Testing Library (frontend)

**Target Platform**: Linux server (internal EPAM deployment); local dev on Windows via Git Bash / WSL

**Project Type**: Web application — React SPA + FastAPI REST API (Option 2 structure)

**Performance Goals**: Sub-100ms p95 for all auth endpoints (Principle II). All hot-path
queries use indexed columns (`users.email`, `sessions.token`). See data-model.md query analysis.

**Constraints**: SQLite single-writer serialization used for atomic first-user-is-admin
assignment. No horizontal scaling required for MVP.

**Scale/Scope**: Internal employee portal; expected user base in the tens-to-hundreds range.
SQLite is appropriate (ADR-001).

---

## Constitution Check

### Pre-Phase 0 Gate

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Spec-Driven | ✅ PASS | `spec.md` approved; following `/speckit-specify → /speckit-plan` workflow |
| II — High Performance | ✅ PASS | All DB lookups on indexed columns; query patterns reviewed in `data-model.md` |
| III — TDD | ✅ PASS | Tests written before implementation; pytest + Vitest enforced (ADR-004) |
| IV — Design System | ⚠ GATE | `design-system/innovatepam/MASTER.md` exists. Auth UI components (LoginForm, RegisterForm, UserTable, ProtectedRoute loading state) **must be verified in MASTER.md before any UI task begins**. Run `/ui-ux-pro-max` to add missing components. |
| V — Simplicity | ✅ PASS | Server-side `sessions` table is the minimal addition required by FR-008 immediate invalidation (justified ADR-006 D1). All other choices use lightest viable option. |

### Post-Phase 1 Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Spec-Driven | ✅ PASS | All design artifacts (`research.md`, `data-model.md`, `contracts/`) derived from `spec.md` |
| II — High Performance | ✅ PASS | Query analysis complete in `data-model.md`; indices defined in DDL |
| III — TDD | ✅ PASS | Test stubs identified per endpoint in contracts; conftest structure defined |
| IV — Design System | ⚠ GATE OPEN | Must verify MASTER.md covers: form layout, text inputs, password input, checkbox, primary button, error messages, user table. Resolve before first UI implementation task. |
| V — Simplicity | ✅ PASS | No unjustified abstractions; no speculative features; two new deps (PyJWT, passlib) are minimal and justified |

---

## ADRs Referenced

| ADR | Decision | Applies To |
|-----|----------|-----------|
| [ADR-000](../../docs/adr/000-python-fastapi-backend.md) | Python 3.11 + FastAPI + Pydantic | Entire backend |
| [ADR-001](../../docs/adr/001-sqlite-storage.md) | SQLite as sole storage | `users` + `sessions` tables |
| [ADR-002](../../docs/adr/002-react-vite-frontend.md) | React + Vite + TypeScript + Tailwind + shadcn/ui | Entire frontend |
| [ADR-003](../../docs/adr/003-design-system-master.md) | All UI governed by MASTER.md | LoginForm, RegisterForm, UserTable |
| [ADR-004](../../docs/adr/004-test-driven-development.md) | TDD Red-Green-Refactor; pytest + Vitest | All implementation phases |
| [ADR-005](../../docs/adr/005-spec-driven-development.md) | Spec-driven workflow | This plan |
| [ADR-006 D1](../../docs/adr/006-user-auth-system.md) | httpOnly cookie + server-side `sessions` table | Auth middleware, logout |
| [ADR-006 D2](../../docs/adr/006-user-auth-system.md) | Multiple concurrent sessions | Session insert/delete logic |
| [ADR-006 D3](../../docs/adr/006-user-auth-system.md) | JWT role claim trusted; Admin on re-login | Route authorization middleware |
| [ADR-006 D4](../../docs/adr/006-user-auth-system.md) | No login rate limiting for MVP | Login endpoint |
| [ADR-006 D5](../../docs/adr/006-user-auth-system.md) | Lazy per-request expiry check | Auth middleware |
| [ADR-006 D6](../../docs/adr/006-user-auth-system.md) | First-registered user auto-becomes Admin | Registration service |
| [ADR-006 D7](../../docs/adr/006-user-auth-system.md) | MVP scope boundaries | Feature scope |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # This file
├── research.md          # Phase 0 — library choices, implementation patterns
├── data-model.md        # Phase 1 — DDL, query analysis, entity definitions
├── quickstart.md        # Phase 1 — dev setup, test commands, curl examples
├── contracts/
│   ├── auth.md          # Phase 1 — /auth/* endpoint contracts
│   └── users.md         # Phase 1 — /users/* endpoint contracts
└── tasks.md             # Phase 2 — generated by /speckit-tasks (not yet)
```

### Source Code (repository root)

```text
backend/
├── main.py                        # FastAPI app factory; CORS; startup (init_db)
├── requirements.txt               # Production + dev dependencies
├── .env.example                   # Template for environment variables
├── app/
│   ├── __init__.py
│   ├── database.py                # Async SQLAlchemy engine + session factory + init_db()
│   ├── core/
│   │   ├── config.py              # Settings via pydantic-settings (JWT_SECRET, COOKIE_NAME, etc.)
│   │   └── security.py            # create_jwt(), decode_jwt(), hash_password(), verify_password()
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                # User SQLAlchemy ORM model
│   │   └── session.py             # Session SQLAlchemy ORM model
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── auth.py                # Pydantic: RegisterRequest, LoginRequest, UserResponse
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py        # register(), login(), logout()
│   │   └── user_service.py        # list_users(), promote_user()
│   └── api/
│       ├── __init__.py
│       ├── deps.py                # get_current_user() dependency (cookie → session → user)
│       └── routes/
│           ├── __init__.py
│           ├── auth.py            # POST /register /login /logout; GET /me
│           └── users.py           # GET /users; PATCH /users/{id}/promote
└── tests/
    ├── conftest.py                # pytest fixtures: async test DB, test client, user factories
    ├── unit/
    │   ├── test_security.py       # hash/verify password; JWT create/decode
    │   └── test_auth_service.py   # register logic; first-user-is-admin; login; logout
    └── integration/
        ├── test_auth_routes.py    # HTTP-level tests for all /auth/* endpoints
        └── test_user_routes.py    # HTTP-level tests for all /users/* endpoints + RBAC

frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx                    # Router config + AuthProvider wrapper
    ├── api/
    │   └── auth.ts                # fetch wrappers: register(), login(), logout(), getMe(), listUsers(), promoteUser()
    ├── context/
    │   └── AuthContext.tsx        # React Context: user state + isLoading + login/logout actions
    ├── components/
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   ├── RegisterForm.tsx
    │   │   └── ProtectedRoute.tsx # <Outlet>-based v6 guard; AdminRoute variant
    │   └── users/
    │       └── UserTable.tsx      # Displays users list; promote button for Submitter rows
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── HomePage.tsx
    │   └── UsersPage.tsx          # Admin-only; wraps UserTable
    └── types/
        └── auth.ts                # User, Role, AuthState TypeScript types

tests/  (alongside frontend/src/)
├── unit/
│   ├── LoginForm.test.tsx
│   ├── RegisterForm.test.tsx
│   └── ProtectedRoute.test.tsx
└── integration/
    └── auth-flow.test.tsx         # Full register → login → access protected → logout
```

**Structure Decision**: Web application (Option 2). `backend/` and `frontend/` are
separate top-level directories. This matches the constitution's FastAPI/React stack split
(ADR-000, ADR-002) and is the natural boundary for separate test suites.

---

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|-----------|--------------------------------------|
| Server-side `sessions` table | FR-008 requires immediate session invalidation on logout; pure stateless JWT cannot be revoked server-side | Pure stateless JWT: logout only clears the client cookie; JWT remains cryptographically valid until 8h expiry, violating FR-008's "immediately invalidates" requirement |
| `GET /auth/me` endpoint | httpOnly cookie is not JS-accessible; SPA must call this endpoint on page load to hydrate auth state after a refresh | Storing user info in localStorage: exposes data to XSS; contradicts the security rationale for choosing httpOnly cookies |

---

## Phase 0: Research — Complete

All NEEDS CLARIFICATION items resolved. See `research.md` for full findings.

| Item | Resolution |
|------|-----------|
| JWT library | PyJWT >= 2.8.0 (R-001) |
| Password hashing | passlib[bcrypt] (R-002) |
| Cookie auth pattern | Custom `get_current_user` dependency reading `Request.cookies` (R-003) |
| Atomic first-user-is-admin | `BEGIN IMMEDIATE` transaction + app-level count check (R-004) |
| React protected routes | `<Outlet>`-based guard component with React Router v6 (R-005) |
| Auth state hydration | `GET /auth/me` on `AuthProvider` mount, `isLoading` gate (R-006) |
| JWT payload structure | `sub`, `role`, `session_id`, `exp`, `iat` (R-007) |

---

## Phase 1: Design — Complete

All design artifacts generated.

| Artifact | Description |
|----------|-------------|
| `data-model.md` | `users` + `sessions` DDL, indices, query analysis, validation rules |
| `contracts/auth.md` | `/auth/register`, `/login`, `/logout`, `/me` — request/response shapes, status codes, side effects |
| `contracts/users.md` | `/users` (list), `/users/{id}/promote` — RBAC table, all error cases |
| `quickstart.md` | Backend + frontend setup, test commands, curl smoke-test |

---

## Phase 2: Implementation

Generated by `/speckit-tasks`. Key implementation sequence (order enforced by TDD — tests
written first per ADR-004):

1. Backend scaffolding (project init, DB setup, ORM models)
2. Core security utilities (`security.py` — JWT, password hash) + unit tests
3. Auth service (register, login, logout) + unit tests
4. Auth routes + integration tests
5. User service (list, promote) + unit tests
6. User routes + RBAC integration tests
7. Frontend scaffolding (Vite project, routing, AuthContext)
8. Auth API client (`auth.ts`) + unit tests
9. Auth components (LoginForm, RegisterForm) + unit tests
   — **Design Gate**: verify MASTER.md before this step
10. ProtectedRoute + AdminRoute + unit tests
11. Pages (Login, Register, Home, Users)
12. End-to-end integration test (full flow)
