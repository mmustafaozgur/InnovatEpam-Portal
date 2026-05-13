# Feature Specification: Idea Submission System

**Feature Branch**: `002-idea-submission`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "Feature: Idea Submission System — allows authenticated EPAM employees to submit innovation ideas through the InnovatEpam portal, with file attachment support and idea browsing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit an Idea (Priority: P1)

A logged-in Submitter fills out the idea submission form with a title, description, and category, then submits it. The idea is automatically attributed to the submitter and becomes visible to all authenticated users.

**Why this priority**: Core value of the portal — without idea submission, the platform has no purpose. All other features depend on ideas existing in the system.

**Independent Test**: Can be fully tested by logging in as a Submitter, submitting an idea via the form, and verifying the idea appears in the ideas list attributed to the submitter. Delivers a complete, working submission flow.

**Acceptance Scenarios**:

1. **Given** a logged-in user with the Submitter role, **When** they fill in title, description, and category and submit the form, **Then** the idea is saved and the user is immediately redirected to the new idea's detail page.
2. **Given** a logged-in user with the Submitter role, **When** they attempt to submit without filling all required fields (title, description, or category), **Then** validation errors are shown and the idea is not submitted.
3. **Given** a logged-in user with the Evaluator (Admin) role, **When** they attempt to access the idea submission form, **Then** they are denied access with an appropriate message explaining the restriction.
4. **Given** an unauthenticated visitor, **When** they attempt to access the idea submission form, **Then** they are redirected to the login page.

---

### User Story 2 - Attach a File to an Idea (Priority: P2)

When submitting an idea, a Submitter may optionally attach a single file to provide additional context or supporting materials. The idea remains valid and submittable without a file.

**Why this priority**: Enhances submission quality by allowing supporting documentation, but the portal is still fully functional without it. Depends on P1 (idea submission) being complete.

**Independent Test**: Can be fully tested by submitting an idea with and without a file attachment, verifying file is stored and retrievable, and confirming the idea submits successfully either way.

**Acceptance Scenarios**:

1. **Given** a Submitter on the idea submission form, **When** they attach a valid file (PDF, DOCX, PNG, or JPG under 10 MB) and submit, **Then** the file is stored and associated with the idea.
2. **Given** a Submitter on the idea submission form, **When** they submit without attaching a file, **Then** the idea is saved successfully with no file attachment.
3. **Given** a Submitter on the idea submission form, **When** they attempt to attach a file exceeding 10 MB, **Then** an error message is shown and the file is rejected before submission.
4. **Given** a Submitter on the idea submission form, **When** they attempt to attach a file with a disallowed type (e.g., .exe, .zip), **Then** an error message is shown and the file is rejected.
5. **Given** a Submitter on the idea submission form, **When** they attempt to attach more than one file, **Then** only the first file is accepted (or the UI only allows single file selection).

---

### User Story 3 - List and View Ideas (Priority: P3)

Any authenticated user (Submitter or Evaluator) can browse a paginated list of all submitted ideas and click through to a detail view showing all fields. If an idea has an attached file, a download link is available.

**Why this priority**: Enables evaluation workflows and transparency across the organisation, but requires submitted ideas (P1) to exist first. Standalone value: evaluators can review submissions without needing to submit themselves.

**Independent Test**: Can be fully tested by verifying the ideas list shows correct summary data (title, category, submitter, date), clicking an idea opens its detail view, and the file download link appears only when a file exists.

**Acceptance Scenarios**:

1. **Given** a logged-in user (any role), **When** they navigate to the ideas list, **Then** they see all submitted ideas ordered newest-first, each showing title, category, submitter name, and submission date.
2. **Given** a logged-in user viewing the ideas list, **When** they click on an idea, **Then** they are taken to the idea's detail page showing all fields (title, description, category, submitter, date).
3. **Given** the original submitter or an Evaluator viewing an idea detail page where a file was attached, **When** they view the page, **Then** a download link for the file is visible and functional.
4. **Given** a Submitter who did not submit the idea viewing its detail page, **When** a file is attached, **Then** no download link is shown.
5. **Given** a logged-in user viewing an idea detail page where no file was attached, **Then** no download link is shown.
6. **Given** an unauthenticated visitor, **When** they attempt to access the ideas list or detail page, **Then** they are redirected to the login page.

---

### Edge Cases

- What happens when the ideas list is empty (no ideas submitted yet)? An empty-state message should be shown instead of a blank list.
- What happens if an idea's attached file is deleted from storage after submission? The detail page should handle a missing file gracefully (e.g., hide or disable the download link rather than showing a broken link).
- What happens if a Submitter submits the form twice rapidly (double-click)? The system should prevent duplicate submissions (idempotent submission).
- What happens when a file upload is interrupted mid-transfer? The system should reject the partial upload and return an error, leaving the idea unsaved.
- What happens if a title or description contains special characters (e.g., `<script>`, SQL fragments)? Input must be sanitised to prevent injection attacks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users with the Submitter role to submit ideas with title, description, and category as required fields; on successful submission, the system MUST redirect the submitter to the newly created idea's detail page.
- **FR-002**: System MUST prevent users with the Evaluator (Admin) role from submitting ideas; the submission form must be inaccessible to them.
- **FR-003**: System MUST automatically attribute each submitted idea to the authenticated user who submitted it.
- **FR-004**: System MUST validate that title, description, and category are all present before accepting a submission; missing fields MUST produce clear validation errors. Title MUST NOT exceed 150 characters; description MUST NOT exceed 3,000 characters; violations MUST produce field-level error messages.
- **FR-005**: System MUST allow Submitters to optionally attach a single file per idea at submission time.
- **FR-006**: System MUST accept files of types PDF, DOCX, PNG, and JPG only; all other types MUST be rejected with an error message.
- **FR-007**: System MUST reject files larger than 10 MB with an error message before the idea is submitted.
- **FR-008**: System MUST enforce one file per idea. The UI MUST allow only one file at a time; selecting a new file silently replaces the previous selection. The backend MUST store at most one file per idea row and MUST ignore any additional file fields in a multipart request.
- **FR-009**: System MUST allow ideas to be submitted without any file attachment.
- **FR-010**: System MUST allow all authenticated users (both Submitters and Evaluators) to view the full list of submitted ideas.
- **FR-011**: System MUST display in the ideas list: idea title, category, submitter name, and submission date. The list MUST be ordered by submission date descending (newest first) by default.
- **FR-012**: System MUST allow all authenticated users to navigate to an idea's detail page showing all fields (title, description, category, submitter, submission date).
- **FR-013**: System MUST display a download link for the attached file only to the idea's original submitter and users with the Evaluator (Admin) role. Other Submitters viewing the same idea's detail page MUST NOT see a download link. Direct requests to the file URL by unauthorized users MUST be rejected (not merely hidden).
- **FR-014**: System MUST redirect unauthenticated users to the login page when they attempt to access any idea-related page.
- **FR-015**: System MUST use a fixed set of categories: Process Improvement, Technology, Cost Saving, Other. Categories are hardcoded for v1; admin-managed categories are explicitly out of scope.
- **FR-016**: System MUST store attached files in the filesystem under a dedicated `/uploads` directory and serve them via an authenticated file endpoint that enforces the access rules in FR-013. SQLite BLOB storage and unauthenticated static file mounts are out of scope for v1.

### Key Entities *(include if feature involves data)*

- **Idea**: Represents a single innovation submission. Key attributes: unique ID, title (max 150 chars), description (max 3,000 chars), category, submitter (user reference), submission date/time, optional file attachment reference.
- **File Attachment**: Represents a file linked to an idea. Key attributes: original filename, stored path/reference, MIME type, file size, associated idea ID.
- **Category**: A fixed classification for ideas. Values: Process Improvement, Technology, Cost Saving, Other.
- **User** (existing, from 001-user-auth): Authenticated EPAM employee with role Submitter or Evaluator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Submitter can complete and submit an idea form in under 2 minutes from opening the form to receiving confirmation.
- **SC-002**: The ideas list loads and displays all submitted ideas in under 1 second for lists up to 500 ideas.
- **SC-003**: File upload validation (type and size checks) provides feedback to the user within 2 seconds of file selection, before form submission.
- **SC-004**: 100% of submitted ideas are correctly attributed to the submitting user — no attribution errors.
- **SC-005**: Evaluators are unable to access the submission form in any scenario (role enforcement is absolute — 0 bypass cases).
- **SC-006**: Unauthenticated access to any idea page redirects to login 100% of the time.
- **SC-007**: File downloads succeed for all authorized users (the idea's submitter and Evaluators) and are blocked for all other Submitters — 0 unauthorized file accesses permitted.

## Assumptions

- The authentication system from feature 001-user-auth is fully operational and provides role information (Submitter / Evaluator) for the session. No new auth work is required.
- Categories are a hardcoded enum (Process Improvement, Technology, Cost Saving, Other) for v1. Admin-managed categories are explicitly out of scope.
- File storage uses the filesystem (a dedicated `/uploads` directory). Whether this requires a new ADR is flagged as an open question; implementation assumes filesystem storage unless the ADR process produces a different decision.
- Allowed file types are PDF, DOCX, PNG, JPG with a maximum size of 10 MB per file.
- There is no edit or delete functionality for ideas in v1 — submissions are immutable once created.
- There is no status workflow (approval, rejection, voting, commenting) in v1.
- All submitted ideas are visible to all authenticated users — there are no private ideas.
- Pagination or infinite scroll may be implemented for the ideas list but is not a hard requirement for v1 if the total volume stays low during the bootcamp.
- Mobile responsiveness is assumed as a baseline requirement per EPAM portal standards but is not the primary test target.
- The Evaluator role is referred to interchangeably as "Admin" in the auth system; both terms refer to the same role.

## Clarifications

### Session 2026-05-13

- Q: After successful idea submission, where does the system redirect the Submitter? → A: Redirect to the submitted idea's detail page.
- Q: Who is authorized to download an idea's attached file? → A: Only the idea's original submitter and Evaluators (Admins); other Submitters are denied even if they can view the idea.
- Q: Maximum character limits for title and description fields? → A: Title ≤ 150 characters, description ≤ 3,000 characters.
- Q: Default sort order for the ideas list? → A: Newest first — descending by submission date.
