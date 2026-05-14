# Feature Specification: Multi-Media Attachments

**Feature Branch**: `006-multimedia-attachments`

**Created**: 2026-05-14

**Status**: Draft

**Input**: User description: "Multi-Media Support — allow idea submitters to attach one or more files (documents, prototypes, mockups, videos, presentations) when submitting an idea, and display the attachments with a visual preview on the idea detail page."

---

## Clarifications

### Session 2026-05-14

- Q: If some — but not all — files fail to save during submission, should the submission be rejected entirely or saved with whatever succeeded? → A: All-or-nothing — if any file fails to save, the entire submission is rejected and the user must retry.
- Q: Who is authorised to download attached files? → A: Only the original submitter and users with an admin role may download attachments.
- Q: What feedback does the user receive while files are being uploaded during form submission? → A: The submit button enters a disabled/loading state for the duration of the upload; no per-file progress granularity is required.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Attach Files During Idea Submission (Priority: P1)

An idea submitter fills out the idea submission form and, before submitting, uses an attachment control to select one or more files from their device. The system validates each file's type and the running total size, then displays a preview tile for each accepted file. The submitter can then submit the idea; the attached files are saved together with the idea record.

**Why this priority**: Without the ability to attach files at submission time, the entire feature has no value. This is the core action from which all other scenarios derive.

**Independent Test**: Can be fully tested by submitting an idea with one or more attachments and verifying that the idea record and files are saved; delivers the minimum viable version of the feature.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the idea submission form, **When** they select one or more files of supported types whose combined size is within the 50 MB limit, **Then** each file appears as a preview tile in the form and the idea is successfully submitted with those files attached.
2. **Given** a logged-in user on the idea submission form, **When** they attempt to select a file of an unsupported type (e.g., `.exe`, `.zip`), **Then** the system rejects the file and displays a clear error message listing the accepted file types.
3. **Given** a logged-in user who has already selected 5 files, **When** they attempt to add a sixth file, **Then** the system prevents the addition and informs the user that the maximum of 5 attachments per submission has been reached.
4. **Given** a logged-in user whose selected files already total more than 50 MB, **When** they attempt to add another file that would exceed the limit, **Then** the system rejects the additional file and displays a message indicating the total size limit.
5. **Given** a submitter who has attached one or more files and clicks Submit, **When** the idea and files are being saved, **Then** the submit button is disabled and shows a loading indicator for the duration of the operation; the form cannot be submitted a second time until the operation completes or fails.

---

### User Story 2 — Preview and Remove Attachments Before Submitting (Priority: P2)

After selecting files, the submitter reviews the preview tiles and decides to remove one or more files before submitting. Each tile for an image shows a small thumbnail; tiles for all other file types show a file-type icon alongside the filename. Each tile has a remove action. Removing a tile does not affect the rest of the form.

**Why this priority**: Submitters make mistakes — selecting the wrong file is common. Without the ability to remove individual files, they cannot correct errors without abandoning the entire form, significantly degrading usability.

**Independent Test**: Can be fully tested by selecting multiple files, removing one via its tile, and verifying that the remaining files and all other form data are unchanged.

**Acceptance Scenarios**:

1. **Given** a submitter who has attached at least one image file, **When** the attachment tile is displayed, **Then** the tile shows a thumbnail preview of the image alongside the filename.
2. **Given** a submitter who has attached a non-image file (PDF, video, presentation, or document), **When** the attachment tile is displayed, **Then** the tile shows a file-type icon and the filename (no thumbnail).
3. **Given** a submitter who has attached two or more files, **When** they remove one file using the tile's remove action, **Then** that file's tile disappears, the remaining tiles are unchanged, and all other form fields retain their values.

---

### User Story 3 — View Attachments on the Idea Detail Page (Priority: P3)

Any user viewing an idea's detail page can see the attachments section listing all files submitted with that idea. Images are displayed inline. Non-image files (PDF, video, presentation, document) appear as a file-type icon with the filename. A download link for non-image files is visible and functional only for the original submitter and users with an admin role; other visitors see the attachment metadata but no download action. Ideas that were submitted before this feature existed show no attachment section (or an empty state), and the page renders without errors.

**Why this priority**: Visibility of attachments is the output-side of the feature. Without this, attached files are inaccessible to evaluators and collaborators — the feature delivers no value beyond submission.

**Independent Test**: Can be fully tested by opening the detail page of an idea that has attachments and verifying that each file type renders correctly; separately, opening a legacy idea (no attachments) verifies backward compatibility.

**Acceptance Scenarios**:

1. **Given** an idea was submitted with one or more image attachments, **When** any user views that idea's detail page, **Then** each image is rendered inline within the attachments section.
2. **Given** an idea was submitted with one or more non-image attachments (PDF, video, presentation, or document), **When** the original submitter or an admin views that idea's detail page, **Then** each file appears with its file-type icon, filename, and a functional download link.
3. **Given** an idea was submitted with one or more non-image attachments, **When** a user who is neither the submitter nor an admin views the idea's detail page, **Then** each non-image attachment shows its file-type icon and filename but no download link.
4. **Given** an idea that was submitted before this feature was introduced (no attachments), **When** any user views that idea's detail page, **Then** the page loads without errors and either shows an empty attachments section or no attachments section at all.
5. **Given** an idea with multiple attachments of mixed types, **When** the original submitter or an admin views the detail page, **Then** all attachments are listed — images inline and non-images as icon + filename + download link.

---

### Edge Cases

- What happens when a user selects a file that is individually larger than 25 MB (the assumed per-file cap)?
- How does the system handle a network interruption during file upload at form submission?
- What is displayed if a stored attachment file is missing from the server filesystem when a user opens the idea detail page?
- If any file fails to save during submission, the entire submission is rejected (all-or-nothing); the user is shown an error and must retry the full submission.
- How does the attachment area behave when JavaScript is disabled? (Out of scope — assumed modern browser required.)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Submitters MUST be able to select and attach one or more files to an idea using a file-selection control embedded in the idea submission form.
- **FR-002**: The system MUST accept only the following file types: PNG, JPG, GIF (images); PDF; MP4, MOV (video); PPTX, PPT (presentations); DOCX, DOC (documents). Any other type MUST be rejected with a descriptive error.
- **FR-003**: The system MUST enforce a maximum of 5 attached files per submission. Attempts to add a sixth file MUST be prevented with a clear message.
- **FR-004**: The system MUST enforce a maximum combined file size of 50 MB per submission. Files that would exceed this total MUST be rejected with a clear message.
- **FR-005**: For each attached image file (PNG, JPG, GIF), the form MUST display a thumbnail preview tile before submission.
- **FR-006**: For each attached non-image file, the form MUST display a tile containing a file-type icon and the filename before submission.
- **FR-007**: Each attachment tile MUST provide an individual remove action that deletes only that file's tile without affecting other tiles or any other form field.
- **FR-008**: The system MUST store uploaded files on the server filesystem upon idea submission.
- **FR-009**: The system MUST persist the following metadata for each attachment: original filename, MIME type, file size in bytes, and server-side stored filename (from which the full storage path is derived via `settings.upload_path(idea_id, stored_name)`), associated with the parent idea record.
- **FR-010**: The idea detail page MUST display attached images inline within an attachments section.
- **FR-011**: The idea detail page MUST display non-image attachments (PDF, video, presentation, document) as a file-type icon and the original filename to all viewers. A download link MUST be shown only to the original submitter and admin users.
- **FR-016**: The system MUST enforce download access at the point the download is requested — not only by hiding the link in the UI. A request to download an attachment by an unauthorised user MUST be denied with an appropriate access-denied response.
- **FR-012**: Ideas submitted before this feature was introduced MUST render the detail page without errors; the absence of attachments MUST not cause failures.
- **FR-013**: Attachments MUST be read-only after submission; editing, replacing, or deleting individual attachments after submission is not supported in this feature.
- **FR-014**: The attachment capability applies only to new idea submissions; retroactive attachment to existing ideas is not supported.
- **FR-015**: File saving and idea record creation MUST be treated as a single atomic operation. If any attachment fails to save, the entire submission MUST be rolled back and the user MUST be shown an error message prompting them to retry.
- **FR-017**: While the idea submission (including file uploads) is in progress, the submit button MUST be disabled and display a loading indicator. The form MUST NOT be submittable a second time until the current operation completes or fails.

### Key Entities

- **Idea**: The existing entity being extended; a single idea may have zero or more attachments associated with it.
- **Attachment**: Represents one uploaded file linked to an idea. Key attributes: original filename, MIME type, file size (bytes), server-side storage path, and reference to the parent idea. An attachment is created at submission time and never modified.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Submitters can attach up to 5 files during a single idea submission without leaving the form or reloading the page.
- **SC-002**: File-type or size-limit validation feedback is displayed immediately (synchronous client-side state update) when a rejected file is selected; no network round-trip is required, so the 2-second threshold is inherently satisfied and does not require a dedicated performance test.
- **SC-003**: Preview tiles appear for all accepted attached files before the form is submitted; image tiles show a visual thumbnail and non-image tiles show a recognisable file-type icon and filename.
- **SC-004**: All attachment files and their metadata are accessible on the idea detail page immediately after the idea is submitted, with no additional user action required.
- **SC-005**: 100% of existing ideas (submitted before this feature) continue to load the detail page without errors.
- **SC-006**: Submitters can remove any individual attached file from the form without losing data entered in any other form field.
- **SC-007**: Submissions with attachments totalling up to 50 MB complete successfully under normal network conditions.

---

## Assumptions

- Only authenticated users who are authorised to submit ideas may attach files; no additional permission layer is introduced by this feature.
- There is no enforced per-file size limit beyond the 50 MB total; the system validates only the combined total at the point of submission.
- Video playback directly in the browser is out of scope; video files (MP4, MOV) are represented on the detail page by an icon, filename, and download link only.
- The idea submission form already exists (introduced in feature 005); attachment controls are added to that existing form without replacing it.
- No virus or malware scanning of uploaded files is required within this feature scope.
- Attachments cannot be added to an idea after it has been submitted; this is deferred to a future "edit idea" feature.
- The server-side storage directory for attachments is configured by the platform administrator and is not user-configurable.
- A modern, JavaScript-enabled browser is assumed; no progressive-enhancement fallback for file upload is required.
- Duplicate filenames within the same submission are allowed; the system disambiguates stored files internally (e.g., by appending a unique identifier to the stored filename), but the original filename is always preserved in metadata and displayed to users.
