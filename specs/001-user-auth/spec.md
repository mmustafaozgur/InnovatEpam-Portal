# Feature Specification: User Authentication System

**Feature Branch**: `001-user-auth`

**Created**: 2026-05-12

**Status**: Draft

**Input**: User description: "Build a user authentication system for the InnovatEPAM Portal with employee registration (name, email, password, Privacy Policy checkbox), login/logout, role distinction (Submitter vs Admin), JWT-based sessions, and protected routes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee Registration (Priority: P1)

A new EPAM employee visits the portal for the first time and creates an account by providing their full name, email address, and a password, then agreeing to the Privacy Policy. Upon successful registration, the system assigns them a role automatically: the very first registered user becomes an Admin; all subsequent users become Submitters. After registration the employee is redirected to the portal home page, fully authenticated.

**Why this priority**: Registration is the entry point for all users. Without it, no other feature can be used. It also encodes the critical first-user-is-admin rule.

**Independent Test**: Can be fully tested by completing the registration form with valid data and verifying the new account appears in the system with the correct role assigned.

**Acceptance Scenarios**:

1. **Given** no users exist in the system, **When** an employee registers with valid name, email, password, and accepted Privacy Policy, **Then** the account is created, the user is granted the Admin role, and they are logged in and redirected to the home page.
2. **Given** at least one user already exists, **When** a new employee registers with valid data and accepted Privacy Policy, **Then** the account is created with the Submitter role and the user is logged in and redirected to the home page.
3. **Given** a registration form is submitted, **When** the Privacy Policy checkbox is not checked, **Then** registration is rejected and a clear error message is shown.
4. **Given** a registration form is submitted, **When** the email address is already registered, **Then** registration is rejected with a message indicating the email is in use.
5. **Given** a registration form is submitted, **When** required fields (name, email, or password) are missing or invalid, **Then** registration is rejected with field-level error messages.

---

### User Story 2 - Login and Logout (Priority: P1)

A registered employee enters their email and password to log into the portal. The system validates the credentials and grants access, establishing a session. The employee can later log out, which ends their session and redirects them to the login page.

**Why this priority**: Login is the daily entry point for all registered users. Logout is a basic security requirement.

**Independent Test**: Can be fully tested by logging in with valid credentials, verifying access to protected areas, then logging out and verifying access is revoked.

**Acceptance Scenarios**:

1. **Given** a registered employee, **When** they submit correct email and password, **Then** they are authenticated, a session is established, and they are redirected to the portal home page.
2. **Given** a login form, **When** incorrect credentials are submitted, **Then** access is denied and a generic error message is shown (without revealing whether the email or password was wrong).
3. **Given** an authenticated employee, **When** they click "Logout," **Then** their session is invalidated and they are redirected to the login page.
4. **Given** a logged-out user, **When** they attempt to access a protected page directly, **Then** they are redirected to the login page.

---

### User Story 3 - Protected Route Enforcement (Priority: P2)

Any unauthenticated visitor who tries to navigate directly to a portal page (other than login or registration) is automatically redirected to the login page. Once they log in, they are taken to the page they originally requested (or the home page if no specific destination was saved).

**Why this priority**: Protects all portal content from unauthorized access. Required before any other portal feature can be built.

**Independent Test**: Can be fully tested by attempting to visit any protected URL while logged out, confirming the redirect, then logging in and confirming access is granted.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to any protected route, **Then** they are immediately redirected to the login page.
2. **Given** an authenticated user with a valid session, **When** they navigate to a protected route, **Then** they are granted access without interruption.
3. **Given** an authenticated user whose session has expired, **When** they attempt to access a protected route, **Then** they are redirected to the login page with an appropriate notification.

---

### User Story 4 - Admin: View All Users and Promote to Admin (Priority: P3)

An Admin user can view a list of all registered portal users, including each user's name, email, and current role. The Admin can promote any Submitter to Admin role. The change takes effect immediately and the promoted user gains Admin capabilities on their next action.

**Why this priority**: Enables organisational management of the portal. Depends on the role system established in User Story 1.

**Independent Test**: Can be fully tested by logging in as an Admin, viewing the user list, promoting a Submitter, and verifying the promoted user's role changes in the list.

**Acceptance Scenarios**:

1. **Given** an authenticated Admin, **When** they navigate to the user management page, **Then** they see a list of all registered users with their names, emails, and roles displayed.
2. **Given** an authenticated Admin viewing the user list, **When** they promote a Submitter to Admin, **Then** the user's role is updated immediately and reflected in the list.
3. **Given** an authenticated Submitter, **When** they attempt to access the user management page, **Then** they are denied access and shown an appropriate message.
4. **Given** an authenticated Admin, **When** they view their own entry in the user list, **Then** no promote action is available for their own account (self-promotion is not needed).

---

### Edge Cases

- What happens when a user tries to register with an email already in the system? → Registration is rejected with a clear "email already in use" message.
- What happens if a session token expires mid-session? → The next request to a protected resource redirects the user to the login page.
- What happens if the Privacy Policy checkbox is unchecked on form submission? → Registration is blocked; the checkbox is highlighted with an error.
- What happens if the very first user registration fails halfway? → No user record is persisted; the next successful registration still becomes Admin.
- What happens if an Admin is demoted to Submitter (future)? → Out of scope for this feature; role changes are one-directional (Submitter → Admin) in this release.
- What if two users register simultaneously and both could be the "first" user? → The system ensures only one user can be the first Admin; the second concurrent registration becomes a Submitter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any visitor to register an account by providing full name, a valid email address, a password, and explicit acceptance of the Privacy Policy.
- **FR-002**: System MUST reject registration when the Privacy Policy checkbox is not checked, displaying a clear error.
- **FR-003**: System MUST reject registration when the submitted email is already associated with an existing account.
- **FR-004**: System MUST automatically assign the Admin role to the first successfully registered user and the Submitter role to all subsequent users.
- **FR-005**: System MUST allow registered users to log in using their email and password.
- **FR-006**: System MUST reject login attempts with incorrect credentials without revealing which field (email or password) was wrong.
- **FR-007**: System MUST establish a secure, time-limited session upon successful login.
- **FR-008**: System MUST allow authenticated users to log out, which immediately invalidates their session.
- **FR-009**: System MUST redirect unauthenticated users to the login page when they attempt to access any protected route.
- **FR-010**: System MUST allow Admin users to view a list of all registered users including their names, emails, and roles.
- **FR-011**: System MUST allow Admin users to promote any Submitter to Admin role; the change MUST take effect immediately.
- **FR-012**: System MUST deny Submitter users access to the user management area.
- **FR-013**: System MUST validate all registration inputs (non-empty name, valid email format, minimum password length) and display field-level error messages for invalid inputs.

### Key Entities *(include if feature involves data)*

- **User**: Represents a registered portal employee. Key attributes: unique identifier, full name, email address (unique), hashed password, role (Admin or Submitter), Privacy Policy acceptance status, registration timestamp.
- **Role**: Enumeration of permission levels. Values: `Admin` (can manage users and access all portal features) and `Submitter` (can access standard portal features).
- **Session**: Represents an authenticated user's active access token. Key attributes: token value, associated user, expiry time. Invalidated on logout or expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new employee can complete the full registration process in under 2 minutes on their first attempt.
- **SC-002**: A registered employee can log in successfully in under 30 seconds.
- **SC-003**: 100% of unauthenticated requests to protected pages result in a redirect to the login page with no protected content exposed.
- **SC-004**: The first registered user is always assigned the Admin role; all others receive the Submitter role — verified across 100% of test registrations.
- **SC-005**: An Admin can view the full user list and promote a user to Admin in under 1 minute.
- **SC-006**: Session expiry is enforced; an expired session results in redirection to login on the very next protected-page access.
- **SC-007**: 95% of users complete registration without needing external help, as measured by task completion rate in acceptance testing.

## Assumptions

- The portal is an internal EPAM tool accessible to employees only; public self-service sign-up is acceptable (no email verification step required for MVP).
- Password strength requirements default to a minimum of 8 characters; no additional complexity rules are enforced in this release.
- Session duration defaults to 8 hours (a standard working day), after which re-authentication is required.
- "Privacy Policy" refers to a static policy document already available on the portal; linking to it from the registration page is sufficient.
- Admin demotion (Admin → Submitter) is out of scope for this release; role changes are one-directional.
- There is no "forgot password" or email-based password reset flow in this release.
- The user management page (FR-010, FR-011) is accessible only to Admins; no other user administration features (delete, suspend) are in scope.
- Concurrent first-registration conflicts are handled by the persistence layer ensuring atomicity; only one user can ever hold the "first registered" distinction.
