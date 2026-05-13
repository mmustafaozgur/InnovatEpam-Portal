# Feature Specification: Smart Submission Forms

**Feature Branch**: `005-smart-submission-forms`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "Smart Submission Forms — dynamically adapting category-specific fields on the idea submission form"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Idea With Category-Specific Fields (Priority: P1)

A submitter opens the idea submission form, selects a category, and immediately sees a set of extra fields relevant only to that category appear below the description. The submitter fills in all required extra fields and submits the idea. All extra data is saved alongside the idea and appears correctly on the detail page.

**Why this priority**: This is the core user-facing value of the feature. Without it, the richer, structured data capture that the portal needs for evaluation and reporting is impossible.

**Independent Test**: Can be fully tested by submitting a new idea in each of the 7 categories, verifying that the correct extra fields appear, that required fields are enforced, and that the saved idea shows correct extra data on the detail page.

**Acceptance Scenarios**:

1. **Given** the submission form is open and no category is selected, **When** the submitter selects "process_improvement", **Then** the fields "Target Process" (required, max 200 chars) and "Estimated Time Saved per Week" (optional, number) appear immediately below the description without a page reload.
2. **Given** the submission form is open and "technology" is selected, **When** the submitter submits the form with "Technology / Tool Name" left empty, **Then** submission is blocked and an inline error is shown on that field.
3. **Given** the submitter has filled in all required and optional extra fields for "cost_saving" and submits, **When** the idea is saved, **Then** both "Current Annual Cost (USD)" and "Projected Annual Saving (USD)" are stored and visible on the idea detail page under a "Details" section.
4. **Given** the submitter selects "other", **When** the form is displayed, **Then** no extra fields appear and the idea can be submitted without any extra data.

---

### User Story 2 - Switch Categories Clears Previous Fields (Priority: P2)

A submitter selects one category, partially fills in its extra fields, then changes their mind and picks a different category. The previous category's fields disappear and the new category's fields appear fresh and empty.

**Why this priority**: Without correct clearing behavior, a submitter could inadvertently submit stale extra data from a previous category selection, corrupting the idea's structured data.

**Independent Test**: Can be fully tested by selecting any category, entering values in extra fields, switching to another category, and verifying the previous fields are gone and the new fields are empty.

**Acceptance Scenarios**:

1. **Given** the submitter has selected "talent_development" and entered text in "Target Audience", **When** they change the category to "client_delivery", **Then** the "talent_development" fields disappear, all entered values are cleared, and only "Affected Delivery Phase" and "Client Impact" appear.
2. **Given** the submitter has selected "workplace_culture", **When** they switch to "other", **Then** all extra fields disappear and no extra data is retained for the form submission.
3. **Given** the submitter has selected "other", **When** they switch to "technology", **Then** "Technology / Tool Name" and "Affected Systems or Teams" appear immediately, both empty.

---

### User Story 3 - View Extra Data on Idea Detail Page (Priority: P2)

A reviewer or submitter opens the detail page of an idea that has extra data. The extra fields are shown in a dedicated "Details" section with clear, human-readable labels.

**Why this priority**: Extra data is only useful if it is surfaced clearly to reviewers and evaluators. Without proper rendering, the richer structured data is invisible.

**Independent Test**: Can be fully tested by viewing the detail page of ideas submitted under each of the 7 categories and verifying that extra data appears with correct labels in a "Details" section.

**Acceptance Scenarios**:

1. **Given** an idea was submitted under "cost_saving" with both extra fields populated, **When** any user views the idea detail page, **Then** a "Details" section appears showing "Current Annual Cost (USD)" and "Projected Annual Saving (USD)" with their saved values and human-readable labels.
2. **Given** an idea was submitted under "other" (with null extra_data), **When** any user views the idea detail page, **Then** no "Details" section is shown (or it is shown as empty gracefully), and no error occurs.
3. **Given** an idea that existed before this feature was introduced (null extra_data), **When** any user views the idea detail page, **Then** the page renders correctly without errors.

---

### User Story 4 - Inline Validation on Required Extra Fields (Priority: P2)

A submitter fills in some but not all required extra fields and attempts to submit. Submission is blocked and each missing required field shows an inline error message.

**Why this priority**: Inline errors are the standard quality gate that ensures structured data is complete before storage. Omitting validation would allow incomplete ideas to reach reviewers.

**Independent Test**: Can be fully tested by attempting to submit an idea under each category that has required extra fields while leaving each required field blank, and verifying that submission is blocked and an inline error is shown for each missing field.

**Acceptance Scenarios**:

1. **Given** the "talent_development" category is selected and "Target Audience" is left blank, **When** the submitter tries to submit, **Then** submission is blocked and "Target Audience" shows an inline required-field error.
2. **Given** the "cost_saving" category is selected and "Projected Annual Saving (USD)" is left blank (it is required), **When** the submitter tries to submit, **Then** submission is blocked with an inline error on that field.
3. **Given** all required extra fields are filled in and optional fields are left empty, **When** the submitter submits the form, **Then** the idea is saved successfully.

---

### User Story 5 - Extra Data in API Responses (Priority: P3)

A consumer of the API (e.g., the frontend or an external client) retrieves the idea list or a single idea. The `extra_data` field is present in both responses, containing the structured extra fields for the idea or null if none were provided.

**Why this priority**: The frontend and any API consumers rely on the API contract. Without extra_data in the responses, the detail page cannot render the "Details" section.

**Independent Test**: Can be fully tested by querying the list endpoint and the detail endpoint after submitting ideas with and without extra data, and verifying the `extra_data` field is present and correct in both responses.

**Acceptance Scenarios**:

1. **Given** an idea was submitted with extra data, **When** the list API is queried, **Then** each idea in the response includes an `extra_data` field containing the saved values.
2. **Given** an idea was submitted with extra data, **When** the detail API is queried for that idea, **Then** the response includes the full `extra_data` object.
3. **Given** an idea with null extra_data is fetched from the API, **Then** `extra_data` is returned as `null` (not omitted).

---

### Edge Cases

- What happens when a submitter enters a non-numeric value into a number field (e.g., "Estimated Time Saved per Week")?
- What happens when a text field value exactly matches the maximum character limit (200 or 300 chars)?
- What happens when a text field value exceeds the maximum character limit?
- What happens when the "Recurring or One-Time" select in workplace_culture receives no selection?
- How does the system handle an idea whose category was renamed or removed after submission (data integrity)?
- What if an optional number field is submitted as an empty string vs. null — are they treated equivalently?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The submission form MUST dynamically display the correct set of extra fields immediately upon category selection, without a page reload.
- **FR-002**: Switching the selected category MUST instantly clear all previously entered extra field values and replace the fields with those belonging to the newly selected category.
- **FR-003**: If "other" is selected, no extra fields MUST appear; `extra_data` for such ideas MUST be null.
- **FR-004**: Required extra fields MUST prevent form submission and display an inline error when left empty or invalid.
- **FR-005**: Optional extra fields MUST allow submission when left empty; their absence MUST NOT block form submission.
- **FR-006**: Text extra fields MUST enforce a hard character cap: the field MUST stop accepting further input once the maximum is reached (200 or 300 characters respectively). A live character counter MUST be shown so the submitter can see how many characters remain.
- **FR-007**: Number extra fields MUST reject non-numeric input and display an inline error.
- **FR-008**: The "Recurring or One-Time" select field for the `workplace_culture` category MUST offer exactly two options: "Recurring" and "One-Time".
- **FR-009**: Extra data for a submitted idea MUST be persisted as structured data alongside the idea.
- **FR-010**: Extra data MUST be returned as the full `extra_data` object in both the idea list API response (per idea entry) and the idea detail API response. The list endpoint MUST NOT truncate or omit `extra_data`.
- **FR-011**: The idea detail page MUST render a "Details" section showing all extra fields with human-readable labels when `extra_data` is present.
- **FR-012**: The idea detail page MUST render without errors when `extra_data` is null, including for ideas created before this feature was introduced.
- **FR-014**: The submission endpoint MUST independently validate `extra_data` server-side — rejecting requests with missing required fields, incorrect value types, or values exceeding character limits. Error responses MUST be structured per-field (a map of field name → error message) so the form layer can display server-side errors inline alongside client-side validation errors. Client-side validation alone is insufficient.
- **FR-013**: Each category's required and optional fields MUST match the specification exactly:
  - **process_improvement**: "Target Process" (text, required, max 200 chars), "Estimated Time Saved per Week" (number, optional)
  - **technology**: "Technology / Tool Name" (text, required, max 200 chars), "Affected Systems or Teams" (text, optional, max 300 chars)
  - **cost_saving**: "Current Annual Cost (USD)" (number, optional), "Projected Annual Saving (USD)" (number, required)
  - **talent_development**: "Target Audience" (text, required, max 200 chars), "Skill Area" (text, required, max 200 chars), "Estimated Duration in Hours" (number, optional)
  - **client_delivery**: "Affected Delivery Phase" (text, required, max 200 chars), "Client Impact" (text, required, max 300 chars)
  - **workplace_culture**: "Target Group" (text, required, max 200 chars), "Recurring or One-Time" (select: recurring/one_time, required)
  - **other**: no extra fields

### Key Entities *(include if feature involves data)*

- **Idea**: The core submission entity. Gains a new `extra_data` attribute that holds the category-specific supplementary information as structured data, or null if no extra fields apply.
- **CategoryFieldSchema**: The definition of extra fields per category — each entry describes a field's label, input type (text, number, select), constraints (max length, allowed values), and whether it is required. This schema drives both the dynamic form rendering and server-side validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extra fields for the selected category appear within 200 ms of the submitter changing the category selection, with no page reload.
- **SC-002**: 100% of required extra fields are enforced — no idea with a missing required extra field can be submitted through the form or the API.
- **SC-003**: Extra data survives the full round-trip — all values entered at submission time appear unchanged and with correct labels on the idea detail page.
- **SC-004**: The idea detail page renders without a JavaScript error for 100% of ideas with null extra_data, including pre-existing ideas.
- **SC-005**: Switching categories takes effect instantly (no perceptible delay or flicker); any visual transition uses Tailwind/shadcn/ui default CSS transitions — no custom animation is in scope for this feature.
- **SC-006**: 100% of API responses for idea list and idea detail include the `extra_data` field, either with structured data or as null.

## Assumptions

- The 7 listed categories (process_improvement, technology, cost_saving, talent_development, client_delivery, workplace_culture, other) are the complete, fixed set; no new categories will be added as part of this feature.
- The category field schema (fields, types, labels, constraints) is static and does not need runtime configurability for this feature.
- Existing ideas in the database that predate this feature will have null extra_data, and this is a valid, expected state.
- The form validation for extra fields follows the same user-facing error display patterns already established for other form fields on the submission form.
- The list API response includes extra_data to support future filtering or summary display; full extra_data payloads in list responses are acceptable given the anticipated idea volume.
- Optional number fields left empty at submission time are stored as null (not zero).
- The "Recurring or One-Time" select field stores the internal key (recurring / one_time), and the detail page renders the human-readable label.
- Idea editing is out of scope for this feature; `extra_data` is write-once at creation time. An idea's category and extra fields cannot be changed after submission.

## Clarifications

### Session 2026-05-13

- Q: Should server-side validation of extra_data be in scope — i.e., does the API MUST reject a request with invalid extra_data even if it bypasses the form? → A: Yes — the server MUST independently validate extra_data and reject invalid payloads with descriptive errors (FR-014).
- Q: Is editing an existing idea (including changing its category and extra_data) in scope for this feature? → A: Out of scope — editing is excluded; extra_data is write-once at creation. Category cannot be changed after submission.
- Q: How should text extra fields enforce character limits — hard cap (prevent typing beyond limit) or soft validation (error on submit)? → A: Hard cap — field stops accepting input at the maximum and shows a live character counter (FR-006).
- Q: Should the idea list API return full extra_data per entry or a truncated/absent payload? → A: Full payload — the complete extra_data object MUST be included in list responses per idea entry (FR-010).
- Q: Should server-side extra_data validation errors be per-field structured or a single generic message? → A: Per-field structured (field name → error message map) so the form can display server errors inline, consistent with client-side validation (FR-014).
