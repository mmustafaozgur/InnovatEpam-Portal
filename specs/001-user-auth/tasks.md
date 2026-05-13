# Tasks: User Authentication System

**Feature**: `001-user-auth` | **Branch**: `001-user-auth` | **Date**: 2026-05-12

**Input**: Design documents from `specs/001-user-auth/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/auth.md ✅ | contracts/users.md ✅ | research.md ✅ | quickstart.md ✅

**TDD Enforced (ADR-004)**: Every test task must produce FAILING tests before its paired implementation task begins. Confirm RED before writing GREEN.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel — different file, no dependency on an incomplete task in the same phase
- **[USN]**: User story this task belongs to (US1–US4); omitted for Setup, Foundational, and Polish phases
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create project scaffolding — directory layout, dependency manifests, and toolchain config — before any business logic is written.

- [X] T001 Create backend/ directory tree with all subdirectories (app/core, app/models, app/schemas, app/services, app/api/routes, tests/unit, tests/integration) and empty `__init__.py` files per plan.md structure
- [X] T002 [P] Create backend/requirements.txt listing all production and dev dependencies: fastapi, "pydantic[email]", "PyJWT>=2.8.0", "passlib[bcrypt]", "sqlalchemy[asyncio]", aiosqlite, "uvicorn[standard]", pydantic-settings, python-multipart, pytest, pytest-asyncio, httpx
- [X] T003 [P] Create backend/.env.example with placeholder entries for JWT_SECRET, JWT_ALGORITHM, SESSION_TTL_HOURS, COOKIE_NAME, DATABASE_URL, CORS_ORIGINS per quickstart.md environment variable table
- [X] T004 Initialise frontend/ project: run `npm create vite@latest frontend -- --template react-ts` from repo root, then `cd frontend && npm install react-router-dom@6`
- [X] T005 [P] Install and configure Tailwind CSS in frontend/: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`; add content globs to frontend/tailwind.config.js; add `@tailwind` directives to frontend/src/index.css
- [X] T006 [P] Initialise shadcn/ui in frontend/: run `npx shadcn-ui@latest init` accepting defaults; install component variants: `npx shadcn-ui@latest add button input form checkbox table badge`; then run `npm install zod @hookform/resolvers` — zod and its resolver adapter are required by the MASTER.md form patterns (Field-Level Error State uses `zodResolver` + `useForm`)
- [X] T007 [P] Configure frontend/vite.config.ts with `server.proxy` mapping `/api` to `http://localhost:8000` so fetch calls from the SPA reach the backend without CORS during development

**Checkpoint**: `uvicorn` can start a stub `main.py`; `npm run dev` launches the Vite dev server at localhost:5173 without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by all user stories — ORM models, database engine, JWT/password utilities, Pydantic schemas, FastAPI app factory, authentication dependency, test fixtures, and React app shell.

**⚠️ CRITICAL**: No user story implementation may begin until all Phase 2 tasks are complete and the security unit tests pass.

- [X] T008 Create backend/app/core/config.py — `Settings` class via pydantic-settings: `JWT_SECRET: str`, `JWT_ALGORITHM: str = "HS256"`, `SESSION_TTL_HOURS: int = 8`, `COOKIE_NAME: str = "access_token"`, `DATABASE_URL: str = "sqlite+aiosqlite:///./innovatepam.db"`, `CORS_ORIGINS: str = "http://localhost:5173"`; expose module-level `settings = Settings()`
- [X] T009 [P] Write backend/tests/unit/test_security.py — unit tests (RED): `hash_password` returns a bcrypt string; `verify_password` returns True for matching plain/hash and False for wrong password; `create_jwt` returns a decodable token containing `sub`, `role`, `session_id`, `exp` claims; `decode_jwt` raises `HTTPException(401)` on a tampered token and on an expired token. Confirm ALL tests FAIL before proceeding to T010.
- [X] T010 Create backend/app/core/security.py — implement `hash_password(plain: str) -> str`, `verify_password(plain: str, hashed: str) -> bool`, `create_jwt(payload: dict, expire_hours: int) -> str` (PyJWT HS256, exp = now + expire_hours), `decode_jwt(token: str) -> dict` (raises `HTTPException(401)` on failure); all T009 tests must now PASS (GREEN)
- [X] T011 [P] Create backend/app/models/user.py — User SQLAlchemy ORM model mapping to the `users` table per data-model.md DDL: `id` (TEXT PK, UUID v4), `full_name` (TEXT NOT NULL), `email` (TEXT NOT NULL UNIQUE), `hashed_password` (TEXT NOT NULL), `role` (TEXT CHECK IN ('admin','submitter')), `privacy_policy_accepted` (INTEGER DEFAULT 0), `created_at` (TEXT DEFAULT strftime now); define `idx_users_email` Index
- [X] T012 [P] Create backend/app/models/session.py — Session SQLAlchemy ORM model mapping to the `sessions` table: `id` (TEXT PK), `user_id` (TEXT FK→users.id), `token` (TEXT NOT NULL UNIQUE), `expiry_time` (TEXT NOT NULL), `created_at` (TEXT DEFAULT strftime now); define `idx_sessions_token`, `idx_sessions_expiry`, `idx_sessions_user_id` Indexes per data-model.md DDL
- [X] T013 Create backend/app/database.py — `async_engine` (create_async_engine with aiosqlite), `AsyncSessionLocal` factory (expire_on_commit=False), `get_db()` async dependency yielding a session, `init_db()` coroutine calling `Base.metadata.create_all` via `async_engine.begin()` / `conn.run_sync`
- [X] T014 [P] Create backend/app/schemas/auth.py — Pydantic v2 models: `RegisterRequest` (full_name str min_length=1, email EmailStr, password str min_length=8, privacy_policy_accepted bool), `LoginRequest` (email EmailStr, password str), `UserResponse` (id, full_name, email, role, model_config from_attributes=True), `UsersListResponse` (users: list[UserResponse])
- [X] T015 Create backend/app/api/deps.py — `get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User` FastAPI dependency: (1) read `access_token` cookie → raise 401 if absent; (2) `decode_jwt` → extract `session_id` and `role` from JWT payload → raise 401 on decode failure; (3) query `sessions WHERE id = session_id` → raise 401 if absent; (4) check `expiry_time > utcnow()` → if stale DELETE row and raise 401 (ADR-006 D5); (5) query `User` by `session.user_id`; (6) **set `user.role = jwt_payload["role"]`** — override the DB value with the JWT claim so authorization reflects the role at token issuance, not the current DB state; return the modified `User`; raise `HTTPException(401, "Not authenticated.")` at any failure point
- [X] T016 [P] Create empty router stubs: backend/app/api/routes/auth.py (`router = APIRouter(prefix="/auth", tags=["auth"])`; no route handlers yet) and backend/app/api/routes/users.py (`router = APIRouter(prefix="/users", tags=["users"])`; no route handlers yet) so main.py can import them without errors
- [X] T017 Create backend/main.py — FastAPI app factory with `lifespan` context calling `init_db()` on startup, `CORSMiddleware` (allow_origins from settings.CORS_ORIGINS split, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]), `app.include_router(auth_router, prefix="/api/v1")`, `app.include_router(users_router, prefix="/api/v1")`
- [X] T018 Create backend/tests/conftest.py — pytest-asyncio fixtures: in-memory `aiosqlite://` async engine, `test_db` session per test (create/drop tables), `override_get_db` FastAPI dependency override injected into `async_client` (httpx.AsyncClient with `app` and `base_url="http://test"`), `create_test_user(db, role="submitter")` factory creating a real User row, `authenticated_client(async_client, user)` factory setting the access_token cookie with a valid JWT + session row
- [X] T019 [P] Create frontend/src/types/auth.ts — TypeScript types: `Role = 'admin' | 'submitter'`, `User` interface (id: string, full_name: string, email: string, role: Role), `AuthState` interface (user: User | null, isLoading: boolean)
- [X] T020 [P] Create frontend/index.html — minimal HTML shell: charset UTF-8, viewport meta, `<title>InnovatEpam Portal</title>`, `<div id="root"></div>`, `<script type="module" src="/src/main.tsx">`
- [X] T021 [P] Create frontend/src/main.tsx — React 18 entry point: `ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)`
- [X] T022 Create frontend/src/App.tsx — React Router v6 `BrowserRouter` wrapping `AuthProvider`; stub routes: `/login` → LoginPage, `/register` → RegisterPage, `/` inside `ProtectedRoute` → HomePage, `/users` inside `AdminRoute` → UsersPage; use React.lazy / placeholder components for pages not yet implemented so the app compiles
- [X] T023 Create frontend/src/context/AuthContext.tsx — `AuthContext` providing `{ user: User | null, isLoading: boolean, login(user: User): void, logout(): void }`; `AuthProvider` calls `GET /api/v1/auth/me` on mount (fetch with `credentials: 'include'`), sets `user` on 200 or `null` on 401, then sets `isLoading = false`; export `useAuth()` hook

**Checkpoint**: `pytest backend/tests/unit/test_security.py` — all tests PASS. `uvicorn main:app --reload` (run from `backend/`) starts without import errors. `npm run dev` renders the app shell at localhost:5173.

---

## Phase 3: User Story 1 — Employee Registration (Priority: P1) 🎯 MVP

**Goal**: A new employee registers with full name, email, password, and Privacy Policy acceptance. The first registrant is automatically assigned the Admin role; all subsequent users become Submitters. On success the user is logged in and redirected to the home page.

**Independent Test**: `POST /api/v1/auth/register` with valid data → 201 + httpOnly cookie; verify role is `admin` for first user and `submitter` for second. No access to other stories required.

### Tests — Write FIRST (RED phase, ADR-004)

- [X] T024 [P] [US1] Write backend/tests/unit/test_auth_service.py — `register()` unit tests: first user in an empty DB is assigned `role='admin'`; second user is assigned `role='submitter'`; duplicate email raises `HTTPException(409)`; `privacy_policy_accepted=False` raises `HTTPException(400)`; password shorter than 8 chars raises `HTTPException(422)`. All tests MUST FAIL before T027.
- [X] T025 [P] [US1] Write backend/tests/integration/test_auth_routes.py — `POST /api/v1/auth/register` integration tests: 201 response with `Set-Cookie: access_token` (HttpOnly) for valid body; `role='admin'` for first user; 400 for `privacy_policy_accepted=false`; 409 for duplicate email; 422 for invalid email format, password < 8 chars, missing `full_name`. All tests MUST FAIL before T028.
- [X] T026 [P] [US1] Write frontend/tests/unit/RegisterForm.test.tsx — Vitest + React Testing Library tests: renders full_name, email, password, privacy_policy checkbox, and submit button; submitting empty form shows field-level error messages; submitting valid data calls the `register()` API function; 409 API response displays an error message; successful 201 response calls `AuthContext.login(user)` and navigates to `/`. All tests MUST FAIL before T031.

### Implementation

- [X] T027 [US1] Create backend/app/services/auth_service.py with `register(db: AsyncSession, data: RegisterRequest) -> User`: validate `privacy_policy_accepted=True` (raise 400); normalise email to lowercase; check for duplicate email (raise 409); atomically count existing users in the same transaction to assign `role='admin'` if count==0 else `'submitter'` (ADR-006 D6); `hash_password`; INSERT User row; INSERT Session row (`expiry_time = utcnow + SESSION_TTL_HOURS`); return the new `User` ORM object
- [X] T028 [US1] Implement `POST /api/v1/auth/register` handler in backend/app/api/routes/auth.py (replacing the T016 stub): call `auth_service.register()`, set `Set-Cookie: access_token=<JWT>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` on the response, return `UserResponse` with HTTP 201 per contracts/auth.md
- [X] T029 [P] [US1] Create frontend/src/api/auth.ts with `register(data: RegisterRequest): Promise<User>` fetch wrapper: `POST /api/v1/auth/register` with `credentials: 'include'`; return typed `User` on 201; extract and throw `detail` string on 400/409/422
- [X] T030 [US1] Verify that design-system/innovatepam/MASTER.md covers the following RegisterForm components: form layout, TextInput, PasswordInput, Checkbox, PrimaryButton, FieldError, FormError; run `/ui-ux-pro-max` to add any missing components to MASTER.md before implementing RegisterForm (Constitution Principle IV gate)
- [X] T031 [US1] Create frontend/src/components/auth/RegisterForm.tsx — use `useForm` + `zodResolver` with a Zod schema (full_name min 1, email `z.string().email()`, password min 8, privacy_policy_accepted `z.literal(true)`); render with shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, `<FormMessage>` per MASTER.md Field-Level Error State pattern; fields: full_name (Input), email (Input), password (PasswordInput with show/hide toggle per MASTER.md), privacy_policy (Checkbox + label per MASTER.md Checkbox spec); on valid submit call `register()` from api/auth.ts; on success dispatch to `AuthContext.login(user)` and navigate to `/`; on 409 set a root form error displayed as Inline Notification Banner (all styling strictly per MASTER.md)
- [X] T032 [US1] Create frontend/src/pages/RegisterPage.tsx — centered page layout rendering `<RegisterForm />`; "Already have an account? Log in" link to `/login`

**Checkpoint**: `pytest backend/tests/unit/test_auth_service.py backend/tests/integration/test_auth_routes.py -k register` — all PASS. `npm test -- RegisterForm` — all PASS. Registering the first user via the UI creates an Admin account and navigates to `/`.

---

## Phase 4: User Story 2 — Login and Logout (Priority: P1)

**Goal**: A registered employee logs in with email and password, establishes an httpOnly cookie session, and can log out to immediately invalidate that session. Page reload restores auth state via `GET /auth/me`.

**Independent Test**: `POST /api/v1/auth/login` with valid credentials → 200 + cookie; `GET /auth/me` → 200 with user object; `POST /auth/logout` → 200, cookie cleared, session row deleted; subsequent `GET /auth/me` → 401.

### Tests — Write FIRST (RED phase, ADR-004)

- [X] T033 [P] [US2] Append to backend/tests/unit/test_auth_service.py — `login()` tests: valid credentials return a `(User, Session)` tuple; unknown email raises `HTTPException(401, "Invalid credentials.")`; wrong password raises `HTTPException(401, "Invalid credentials.")` (same message, FR-006); `logout()` test: deletes the matching session row; non-existent token raises `HTTPException(401)`. All tests MUST FAIL before T036.
- [X] T034 [P] [US2] Append to backend/tests/integration/test_auth_routes.py — `POST /api/v1/auth/login`: 200 + Set-Cookie for valid credentials; 401 generic message for wrong password; 401 generic message for unknown email; `POST /api/v1/auth/logout`: 200 with `Set-Cookie: access_token=; Max-Age=0` and session row absent from DB; `GET /api/v1/auth/me`: 200 returns UserResponse for a valid cookie, 401 for missing cookie, 401 and row deleted for an artificially expired session row. All tests MUST FAIL before T037.
- [X] T035 [P] [US2] Write frontend/tests/unit/LoginForm.test.tsx — Vitest + RTL tests: renders email, password fields and submit button; submitting with valid data calls `login()` API; a 401 response displays a single generic error message (not revealing which field failed, FR-006); successful login dispatches to `AuthContext.login(user)` and navigates to `/`. All tests MUST FAIL before T040.

### Implementation

- [X] T036 [US2] Append `login(db: AsyncSession, data: LoginRequest) -> tuple[User, Session]` and `logout(db: AsyncSession, token: str) -> None` to backend/app/services/auth_service.py: `login` looks up user by email (raise 401 if not found), calls `verify_password` (raise 401 if mismatch), inserts a new Session row (multiple concurrent sessions, ADR-006 D2), returns (user, session); `logout` queries sessions by token, deletes the row (raise 401 if not found)
- [X] T037 [US2] Append `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` handlers to backend/app/api/routes/auth.py per contracts/auth.md: login sets httpOnly cookie and returns UserResponse; logout deletes session and clears cookie (Max-Age=0); /me uses `get_current_user` dependency and returns UserResponse
- [X] T038 [P] [US2] Append `login(data)`, `logout()`, `getMe()` fetch wrappers to frontend/src/api/auth.ts: all use `credentials: 'include'`; `login` → POST /login, returns User on 200, throws on 401; `logout` → POST /logout; `getMe` → GET /me, returns User on 200, returns null on 401
- [X] T039 [US2] Verify design-system/innovatepam/MASTER.md covers LoginForm components (TextInput, PasswordInput, PrimaryButton, FormError); run `/ui-ux-pro-max` if any are missing (Constitution Principle IV gate)
- [X] T040 [US2] Create frontend/src/components/auth/LoginForm.tsx — use `useForm` + `zodResolver` with a Zod schema (email `z.string().email()`, password `z.string().min(1)`); render with shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, `<FormMessage>` per MASTER.md Field-Level Error State pattern; fields: email (Input), password (PasswordInput with show/hide toggle per MASTER.md); on valid submit call `login()` from api/auth.ts; on 200 dispatch to `AuthContext.login(user)` and navigate to `/`; on 401 set a single root-level error displayed as Inline Notification Banner with the message "Invalid email or password." — no field-level errors for login (FR-006: never reveal which field failed); all styling strictly per MASTER.md
- [X] T041 [US2] Create frontend/src/pages/LoginPage.tsx — centered page layout rendering `<LoginForm />`; "New employee? Register" link to `/register`
- [X] T042 [US2] Update frontend/src/context/AuthContext.tsx — implement `login(user: User)` (set context user) and `logout()` (call `api/auth.ts logout()`, clear context user to null, navigate to `/login`) actions; connect `AuthProvider` to use these implementations

**Checkpoint**: `pytest backend/tests/ -k "login or logout or me"` — all PASS. `npm test -- LoginForm` — all PASS. Login/logout flow works in the browser. Page reload restores auth state from `GET /me`.

---

## Phase 5: User Story 3 — Protected Route Enforcement (Priority: P2)

**Goal**: Unauthenticated visitors are redirected to `/login` when accessing any protected route. Authenticated users pass through. Expired sessions redirect on the very next protected request.

**Independent Test**: Visit `/` while logged out → redirected to `/login`. Log in → access `/` successfully. Submitter visits `/users` → sees access-denied message. Expired session row → `GET /auth/me` returns 401.

### Tests — Write FIRST (RED phase, ADR-004)

- [X] T043 [P] [US3] Write frontend/tests/unit/ProtectedRoute.test.tsx — Vitest + RTL tests: with `user=null, isLoading=false` renders a `<Navigate to="/login">` redirect; with `user` set and `isLoading=false` renders `<Outlet />`; with `isLoading=true` renders a loading spinner; `AdminRoute` with `role='submitter'` renders an "Access denied" message; `AdminRoute` with `role='admin'` renders `<Outlet />`. All tests MUST FAIL before T045.

### Implementation

- [X] T044 [US3] Extend design-system/innovatepam/MASTER.md to cover the two components missing for US3/US4: (1) **HomePage layout** — page shell with welcome heading, role badge (reusing the UserTable badge pattern), logout button placement, and admin-only nav link to `/users`; (2) **AdminRoute access-denied state** — error card shown to Submitters attempting to access an Admin-only route; run `/ui-ux-pro-max` to generate specs; do not implement T045, T053, or T054 until MASTER.md is updated (Constitution Principle IV gate)
- [X] T045 [US3] Create frontend/src/components/auth/ProtectedRoute.tsx — reads `useAuth()`; while `isLoading` renders a centered loading spinner per MASTER.md Loading State spec; if `user` is null, returns `<Navigate to="/login" replace />`; otherwise returns `<Outlet />`; export `AdminRoute` variant that additionally checks `user.role === 'admin'`, rendering the access-denied card per the MASTER.md spec added in T044 for Submitters (FR-012)
- [X] T046 [US3] Create frontend/src/pages/HomePage.tsx — protected home page using the MASTER.md HomePage layout added in T044: welcome heading, role badge, logout Button calling `AuthContext.logout()`, navigation link to `/users` visible only when `user.role === 'admin'`
- [X] T047 [US3] Update frontend/src/App.tsx — replace stub ProtectedRoute and AdminRoute imports with the actual `frontend/src/components/auth/ProtectedRoute.tsx` exports; confirm `/` wraps with `<ProtectedRoute>` and `/users` wraps with `<AdminRoute>`

**Checkpoint**: `npm test -- ProtectedRoute` — all PASS. Logged-out browser visit to `/` redirects to `/login`. Logged-in user sees home page. Submitter navigating to `/users` sees the access-denied card.

---

## Phase 6: User Story 4 — Admin: View Users and Promote to Admin (Priority: P3)

**Goal**: An Admin views all registered users (name, email, role, joined date) and can promote any Submitter to Admin. Submitters are denied access (403). Self-promotion is blocked (400). Role change is persisted immediately and reflected in the list.

**Independent Test**: Logged-in Admin calls `GET /api/v1/users` → 200 with full list; calls `PATCH /api/v1/users/{id}/promote` → 200 with updated user. Submitter calls either endpoint → 403. Admin promotes themselves → 400.

### Tests — Write FIRST (RED phase, ADR-004)

- [X] T048 [P] [US4] Write backend/tests/unit/test_user_service.py — `list_users()` returns all User rows ordered by `created_at` ASC; `promote_user(db, target_id, actor_id)` updates target role to `'admin'`; raises `HTTPException(400)` if target is already Admin; raises `HTTPException(400)` when `actor_id == target_id` (self-promotion guard, US4 AC4); raises `HTTPException(404)` if `target_id` not found. All tests MUST FAIL before T052.
- [X] T049 [P] [US4] Write backend/tests/integration/test_user_routes.py — `GET /api/v1/users`: 200 with users array for Admin, 403 for Submitter, 401 for unauthenticated; `PATCH /api/v1/users/{id}/promote`: 200 for valid Submitter target, 400 for already-Admin target, 400 for self-promotion, 403 for Submitter actor, 404 for unknown user_id. All tests MUST FAIL before T053.
- [X] T050 [P] [US4] Write frontend/tests/unit/UserTable.test.tsx — Vitest + RTL tests: renders a row per user with full_name, email, role, created_at columns; "Promote to Admin" button present on rows where `role='submitter'` and `row.id !== currentUser.id`; button absent on Admin rows and on the current user's own row; clicking "Promote" calls `promoteUser(userId)` and invokes the `onRefresh` prop callback. All tests MUST FAIL before T055.

### Implementation

- [X] T051 [US4] Create backend/app/services/user_service.py — `list_users(db: AsyncSession) -> list[User]`: `SELECT * FROM users ORDER BY created_at ASC`; `promote_user(db: AsyncSession, target_id: str, actor_id: str) -> User`: guard `actor_id != target_id` (raise 400), query target by PK (raise 404 if not found), guard `target.role != 'admin'` (raise 400 if already Admin), UPDATE `role = 'admin'`, commit, return updated User
- [X] T052 [US4] Implement `GET /api/v1/users` and `PATCH /api/v1/users/{user_id}/promote` handlers in backend/app/api/routes/users.py (replacing T016 stub): both require `current_user = Depends(get_current_user)` and `current_user.role == 'admin'` (raise 403 otherwise); GET calls `list_users()` and returns `UsersListResponse`; PATCH calls `promote_user(target_id=user_id, actor_id=current_user.id)` and returns `UserResponse` per contracts/users.md
- [X] T053 [P] [US4] Append `listUsers(): Promise<User[]>` and `promoteUser(userId: string): Promise<User>` fetch wrappers to frontend/src/api/auth.ts: `listUsers` → `GET /api/v1/users` with credentials, returns users array; `promoteUser` → `PATCH /api/v1/users/{userId}/promote` with credentials, returns updated User; both throw on 403/404/400
- [X] T054 [US4] Create frontend/src/components/users/UserTable.tsx — table with columns: Full Name, Email, Role (badge), Joined; for each row where `user.role === 'submitter'` and `user.id !== currentUser.id` render a "Promote to Admin" button that calls `promoteUser(user.id)` and on success calls the `onRefresh: () => void` prop; no action button on Admin rows or own-account row (US4 AC4)
- [X] T055 [US4] Create frontend/src/pages/UsersPage.tsx — Admin-only page: on mount calls `listUsers()` and stores result in state; renders `<UserTable users={users} currentUser={user} onRefresh={refetch} />`; shows loading state while fetching; renders inside the `AdminRoute` already wired in App.tsx

**Checkpoint**: `pytest backend/tests/` — all PASS. `npm test` — all PASS. Admin can navigate to `/users`, see all registered users, and promote a Submitter. Submitter receives the access-denied card at `/users` (MASTER.md T044 spec). PATCH self-promote returns 400.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end flow validation, type safety, environment wiring, and production-readiness checks.

- [X] T056 [P] Write frontend/tests/integration/auth-flow.test.tsx — full end-to-end flow using Vitest + MSW or real API: register first user (→ Admin), logout, register second user (→ Submitter), login as Admin, navigate to `/users`, promote Submitter to Admin, verify role change appears in list, logout
- [X] T057 [P] Run `npx tsc --noEmit` in frontend/ and resolve all TypeScript type errors across src/ and tests/
- [X] T058 [P] Run `pytest backend/tests/ -v --tb=short` in backend/ and confirm 100% pass rate; fix any remaining failures before marking complete
- [X] T059 [P] Verify CORS configuration in backend/main.py: `allow_origins` must list specific origins (never `["*"]` when `allow_credentials=True`); confirm `CORS_ORIGINS` env var in `.env.example` matches frontend URL; confirm `credentials: 'include'` is used in all frontend/src/api/auth.ts fetch calls
- [X] T060 [P] Execute all curl smoke tests from quickstart.md end-to-end: register Admin user, check `/auth/me`, register Submitter, list users as Admin, logout; verify each expected response shape matches contracts/auth.md and contracts/users.md
- [X] T061 Final cookie audit in backend/app/api/routes/auth.py: confirm every `Set-Cookie` call uses `httponly=True, samesite="lax", path="/"`, `max_age=28800` for login/register and `max_age=0` for logout, matching ADR-006 D1

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependencies; start immediately
- **Phase 2 — Foundational**: Requires Phase 1 complete; **BLOCKS all user stories**
- **Phase 3 — US1 (P1)** 🎯: Requires Phase 2; creates `auth_service.py` — stop here for MVP demo
- **Phase 4 — US2 (P1)**: Requires Phase 2; appends to `auth_service.py` created in Phase 3 — run after Phase 3 backend tasks complete
- **Phase 5 — US3 (P2)**: Requires Phase 4 complete (AuthContext login/logout must be wired)
- **Phase 6 — US4 (P3)**: Backend requires Phase 2 only (independent); frontend requires Phase 5 (AdminRoute must exist)
- **Phase 7 — Polish**: Requires all user story phases complete

### User Story Backend Dependencies

```
Phase 2  →  auth_service.py created (T027)  ←  US1 register()
                      ↓
               US2 appends login()/logout() to auth_service.py (T036)

Phase 2  →  user_service.py created (T050)   ←  US4 (independent of US1/US2)

Phase 2 deps.py (T015)  ←  shared by US2 /me, US3 expiry, US4 RBAC
```

### Within Each User Story

1. Write all tests for the story first — confirm they FAIL (RED, ADR-004)
2. Backend: service before route handler
3. Frontend: types/api client before component, component before page
4. Mark story complete only when all its tests PASS (GREEN) and the acceptance scenarios work in the browser

### Parallel Opportunities

**Phase 2 — Foundational** (after T008 exists):
- T009 (test_security.py) ∥ T011 (user.py) ∥ T012 (session.py) ∥ T014 (schemas/auth.py) ∥ T016 (stubs)
- T019 (types/auth.ts) ∥ T020 (index.html) ∥ T021 (main.tsx)

**Phase 3 — US1 tests** (write all RED tests together):
- T024 (unit) ∥ T025 (integration) ∥ T026 (frontend unit)

**Phase 3 — US1 implementation** (after tests are RED):
- T027 (auth_service register) ∥ T029 (api/auth.ts register)

**Phase 4 — US2 tests** (write together after Phase 3 backend complete):
- T033 (unit) ∥ T034 (integration) ∥ T035 (frontend unit)

**Phase 4 — US2 implementation**:
- T036 (auth_service login/logout) ∥ T038 (api/auth.ts login/logout/getMe)

**Phase 6 — US4 tests**:
- T048 (unit) ∥ T049 (integration) ∥ T050 (frontend unit)

**Phase 6 — US4 implementation**:
- T052 (users routes) ∥ T053 (api/auth.ts list/promote) ∥ T054 (UserTable)

---

## Parallel Example: User Story 1

```bash
# Step 1 — Write all US1 tests in parallel (separate files, no conflicts):
Task T024: backend/tests/unit/test_auth_service.py
Task T025: backend/tests/integration/test_auth_routes.py
Task T026: frontend/tests/unit/RegisterForm.test.tsx

# Confirm all three test files FAIL (RED) before proceeding.

# Step 2 — Implement backend in sequence (service before route):
Task T027: backend/app/services/auth_service.py  [register()]
Task T028: backend/app/api/routes/auth.py        [POST /register]

# Step 2 — Implement frontend in parallel with backend (different files):
Task T029: frontend/src/api/auth.ts              [register() wrapper]

# Step 3 — Design gate, then frontend components (sequential):
Task T030: Verify MASTER.md (design gate)
Task T031: frontend/src/components/auth/RegisterForm.tsx
Task T032: frontend/src/pages/RegisterPage.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational ← **blocks everything**
3. Complete Phase 3: US1 — Registration ← minimum viable
4. Complete Phase 4: US2 — Login/Logout ← minimum viable
5. **STOP and VALIDATE**: register → login → logout full cycle works
6. Demo / deploy

### Incremental Delivery

| Increment | Adds | Independently Testable |
|-----------|------|------------------------|
| Setup + Foundational | Project scaffolding | App starts without errors |
| + US1 | Employee registration | Register → redirected home |
| + US2 | Login / logout / session | Full auth cycle |
| + US3 | Protected routes | Unauthenticated redirect |
| + US4 | Admin user management | View + promote users |
| + Polish | End-to-end + type safety | All tests green |

### Parallel Team Strategy (2+ developers)

```
Dev A (Backend): T008–T018, T024, T025, T027, T028, T033, T034, T036, T037, T048, T049, T051, T052
Dev B (Frontend): T019–T023, T026, T029–T032, T035, T038–T042, T043–T047, T050, T053–T056
After Phase 2: devs can begin their respective stories simultaneously.
```

---

## Notes

- `[P]` = safe to run in parallel — different file, no dependency on an incomplete same-phase task
- `[USN]` = traces directly to spec.md user story N and its acceptance criteria
- **TDD discipline (ADR-004)**: test task must FAIL (RED) before its implementation task begins
- **Design Gates (T030, T039, T044)**: block all frontend component tasks in that story — verify/extend MASTER.md and run `/ui-ux-pro-max` before writing components (Constitution Principle IV)
- Never include `hashed_password` in any API response (contracts/users.md, FR-013)
- All cookies must use `HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (ADR-006 D1)
- Lazy expiry: check `expiry_time > utcnow()` and DELETE stale row on every protected request (ADR-006 D5)
- Atomic first-user-admin: COUNT users + INSERT user in the same transaction (ADR-006 D6, R-004)
- Multiple concurrent sessions per user are allowed; logout deletes only the current session row (ADR-006 D2)
