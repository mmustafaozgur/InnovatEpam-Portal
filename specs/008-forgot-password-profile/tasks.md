# Tasks: Forgot Password & My Profile Page

**Input**: Design documents from `specs/008-forgot-password-profile/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · data-model.md ✅ · contracts/ ✅ · research.md ✅ · quickstart.md ✅

**TDD**: Tests are written **first** and must be **confirmed failing** before implementation begins (Constitution Gate III).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Pydantic Schemas)

**Purpose**: Add new request schemas to the backend — required before any service or route can be implemented for any story.

- [ ] T001 Add `ResetPasswordRequest` Pydantic schema (with field validators — email: str, new_password: str min 8 chars) to `backend/app/schemas/auth.py`; add `UpdateProfileRequest` (full_name: str, min 1 char) and `ChangePasswordRequest` (current_password: str, new_password: str min 8 chars) schemas to `backend/app/schemas/users.py` (create this file if it does not exist)

---

## Phase 2: Foundational (Blocking Prerequisites for Profile Stories)

**Purpose**: Frontend infrastructure shared by US2, US3, and US4 — ProfilePage layout, App route, and AuthContext update hook. Also includes the constitution-mandated design system gate for all new UI components.

**⚠️ CRITICAL**: US2, US3, and US4 cannot be implemented or tested until this phase is complete. All UI implementation tasks (T007, T011, T012, T015, T019, T022, T026, T027, T028, T029) are additionally blocked on T031.

- [ ] T031 [P] **[CONSTITUTION GATE — Principle IV]** Amend `design-system/innovatepam/MASTER.md` via `/ui-ux-pro-max` to document component and style rules for the four new UI components: `ForgotPasswordForm` (inline email + two password fields, inline error display), `ProfilePage` (single-column layout with two vertically stacked card sections), `AccountInfoSection` (editable text field + disabled field card with save button), and `ChangePasswordSection` (three password fields card with submit button). All UI implementation tasks (T007, T011, T012, T015, T019, T022, T026, T027, T028, T029) are blocked until this task is complete.
- [ ] T002 [P] Add `updateUser(user: User) => void` to `AuthContextValue` interface, implement as `const updateUser = useCallback((u: User) => setUser(u), [])`, and expose in provider value in `frontend/src/context/AuthContext.tsx`
- [ ] T003 [P] Add lazy import `const ProfilePage = lazy(() => import('./pages/ProfilePage'))` and a `<Route path="/profile" element={<ProfilePage />} />` inside `<Route element={<ProtectedRoute />}><Route element={<AppLayout />}>` in `frontend/src/App.tsx`
- [ ] T004 Create `frontend/src/pages/ProfilePage.tsx` with "My Profile" page heading, rendering `<AccountInfoSection />` and `<ChangePasswordSection />` in a `space-y-6` vertically stacked layout; also create stub files `frontend/src/components/profile/AccountInfoSection.tsx` and `frontend/src/components/profile/ChangePasswordSection.tsx` (each exporting `export default function X() { return null; }`) to satisfy TypeScript imports until T019 and T026 replace them

**Checkpoint**: Foundation ready — US1 can begin immediately; US2, US3, US4 are unblocked. **T031 must be complete before any UI implementation task begins (Principle IV design gate).**

---

## Phase 3: User Story 1 — Forgot Password (Priority: P1) 🎯 MVP

**Goal**: Registered users can recover access by resetting their password inline on the login page without any email or token flow.

**Independent Test**: Register a user, navigate to login, click "Forgot password?", submit the inline form with the user's email and a new password ≥ 8 characters, then log in with the new credentials — full account recovery without an admin.

### Tests for User Story 1 ⚠️ Write first — confirm FAILING before implementation

- [ ] T005 [P] [US1] Write failing unit tests for `reset_password()` covering: success (hash updated), 404 for unknown email, and 422 for password < 8 chars in `backend/tests/unit/test_auth_service.py`
- [ ] T006 [P] [US1] Write failing integration tests for `POST /api/v1/auth/reset-password` covering: 200 success, 404 unknown email, 422 validation failure in `backend/tests/integration/test_auth_routes.py`
- [ ] T007 [P] [US1] Write failing frontend component tests for `ForgotPasswordForm.tsx` covering: renders three fields + button, Zod validation fires before fetch, success hides form via `onSuccess()`, 404 shows "No account found with that email address." in `frontend/src/components/auth/__tests__/ForgotPasswordForm.test.tsx`

### Implementation for User Story 1

- [ ] T008 [US1] Implement `reset_password(db, data)` in `backend/app/services/auth_service.py` — normalize email to lowercase, `SELECT` user by email (raise 404 if not found), `hash_password(data.new_password)`, assign to `user.hashed_password`, `await db.commit()`
- [ ] T009 [US1] Add `POST /auth/reset-password` route handler that calls `auth_service.reset_password()` and returns `{"message": "Password reset successfully."}` to `backend/app/api/routes/auth.py`
- [ ] T010 [P] [US1] Add `resetPassword(data: ResetPasswordRequest): Promise<{message: string}>` function posting to `/api/v1/auth/reset-password` in `frontend/src/api/auth.ts`
- [ ] T011 [US1] Create `frontend/src/components/auth/ForgotPasswordForm.tsx` with email, new_password, confirm_password fields; `forgotPasswordSchema` Zod validation (`z.string().email().endsWith('@epam.com')` per FR-003, min 8 chars for new_password, password match refine); on success emit a **global toast** (use the project's existing toast/notification pattern) then call `props.onSuccess()` — do not use an inline alert inside this component as it will unmount before the user reads it; on 404 shows "No account found with that email address." as an inline form error (persists while form is visible)
- [ ] T012 [US1] Update `frontend/src/components/auth/LoginForm.tsx` — add `const [showForgot, setShowForgot] = useState(false)`, "Forgot password?" button below the form, and conditionally render `<ForgotPasswordForm onSuccess={() => setShowForgot(false)} />`

**Checkpoint**: US1 complete — forgot-password flow fully functional and independently testable.

---

## Phase 4: User Story 2 — My Profile: Update Account Information (Priority: P2)

**Goal**: Authenticated users can view and update their full name on `/profile`; the change propagates instantly across all UI surfaces via AuthContext.

**Independent Test**: Log in, navigate to `/profile`, verify full_name is pre-filled and email is read-only, edit the name, click "Save Changes", then confirm the updated name appears in the sidebar without a page reload.

### Tests for User Story 2 ⚠️ Write first — confirm FAILING before implementation

- [ ] T013 [P] [US2] Write failing unit tests for `update_profile()` covering: success (name updated and returned), empty-name rejection (422) in `backend/tests/unit/test_user_service.py`
- [ ] T014 [P] [US2] Write failing integration tests for `PATCH /api/v1/users/me` covering: 200 success with `UserResponse`, 401 unauthenticated, 422 empty full_name in `backend/tests/integration/test_user_routes.py`
- [ ] T015 [P] [US2] Write failing frontend component tests for `AccountInfoSection.tsx` covering: pre-fills full_name from auth context, email field is disabled, successful save calls `updateUser()` with response, server error shows error message in `frontend/src/components/profile/__tests__/AccountInfoSection.test.tsx`

### Implementation for User Story 2

- [ ] T016 [US2] Implement `update_profile(db, user_id, full_name)` in `backend/app/services/user_service.py` — `SELECT` user by id (scalar_one), `user.full_name = full_name.strip()`, commit, refresh, return user
- [ ] T017 [US2] Add `PATCH /users/me` route handler (auth-required via `get_current_user` dependency, calls `user_service.update_profile()`, returns `UserResponse`) to `backend/app/api/routes/users.py`
- [ ] T018 [P] [US2] Add `updateProfile(data: UpdateProfileRequest): Promise<UserResponse>` function patching `/api/v1/users/me` to `frontend/src/api/auth.ts`
- [ ] T019 [US2] Create `frontend/src/components/profile/AccountInfoSection.tsx` — use `useAuth()` for `user` and `updateUser`; pre-fill full_name, disabled email field; `accountInfoSchema` Zod validation; on success call `updateUser(responseUser)` + show success alert; on error show error alert; disable Save button while submitting

**Checkpoint**: US2 complete — name update flows from form to sidebar without page reload.

---

## Phase 5: User Story 3 — My Profile: Change Password (Priority: P2)

**Goal**: Authenticated users can change their password on `/profile` by verifying their current password; session remains active after a successful change.

**Independent Test**: Log in, open `/profile`, submit the Change Password form with the correct current password and a new password ≥ 8 characters, log out, then log back in with the new credentials — and confirm the session was not invalidated during the change.

### Tests for User Story 3 ⚠️ Write first — confirm FAILING before implementation

- [ ] T020 [P] [US3] Write failing unit tests for `change_password()` covering: success (hashed_password updated), wrong current password (400), new password < 8 chars (422) in `backend/tests/unit/test_user_service.py`
- [ ] T021 [P] [US3] Write failing integration tests for `POST /api/v1/users/me/change-password` covering: 200 success, 400 wrong current password, 401 unauthenticated, 422 validation failure in `backend/tests/integration/test_user_routes.py`
- [ ] T022 [P] [US3] Write failing frontend component tests for `ChangePasswordSection.tsx` covering: renders three password fields, Zod validation fires before fetch, success shows alert and resets form, 400 shows "Current password is incorrect." in `frontend/src/components/profile/__tests__/ChangePasswordSection.test.tsx`

### Implementation for User Story 3

- [ ] T023 [US3] Implement `change_password(db, user_id, current_password, new_password)` in `backend/app/services/user_service.py` — `SELECT` user by id, `verify_password(current_password, user.hashed_password)` (raise 400 if wrong), `user.hashed_password = hash_password(new_password)`, commit — do NOT invalidate or touch the session token
- [ ] T024 [US3] Add `POST /users/me/change-password` route handler (auth-required, calls `user_service.change_password()`, returns `{"message": "Password changed successfully."}`) to `backend/app/api/routes/users.py`
- [ ] T025 [P] [US3] Add `changePassword(data: ChangePasswordRequest): Promise<{message: string}>` function posting to `/api/v1/users/me/change-password` in `frontend/src/api/auth.ts`
- [ ] T026 [US3] Create `frontend/src/components/profile/ChangePasswordSection.tsx` — current_password, new_password, confirm_password fields; `changePasswordSchema` Zod validation (min 8, password match refine); on success show success alert and reset form; on 400 show "Current password is incorrect."; disable Change Password button while submitting

**Checkpoint**: US3 complete — change password, session intact, can re-login with new credentials.

---

## Phase 6: User Story 4 — Sidebar Navigation (Priority: P3)

**Goal**: Both admin and submitter users see a "My Profile" entry in the sidebar that navigates to `/profile`.

**Independent Test**: Log in as admin and as submitter; confirm "My Profile" appears in the sidebar for both roles and clicking it routes to `/profile`.

### Tests for User Story 4 ⚠️ Write first — confirm FAILING before implementation

- [ ] T027 [US4] Update `frontend/src/components/layout/__tests__/Sidebar.test.tsx` to add assertions that "My Profile" link is rendered for a user with role `admin` and for a user with role `submitter`, and that the link href points to `/profile`

### Implementation for User Story 4

- [ ] T028 [US4] Add `{ to: '/profile', label: 'My Profile', icon: User, roles: ['submitter', 'admin'] }` to the `NAV_ITEMS` array in `frontend/src/components/layout/Sidebar.tsx` (import `User` icon from `lucide-react`)

**Checkpoint**: US4 complete — both roles can navigate to /profile from the sidebar.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Write frontend integration tests for `ProfilePage.tsx` verifying: both `AccountInfoSection` and `ChangePasswordSection` are rendered, and unauthenticated access to `/profile` redirects to login in `frontend/src/pages/__tests__/ProfilePage.test.tsx`
- [ ] T032 [P] **[SC-006 regression gate]** After Phase 2 foundational tasks (T002, T003) are merged, run the full existing test suites — `pytest backend/tests/integration/` and the frontend Vitest suite — to confirm zero regressions in pre-existing protected routes (ideas, reviews, admin) caused by the AuthContext change (T002) or the new /profile route (T003). Record pass/fail in the PR description under the Constitution Check section.
- [ ] T030 Run the quickstart.md manual validation walkthrough and confirm all acceptance scenarios for US1–US4 pass end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks US2, US3, US4 only (US1 can start in parallel with Phase 2). T031 (design gate) can run concurrently with T002/T003.
- **US1 (Phase 3)**: Depends on Phase 1 (T001) and T031 (design gate for UI tasks T007/T011/T012) — independent of Phase 2 backend tasks
- **US2 (Phase 4)**: Depends on Phase 2 completion and T031
- **US3 (Phase 5)**: Depends on Phase 2 completion and T031 — can run in parallel with US2 (see file-conflict warning above)
- **US4 (Phase 6)**: Depends on T003 (App route) and T031 — can run in parallel with US2/US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete; T032 should run immediately after Phase 2 merges

### User Story Dependencies

- **US1 (P1)**: Independent — only needs T001 (schemas)
- **US2 (P2)**: Depends on T002 (AuthContext), T003 (App route), T004 (ProfilePage)
- **US3 (P2)**: Depends on T003 (App route), T004 (ProfilePage) — independent of US2
- **US4 (P3)**: Depends on T003 (App route) — independent of US2/US3

### Within Each User Story

1. Tests written first and confirmed **failing**
2. Backend: schemas → service → route
3. Frontend: API function → component
4. Component integration tested against running backend

### Parallel Opportunities

- T031, T002, T003 (Phase 2) can all run in parallel — different files/operations
- T005, T006, T007 (US1 tests) can all run in parallel — different files
- T010, T011, T012 partially parallelizable — T010 (api/auth.ts) independent of T011/T012
- T013, T014, T015 (US2 tests) can run in parallel within US2
- T016, T018 partially parallelizable — T018 (api function) independent of T016 (service)
- T020, T021, T022 (US3 tests) can run in parallel within US3
- US2 (T013–T019) and US3 (T020–T026) can run in parallel if staffed — **⚠️ file conflict risk**: T013 and T020 both append to `backend/tests/unit/test_user_service.py`; T014 and T021 both append to `backend/tests/integration/test_user_routes.py`. Coordinate by splitting the file into clearly labelled function blocks (e.g., `# --- update_profile tests ---` / `# --- change_password tests ---`) or by having one developer do both files sequentially.

---

## Parallel Execution Examples

### Parallel Example: Phase 2 Foundational

```
Parallel batch:
  Task T002: Add updateUser() to frontend/src/context/AuthContext.tsx
  Task T003: Add /profile route to frontend/src/App.tsx
Then sequential:
  Task T004: Create frontend/src/pages/ProfilePage.tsx (after T003)
```

### Parallel Example: User Story 1

```
Parallel batch (write tests together):
  Task T005: backend/tests/unit/test_auth_service.py
  Task T006: backend/tests/integration/test_auth_routes.py
  Task T007: frontend/src/components/auth/__tests__/ForgotPasswordForm.test.tsx
Sequential (implement after tests are confirmed failing):
  Task T008: backend/app/services/auth_service.py
  Task T009: backend/app/api/routes/auth.py (after T008)
  Task T010: frontend/src/api/auth.ts (parallel with T008)
  Task T011: frontend/src/components/auth/ForgotPasswordForm.tsx (after T010)
  Task T012: frontend/src/components/auth/LoginForm.tsx (after T011)
```

### Parallel Example: User Stories 2 & 3 (two developers)

```
Developer A (US2):                        Developer B (US3):
  T013 unit tests (user_service update)     T020 unit tests (user_service change)
  T014 integration tests (PATCH /me)        T021 integration tests (POST change-pw)
  T015 frontend tests (AccountInfoSection)  T022 frontend tests (ChangePasswordSection)
  T016 user_service.update_profile()        T023 user_service.change_password()
  T017 PATCH /users/me route                T024 POST /users/me/change-password route
  T018 updateProfile() api function         T025 changePassword() api function
  T019 AccountInfoSection.tsx               T026 ChangePasswordSection.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) — schemas
2. Complete US1 tests (T005–T007) — confirm failing
3. Complete US1 implementation (T008–T012)
4. **STOP and VALIDATE**: Reset a password and log in with new credentials
5. Demo or deploy if ready

### Incremental Delivery

1. Setup + Foundational → Backend schemas + frontend scaffold ready
2. US1 (Forgot Password) → Test independently → Demo (MVP!)
3. US2 (Account Info) → Test independently → Demo
4. US3 (Change Password) → Test independently → Demo
5. US4 (Sidebar Nav) → Test both roles → Final integration
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With two developers after Phase 2 is complete:
- **Developer A**: US1 (Forgot Password) — fully independent
- **Developer B**: US2 + US3 (Profile sections) — both share ProfilePage and AuthContext

---

## Notes

- `[P]` tasks target different files with no cross-task dependencies — safe to run concurrently
- `[Story]` labels map each task to a user story for traceability and independent delivery
- TDD gate: every test task must be run and confirmed **failing** before the corresponding implementation task begins
- Session invariant (US3): `user.hashed_password` is updated; no session token, cookie, or session table is touched — the user stays logged in
- Email enumeration disclosure (US1): returning a specific 404 is intentional per ADR-013 (local intranet, no enumeration risk)
- Commit after each completed phase or logical task group
