# Feature Specification: Multi-Stage Review Pipeline

**Feature Branch**: `007-multi-stage-review`

**Created**: 2026-05-14

**Status**: Draft

**Input**: User description: "Multi-Stage Review — 4-stage evaluation pipeline replacing the simple evaluation workflow (004-evaluation-workflow) with a structured 4-stage pipeline."

## Clarifications

### Session 2026-05-14

- Q: Should access control enforcement (FR-005, FR-009) apply at both the UI and API layers, or only one? → A: Both UI and API — action controls are hidden/disabled for unauthorized users; the API also rejects unauthorized requests independently.
- Q: What should the stage timeline show when an idea is still at "New Idea" with no review transitions? → A: Show "New Idea" as a greyed/pending first entry with no reviewer name or timestamp; completed stages appear as active entries below.
- Q: Should the `evaluation_status` column be dropped or retained after migration? → A: Drop after successful migration — clean break, no backward-compatibility retention period.
- Q: What reviewer value should be used for migrated "under_review" ideas that have no assigned admin? → A: NULL — leave `reviewed_by` as NULL; preserve the original evaluation comment in the `comment` field without modification.
- Q: Does SC-005 (stage timeline load time) require a separate performance SLA? → A: No separate SLA — since each idea has at most 4 stage review records (one per stage), data is inherently bounded; the timeline loads synchronously as part of the idea detail page response.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Advances Idea Through Stages (Priority: P1)

An admin visits an idea in the "New Idea" state and advances it to "Initial Screening," becoming the assigned admin. They optionally add a comment describing why it passed initial screening. They continue to advance the idea through Technical Review and Business Impact Assessment, adding comments at each stage. Other admins can view the idea and its full stage history but cannot take any actions.

**Why this priority**: This is the core workflow of the feature. Without the ability to advance ideas through stages, the entire pipeline is non-functional. Everything else depends on this working correctly.

**Independent Test**: Can be fully tested by logging in as an admin, opening an idea in "New Idea" state, and advancing it through all four stages — confirming that each transition is recorded as a permanent review record with comment, reviewer name, and timestamp.

**Acceptance Scenarios**:

1. **Given** an idea is in "New Idea" state and no admin is assigned, **When** Admin A advances it to "Initial Screening" with an optional comment, **Then** Admin A becomes the assigned admin, the idea moves to "Initial Screening," and a review record is created with the stage, comment, Admin A's name, and current timestamp.
2. **Given** Admin A is the assigned admin for an idea in "Initial Screening," **When** Admin A advances it to "Technical Review," **Then** the idea moves to "Technical Review," a new review record is appended (not overwritten), and the previous record remains intact.
3. **Given** Admin A is the assigned admin for an idea, **When** Admin B (a different admin) attempts to advance the idea, **Then** the API rejects the request and the UI shows no advance action controls for Admin B — they see a read-only view.
4. **Given** an idea is in any intermediate stage, **When** an admin attempts to skip stages (e.g., jump from "Initial Screening" to "Business Impact Assessment"), **Then** the action is rejected and the idea remains at its current stage.

---

### User Story 2 - Admin Completes Final Selection (Priority: P1)

The assigned admin advances an idea to "Final Selection" and must explicitly choose either "Accepted" or "Rejected." They may add an optional comment. After this action, the idea is permanently locked — no further stage changes or comments are possible.

**Why this priority**: The final selection is the terminal state that produces the outcome organizations care about (accepted or rejected ideas). It has equal priority to stage advancement because together they form the complete pipeline.

**Independent Test**: Can be fully tested by taking an idea to the "Business Impact Assessment" stage, then advancing to "Final Selection" with an explicit "Accepted" or "Rejected" choice, and confirming the idea is locked from further changes.

**Acceptance Scenarios**:

1. **Given** an idea is at "Business Impact Assessment" and the assigned admin advances to "Final Selection," **When** the admin chooses "Accepted" with an optional comment, **Then** a review record is created with outcome = "accepted," and no further stage advances or comments are permitted on that idea.
2. **Given** an idea is at "Business Impact Assessment" and the assigned admin advances to "Final Selection," **When** the admin chooses "Rejected" with an optional comment, **Then** a review record is created with outcome = "rejected," and the idea is permanently locked.
3. **Given** an idea is at "Final Selection" (locked), **When** any user attempts to add a comment or advance the stage, **Then** both the UI (controls absent) and the API (request rejected) prevent the action, and the user is informed the idea is finalized.
4. **Given** an admin is at the "Final Selection" transition, **When** the admin does not explicitly choose "Accepted" or "Rejected," **Then** the transition cannot be completed until an outcome is selected.

---

### User Story 3 - Idea Detail Page Shows Stage Timeline (Priority: P2)

A user visits the idea detail page and sees a chronological timeline showing all completed stage transitions. Each timeline entry shows the stage name, the reviewer's name, the timestamp, and the comment (if one was added). Ideas not yet advanced from "New Idea" show that stage as a greyed/pending first entry. The timeline replaces the previous single "evaluation comment" block.

**Why this priority**: Transparency into the review history is essential for trust and accountability. Without the timeline, the pipeline operates as a black box. This is P2 because the pipeline can function without full UI visibility, but visibility is required for the feature to be useful in practice.

**Independent Test**: Can be fully tested by advancing an idea through multiple stages (with and without comments), then viewing the idea detail page as different user roles and confirming the timeline shows the correct entries with appropriate visibility per role.

**Acceptance Scenarios**:

1. **Given** an idea has been advanced through three stages with comments on two of them, **When** the assigned admin views the idea detail page, **Then** a timeline shows all three completed stage entries in chronological order, each with stage name, reviewer name, timestamp, and comment (or blank if none was given).
2. **Given** an idea is still in "New Idea" with no review records, **When** any eligible viewer opens the idea detail page, **Then** the timeline shows a single greyed/pending "New Idea" entry with no reviewer name or timestamp.
3. **Given** an idea has stage review records, **When** the original submitter of the idea views the detail page, **Then** the full timeline is visible with all stage entries including comments.
4. **Given** an idea has stage review records, **When** a different submitter (not the idea's author) views the idea detail page, **Then** only the current stage label is shown — no timeline entries, no comments.
5. **Given** an idea has stage review records, **When** a non-assigned admin views the idea detail page, **Then** the full timeline is visible but no action controls (advance, comment) are present in the UI.

---

### User Story 4 - Migration from Previous Evaluation Workflow (Priority: P2)

All existing ideas retain their outcome and history after migration. Ideas previously marked "submitted" appear as "New Idea," ideas marked "under_review" appear at "Initial Screening" with their existing comment migrated as a stage review record, and ideas marked "accepted" or "rejected" appear at "Final Selection" with the appropriate outcome. After successful verification, the old `evaluation_status` column is dropped.

**Why this priority**: Without migration, existing data is lost or inconsistent, breaking trust. This is P2 because it is a one-time operation that must succeed before the feature goes live, but does not affect ongoing use after migration.

**Independent Test**: Can be fully tested by running the migration against a snapshot of production data and verifying that each existing idea maps to the correct new stage and that any existing evaluation comment is preserved as a stage review record.

**Acceptance Scenarios**:

1. **Given** an existing idea with `evaluation_status = "submitted"`, **When** the migration runs, **Then** the idea's `current_stage` is set to "New Idea" and no stage review records are created.
2. **Given** an existing idea with `evaluation_status = "under_review"` and an existing evaluation comment but no `assigned_admin_id`, **When** the migration runs, **Then** `current_stage` is set to "Initial Screening," a stage review record is created with the existing comment in the `comment` field, and `reviewed_by` is set to NULL.
3. **Given** an existing idea with `evaluation_status = "under_review"`, an existing evaluation comment, and a valid `assigned_admin_id`, **When** the migration runs, **Then** `current_stage` is set to "Initial Screening" and a stage review record is created with the existing comment and `reviewed_by` set to the existing assigned admin.
4. **Given** an existing idea with `evaluation_status = "accepted"`, **When** the migration runs, **Then** `current_stage` is set to "Final Selection" and a stage review record is created with `outcome = "accepted"`.
5. **Given** an existing idea with `evaluation_status = "rejected"`, **When** the migration runs, **Then** `current_stage` is set to "Final Selection" and a stage review record is created with `outcome = "rejected"`.
6. **Given** the migration has completed and all `current_stage` values have been verified, **When** the post-migration cleanup runs, **Then** the `evaluation_status` column is dropped from the ideas table.

---

### Edge Cases

- What happens if a comment exceeds 1000 characters? The system rejects the submission and prompts the user to shorten the comment — no truncation occurs silently.
- What happens if an assigned admin's account is deactivated mid-review? The idea remains locked to that admin; an alternate manual resolution path is out of scope for this feature.
- What happens if two admins simultaneously attempt to advance a "New Idea" to "Initial Screening" (race condition)? Only one assignment succeeds; the second request is rejected with a "this idea has already been assigned" message.
- What happens if a migration is run when some ideas already have `current_stage` populated? The migration is idempotent — it skips ideas that already have a `current_stage` value to avoid duplicate records.
- What happens when an idea has no assigned admin (it is still in "New Idea") and an admin views it? Any admin may view the idea and act on it (advancing to "Initial Screening" claims assignment).
- What does the stage timeline show when an idea is still at "New Idea" with no review records? The timeline shows "New Idea" as a single greyed/pending entry with no reviewer name or timestamp.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define five idea stages in sequential order: New Idea (0), Initial Screening (1), Technical Review (2), Business Impact Assessment (3), Final Selection (4).
- **FR-002**: System MUST prevent stage skipping — an idea can only advance one stage at a time and cannot move backward.
- **FR-003**: System MUST record a permanent review entry for every stage transition, capturing: the target stage, an optional plain-text comment (max 1000 characters), the acting admin, and the exact timestamp.
- **FR-004**: System MUST assign the first admin who advances an idea from "New Idea" to "Initial Screening" as the idea's assigned admin.
- **FR-005**: System MUST restrict all stage-advance and comment actions to the assigned admin only. This restriction MUST be enforced at both the UI layer (action controls are hidden or disabled for unauthorized users) and the API layer (unauthorized requests are rejected with an appropriate error). Other admins receive a read-only view.
- **FR-006**: System MUST require an explicit outcome selection ("Accepted" or "Rejected") when advancing to "Final Selection."
- **FR-007**: System MUST permanently lock an idea after Final Selection — no stage changes or new comments are permitted.
- **FR-008**: System MUST expose a stage timeline on the idea detail page showing all completed stage review records in chronological order. When an idea has no review records yet (still in "New Idea"), the timeline MUST display "New Idea" as a single greyed/pending entry with no reviewer name or timestamp.
- **FR-009**: System MUST enforce the following visibility rules for stage review records at both UI and API layers:
  - Assigned admin: full timeline visibility plus action access.
  - Other admins: full timeline visibility, read-only (no action controls in UI; API rejects write requests).
  - Original idea submitter: full timeline visibility, read-only.
  - All other authenticated users: current stage label only — no review record details.
- **FR-010**: System MUST migrate all existing ideas from the `evaluation_status` column to the new `current_stage` model using the defined mapping without data loss. After successful migration verification, the `evaluation_status` column MUST be dropped.
- **FR-011**: System MUST treat "New Idea" as the default stage for newly submitted ideas, replacing the previous "Submitted" status.
- **FR-012**: System MUST NOT allow comments to be edited or deleted after they are recorded.

### Key Entities *(include if feature involves data)*

- **Idea**: Represents an innovation submission. Gains a `current_stage` field (replacing `evaluation_status`) that tracks the idea's position in the review pipeline. Retains `assigned_admin_id` from the previous workflow.
- **Stage Review Record**: An immutable record of a single stage transition. Attributes: unique ID, reference to the idea, the target stage, optional comment (max 1000 chars), optional outcome ("accepted"/"rejected" — only set at Final Selection), reference to the admin who performed the action (nullable — NULL for migrated records with no original assigned admin), and timestamp of the action.
- **Stage** (enumerated value): One of: `new_idea`, `initial_screening`, `technical_review`, `business_impact_assessment`, `final_selection`.
- **Outcome** (nullable enumerated value on Stage Review Record): One of `accepted`, `rejected`, or null (null for all non-terminal stages).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every idea submitted after feature launch is assigned to "New Idea" stage automatically — zero ideas incorrectly start at a different stage.
- **SC-002**: 100% of stage transitions produce a permanent, immutable review record — no transition is recorded without a corresponding entry in the history.
- **SC-003**: Admins can advance an idea through all four stages and reach Final Selection within a single browser session without page errors or data loss.
- **SC-004**: Non-assigned admins and submitters of other ideas cannot trigger any write action on an idea — all unauthorized action attempts are rejected at both the UI and API layers with a clear message.
- **SC-005**: The stage timeline loads synchronously as part of the idea detail page response — no separate async fetch is required. Since each idea has at most 4 stage review records (one per pipeline stage), no additional performance SLA beyond the existing page load time applies.
- **SC-006**: 100% of existing ideas are correctly migrated to the new stage model — zero ideas lose their previous outcome or evaluation comment after migration.
- **SC-007**: The comment field enforces the 1000-character limit on submission — no over-length comment is persisted in the system.

## Assumptions

- The `assigned_admin_id` column already exists on the ideas table from the previous evaluation workflow (004-evaluation-workflow) and requires no schema change beyond reuse.
- The portal supports at least two distinct user roles: "admin" and "submitter." No other roles are introduced by this feature.
- Submitters can only view ideas they themselves created (existing access control); this feature does not change who can see which ideas, only what review data is shown to eligible viewers.
- The migration is a one-time, offline database operation run before the feature goes live. It does not need to handle live traffic.
- After the migration is verified complete, the `evaluation_status` column is dropped from the ideas table — no backward-compatibility retention period.
- For migrated "under_review" ideas with no `assigned_admin_id`, `reviewed_by` on the created stage review record is set to NULL. The original evaluation comment is preserved in the `comment` field unchanged.
- Email or push notifications on stage transitions are explicitly out of scope for this feature.
- Admin reassignment (changing the assigned admin after locking-in) is explicitly out of scope.
- Only the assigned admin's name is shown in the stage timeline — no avatar, profile link, or contact information is required.
- "Timestamp" means the server-recorded UTC time of the transition; timezone display for the UI follows the portal's existing convention.
