# Feature Specification: Forgot Password & My Profile Page

**Feature Branch**: `008-forgot-password-profile`

**Created**: 2026-05-14

**Status**: Draft

**Input**: User description: "Add two features to the InnovatEpam Portal: forgot password on the login page, and a My Profile page accessible from the sidebar."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Forgot Password: Reset via Login Page (Priority: P1)

A registered user who has forgotten their password navigates to the login page, clicks "Forgot password?", and is presented with an inline reset form. They enter their email address and choose a new password. The system updates their password immediately so they can log in with the new credentials.

**Why this priority**: Locked-out users are completely blocked from using the portal. This is the highest-friction failure mode and restoring access is critical.

**Independent Test**: Can be fully tested by registering a user, triggering forgot-password, submitting the inline form, then logging in with the new password — delivering full account-recovery value independently.

**Acceptance Scenarios**:

1. **Given** a user is on the login page, **When** they click "Forgot password?", **Then** an inline reset form appears below the login form containing Email, New Password, and Confirm New Password fields plus a "Reset Password" button.
2. **Given** the inline reset form is visible, **When** the user submits a valid email with a new password ≥ 8 characters and matching confirmation, **Then** the system updates the password and shows a success message, and the form returns to the standard login view.
3. **Given** the inline reset form is visible, **When** the user submits an email that does not exist in the system, **Then** the system shows an error message indicating the email was not found.
4. **Given** the inline reset form is visible, **When** the user submits a new password shorter than 8 characters, **Then** a field-level validation error is shown before any server request is made.
5. **Given** the inline reset form is visible, **When** New Password and Confirm New Password do not match, **Then** a field-level validation error is shown before any server request is made.

---

### User Story 2 — My Profile: Update Account Information (Priority: P2)

An authenticated user opens "My Profile" from the sidebar, sees their current full name and (read-only) email address, edits their full name, and saves the change. The updated name is immediately reflected everywhere in the portal UI.

**Why this priority**: Profile self-service is a core expectation in any authenticated application; the name is displayed across the portal UI so keeping it accurate matters.

**Independent Test**: Can be fully tested by logging in, navigating to /profile, changing the full name, saving, then verifying the updated name appears in the sidebar and other UI surfaces.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on the My Profile page, **When** they view the Account Information section, **Then** they see their current full_name in an editable text field and their email in a disabled (read-only) text field.
2. **Given** the Account Information section is displayed, **When** the user edits the full name and clicks "Save Changes", **Then** the change is persisted and the name updates instantly in the sidebar and all other UI locations that display it.
3. **Given** the Account Information section is displayed, **When** the save fails due to a server error, **Then** an error message is shown to the user.

---

### User Story 3 — My Profile: Change Password (Priority: P2)

An authenticated user navigates to "My Profile", locates the Change Password section, enters their current password, chooses a new password, and confirms it. The system verifies the current password, validates the new one, and updates it.

**Why this priority**: Password self-service is a security essential for authenticated users; equal priority to account-info update.

**Independent Test**: Can be fully tested by logging in, opening /profile, submitting the Change Password form with correct current password and a valid new password ≥ 8 characters, then logging out and logging back in with the new password.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on the My Profile page, **When** they view the Change Password section, **Then** they see Current Password, New Password, and Confirm New Password fields and a "Change Password" button.
2. **Given** the Change Password section is displayed, **When** the user provides a correct current password, a new password ≥ 8 characters, and a matching confirmation, **Then** the password is updated, a success message is shown, and the user remains logged in with their session intact.
3. **Given** the Change Password section is displayed, **When** the user enters an incorrect current password, **Then** an error message is shown indicating the current password is wrong.
4. **Given** the Change Password section is displayed, **When** the user enters a new password shorter than 8 characters, **Then** a field-level validation error is shown before any server request is made.
5. **Given** the Change Password section is displayed, **When** New Password and Confirm New Password do not match, **Then** a field-level validation error is shown before any server request is made.

---

### User Story 4 — My Profile: Sidebar Navigation (Priority: P3)

Both admin and submitter users see a "My Profile" entry in the sidebar that navigates them to /profile.

**Why this priority**: Navigation is a prerequisite for profile access but is a thin change with minimal risk.

**Independent Test**: Can be fully tested by logging in as each role (admin, submitter) and confirming the sidebar item exists and routes to /profile.

**Acceptance Scenarios**:

1. **Given** an authenticated user with the 'admin' role, **When** they view the sidebar, **Then** a "My Profile" navigation item is visible and links to /profile.
2. **Given** an authenticated user with the 'submitter' role, **When** they view the sidebar, **Then** a "My Profile" navigation item is visible and links to /profile.

---

### Edge Cases

- What happens when the user submits the forgot-password form for an email that belongs to an admin account? (Same behavior as any other email — password is reset.)
- What happens when the user navigates directly to /profile while unauthenticated? (Protected route redirects to login.)
- What happens if the user clears the full_name field and tries to save an empty name? (Frontend validation should reject a blank name.)
- What happens if a server error occurs during the password reset? (Error message is shown; the user remains on the reset form.)
- What happens if the user double-clicks "Save Changes" or "Change Password"? (Button is disabled while the request is in flight to prevent duplicate submissions.)

## Requirements *(mandatory)*

### Functional Requirements

**Forgot Password**

- **FR-001**: The login page MUST display a "Forgot password?" link below the login form.
- **FR-002**: Clicking "Forgot password?" MUST reveal an inline reset form on the same page (no page navigation).
- **FR-003**: The inline reset form MUST contain: Email, New Password, Confirm New Password fields, and a "Reset Password" button. The Email field MUST accept only `@epam.com` addresses (this is an EPAM-internal portal; non-EPAM emails are rejected client-side before any server request).
- **FR-004**: The system MUST validate that New Password is at least 8 characters before submitting.
- **FR-005**: The system MUST validate that Confirm New Password matches New Password before submitting.
- **FR-006**: On successful submission the system MUST look up the user by email, hash the new password, and update the stored password record.
- **FR-007**: If the email is not found, the system MUST return an appropriate not-found response and display a specific error message to the user (e.g., "No account found with that email address").
- **FR-008**: On success, the system MUST show a success message and return the UI to the standard login form view.
- **FR-009**: No email-sending or token mechanism is required; the reset is direct and local-only.

**My Profile — Navigation**

- **FR-010**: The sidebar MUST include a "My Profile" navigation item visible to both 'admin' and 'submitter' roles.
- **FR-011**: The "My Profile" sidebar item MUST navigate to the /profile route.

**My Profile — Account Information**

- **FR-012**: The /profile page MUST display the user's full_name in an editable text field.
- **FR-013**: The /profile page MUST display the user's email in a read-only (disabled) text field.
- **FR-026**: The /profile page MUST present the Account Information and Change Password sections as separate, visually distinct cards/panels arranged vertically on a single scrollable page (no tabs).
- **FR-014**: Clicking "Save Changes" MUST persist the updated full_name to the data store.
- **FR-015**: On a successful save, the application MUST update the authenticated user's name in the global session context (via `updateUser()`) so it reflects immediately — without a page reload — in: (a) the sidebar user label, and (b) the full_name field pre-fill on the My Profile page. Any future UI surface that displays the user's name MUST consume the AuthContext value directly and not cache a local copy.
- **FR-016**: If the save fails, an error message MUST be displayed to the user.

**My Profile — Change Password**

- **FR-017**: The /profile page MUST provide a Change Password section with Current Password, New Password, and Confirm New Password fields.
- **FR-018**: The system MUST verify the provided current password against the stored hash before accepting a change.
- **FR-019**: If the current password is incorrect, the system MUST return an error response and display a message to the user.
- **FR-020**: The system MUST validate that the new password is at least 8 characters before submitting.
- **FR-021**: The system MUST validate that Confirm New Password matches New Password before submitting.
- **FR-022**: On a successful password change, the new password MUST be hashed and persisted to the data store.
- **FR-023**: A success message MUST be shown after a successful password change; the user MUST remain logged in and their active session MUST NOT be invalidated.

**General**

- **FR-024**: All form fields MUST display inline field-level error messages when validation fails.
- **FR-025**: The /profile route MUST be accessible only to authenticated users; unauthenticated access MUST redirect to the login page.

### Key Entities

- **User**: Represents a portal account with attributes: id, email (unique, immutable), full_name (editable), hashed_password, role (admin | submitter).
- **AuthContext / Session**: The client-side representation of the currently authenticated user; MUST be updated in-place after a successful profile save so name changes propagate without a page reload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a forgotten password can regain access to the portal in under 2 minutes using only the login page, without contacting an administrator.
- **SC-002**: 100% of password reset attempts for valid email addresses result in an immediate, usable credential update.
- **SC-003**: An authenticated user can update their full name and see the change reflected everywhere in the portal UI within 1 second of saving.
- **SC-004**: An authenticated user can change their password and log back in with the new credential within 1 minute.
- **SC-005**: Field-level validation errors appear instantly (without a server round-trip) for all invalid inputs on both the forgot-password form and the My Profile forms.
- **SC-006**: All three My Profile sections (navigation, account info, change password) are accessible to both admin and submitter roles with zero access-control regressions.

## Clarifications

### Session 2026-05-14

- Q: After a successful password change via the Change Password form, should the user remain logged in or be logged out and redirected to the login page? → A: Remain logged in — session continues and a success message is shown.
- Q: How should the Account Information and Change Password sections be laid out on the /profile page? → A: Separate vertical cards/panels — each section in its own visually distinct container.
- Q: When the forgot-password form is submitted with an email that does not exist, should the system show a specific error or a generic neutral message? → A: Specific error — "No account found with that email address" (usability over enumeration protection; local-only app).

## Assumptions

- This is a local-only, intranet-style application with no email infrastructure; password reset requires no verification token or email step.
- The existing user model already stores email (unique), full_name, hashed_password, and role; no schema migration is needed beyond ensuring the update paths work.
- The authentication context (AuthContext) already exposes a mechanism to update the current user object; if not, one will need to be added as part of this feature.
- React Hook Form and Zod are either already installed or will be added as dependencies for this feature.
- The "My Profile" sidebar item follows the same role-based visibility pattern as existing sidebar items; no new role or permission type is introduced.
- Inline success/error notifications follow the existing toast or alert pattern used elsewhere in the portal.
- The /profile route is protected by the same authentication guard applied to other authenticated routes.
- Full name is a required field; an empty full_name is not a valid save state.
