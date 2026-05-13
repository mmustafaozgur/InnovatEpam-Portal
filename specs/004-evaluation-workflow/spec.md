# Feature Specification: Evaluation Workflow

**Feature Branch**: `004-evaluation-workflow`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "Add a simple evaluation lifecycle to the idea submission system with status tracking, admin evaluation actions, visibility rules, and status filtering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Evaluates a Submitted Idea (Priority: P1)

An admin opens an idea that has been submitted and assigns it an evaluation status to begin or conclude the review process. The admin may optionally attach a written comment explaining the decision. The action is saved immediately with a timestamp.

**Why this priority**: This is the core of the feature. Without the ability to evaluate ideas, none of the downstream visibility or filtering behaviours have meaning. Every other story depends on at least one evaluation having taken place.

**Independent Test**: Can be fully tested by submitting an idea as a regular user, then logging in as an admin and evaluating it — the new status and comment appear on the idea detail page.

**Acceptance Scenarios**:

1. **Given** an idea in "submitted" status, **When** an admin changes its status to "under review" with an optional comment, **Then** the idea's status updates to "under review", the comment is saved, and the evaluation timestamp is recorded.
2. **Given** an idea in "under review" status, **When** an admin changes its status to "accepted" with a comment, **Then** the idea's status updates to "accepted", the comment is saved, and the evaluation timestamp is updated.
3. **Given** an idea in "under review" status, **When** an admin changes its status to "rejected" with a comment, **Then** the idea's status updates to "rejected" and the comment is visible to all users.
4. **Given** an idea in "submitted" status, **When** an admin attempts to change its status directly to "accepted" (skipping "under review"), **Then** the system rejects the action with a clear error message.
5. **Given** an idea in "accepted" status, **When** an admin attempts to change its status, **Then** the system rejects the action and indicates the idea is locked.
6. **Given** an idea in "rejected" status, **When** an admin attempts to change its status, **Then** the system rejects the action and indicates the idea is locked.

---

### User Story 2 - Status and Comment Visibility for All Users (Priority: P2)

A regular user (submitter) views their submitted idea and can see its current status. Depending on the status, they may also see the admin's evaluation comment.

**Why this priority**: Submitters need feedback on their ideas. The visibility rules directly affect whether users trust the platform — seeing a status update (even just "under review") closes the feedback loop. This is a high-value, low-complexity story.

**Independent Test**: Can be tested by submitting an idea, having an admin evaluate it to each of the four statuses in turn, and verifying which information is visible on the idea detail page for the submitter.

**Acceptance Scenarios**:

1. **Given** an idea with status "submitted", **When** the submitter views the idea detail page, **Then** they see the "Submitted" status badge and no evaluation comment.
2. **Given** an idea with status "under review" and an admin comment present, **When** the submitter views the idea detail page, **Then** they see the "Under Review" status badge and the text "Under review" with no comment shown.
3. **Given** an idea with status "under review" and an admin comment present, **When** an admin views the same idea detail page, **Then** they see the "Under Review" status badge and the full evaluation comment.
4. **Given** an idea with status "accepted" and an evaluation comment, **When** the submitter views the idea detail page, **Then** they see the "Accepted" status badge and the full evaluation comment.
5. **Given** an idea with status "rejected" and an evaluation comment, **When** the submitter views the idea detail page, **Then** they see the "Rejected" status badge and the full evaluation comment.
6. **Given** an idea list page, **When** any authenticated user views it, **Then** each idea displays its current status badge.

---

### User Story 3 - Filter Ideas by Status (Priority: P3)

A user (admin or submitter) wants to see only ideas in a specific stage of the evaluation lifecycle and applies a status filter to the ideas list.

**Why this priority**: As the number of ideas grows, filtering becomes essential for admins to manage their review queue and for submitters to track outcomes. It builds on top of the existing list feature without requiring P1 or P2 to be complete first.

**Independent Test**: Can be fully tested by seeding ideas with different statuses and verifying that the ideas list returns only ideas matching the selected status when the filter is applied.

**Acceptance Scenarios**:

1. **Given** a mix of ideas with different statuses, **When** a user filters the list by "submitted", **Then** only ideas with "submitted" status are shown.
2. **Given** a mix of ideas, **When** a user filters by "accepted", **Then** only accepted ideas are shown.
3. **Given** a user who has applied the "My Ideas" filter, **When** they also apply the "accepted" status filter, **Then** only their own accepted ideas are shown (both filters applied together).
4. **Given** no ideas match the selected status filter, **When** the filter is applied, **Then** the list shows an empty state with a meaningful message.
5. **Given** no status filter is applied, **When** the ideas list loads, **Then** all ideas are shown regardless of status (existing default behaviour is unchanged).

---

### Edge Cases

- What happens when an admin submits an evaluation with no status change (only a comment update while the idea is still "under review")? The comment is updated and the timestamp refreshed, but the status stays "under review".
- What happens if an admin submits an empty evaluation comment? The comment field is treated as absent; any previously saved comment is cleared.
- What happens when a non-admin user attempts to evaluate an idea (e.g., via direct URL manipulation)? The system rejects the request and returns a permission error.
- What happens when an admin (not the assigned admin) attempts to evaluate an idea already in "Under Review"? The system rejects the request with a permission error indicating the idea is assigned to another evaluator.
- What happens if two admins try to pick up the same "Submitted" idea simultaneously (race to assign)? The first write wins; the second is rejected because the idea will no longer be in "Submitted" status by the time the second request is processed.
- What happens to ideas created before this feature is deployed? They receive "submitted" as their default status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every idea MUST have a status field visible to all authenticated users; the status MUST be shown on both the ideas list and the idea detail page.
- **FR-002**: The status of a newly created idea MUST default to "submitted".
- **FR-003**: The four valid status values are: **Submitted**, **Under Review**, **Accepted**, **Rejected**.
- **FR-004**: Only admins MUST be permitted to initiate an evaluation. When an admin moves an idea from "Submitted" to "Under Review", that idea is **assigned** to that admin. After assignment, only the **assigned admin** may perform any further evaluation actions (comment updates, status transitions to Accepted or Rejected) on that idea; all other admins MUST be blocked from evaluating it.
- **FR-005**: Status transitions MUST follow this sequence only: Submitted → Under Review → Accepted OR Rejected. No backwards transitions and no skipping steps are allowed.
- **FR-006**: Once an idea reaches "Accepted" or "Rejected" status, it MUST be permanently locked; no further status changes or comment updates are permitted.
- **FR-007**: Admins MUST be able to attach an optional evaluation comment (plain text, maximum 1,000 characters) when performing a status change.
- **FR-008**: The assigned admin MUST be able to update the evaluation comment on an "Under Review" idea without changing its status; each update refreshes the evaluation timestamp. In the UI, this is done via the **single evaluation form** where the status field is pre-filled with "Under Review" and is non-editable in this context — only the comment field is editable.
- **FR-009**: The evaluation comment and new status MUST be saved atomically together; the date and time of the evaluation action MUST be recorded.
- **FR-010**: When an idea is "Accepted" or "Rejected", the evaluation comment MUST be visible to all authenticated users (admin and submitter).
- **FR-011**: When an idea is "Under Review", the evaluation comment MUST be visible only to admins; submitters MUST see the status label "Under review" with no comment displayed.
- **FR-012**: The ideas list MUST support optional filtering by status using a query parameter. In the UI, this filter MUST be presented as a **dropdown/select menu** (e.g., "All statuses ▾") placed in the filter bar alongside the existing "My Ideas" toggle; selecting a single status value filters the list to that status only.
- **FR-013**: The status filter MUST operate independently alongside the existing "My Ideas" filter; both filters MUST be combinable and applied as a logical AND.

### Key Entities

- **Idea Status**: A lifecycle label assigned to every idea. Possible values: Submitted (default), Under Review, Accepted, Rejected. Determines what actions may be taken and what information is visible to each user role.
- **Evaluation Action**: A record of an admin's decision on an idea. Captures the new status, an optional free-text comment (≤ 1,000 characters), and the timestamp when the action was recorded. Replaces (not appends to) the previous evaluation record on the same idea.
- **Assigned Admin**: The admin who first moves an idea to "Under Review". From that point on, only the assigned admin may perform evaluation actions on that idea. Assignment is recorded as `assigned_admin_id` on the idea row and is set once; it cannot be changed or reassigned.

### Data Model

Evaluation data is stored as **inline columns on the `ideas` table** — no separate table. The following columns are added to `ideas`:

| Column | Type | Notes |
|--------|------|-------|
| `evaluation_status` | enum / varchar | One of the four status values; defaults to `submitted` |
| `evaluation_comment` | text / varchar(1000) | Optional; nullable; overwritten on each evaluation action |
| `evaluated_at` | timestamp | Set/refreshed on each evaluation action; null until first evaluation |
| `assigned_admin_id` | FK → users | Set to the acting admin's ID when idea moves to "Under Review"; null until then |

A database index on `evaluation_status` is required to keep status-filter queries performant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can complete a full idea evaluation (status change plus optional comment) in under 30 seconds from opening the idea detail page.
- **SC-002**: All authenticated users see the correct, up-to-date status badge on every idea on first page load with no additional interaction required.
- **SC-003**: 100% of status change attempts that violate the allowed transition rules are rejected with a clear, human-readable error message.
- **SC-004**: 100% of evaluation attempts on a terminal-state idea (Accepted or Rejected) are blocked regardless of the requestor's role.
- **SC-005**: The ideas list returns correctly filtered results in **under 500 ms** when any status filter is applied, with no cross-contamination between the status filter and the "My Ideas" filter.
- **SC-006**: Evaluation comments are never exposed to submitters while an idea is in "Under Review" status in any view (list or detail).

## Assumptions

- The existing authentication system already distinguishes admin users from regular submitters; this feature reuses those roles without modification.
- Admins may update a comment multiple times before an idea reaches a terminal state; each update overwrites the previous comment — no history of intermediate comments is retained.
- The evaluation timestamp records the most recent evaluation action only, not a full audit trail of all state changes.
- An admin can update the evaluation comment on an "Under Review" idea without changing the status; this is treated as a valid evaluation action.
- Ideas created before this feature is deployed will have their status defaulted to "Submitted" as part of the migration.
- Status filtering is additive with the existing "My Ideas" filter (logical AND), not a replacement for it.
- The evaluate action is restricted to an endpoint dedicated solely to evaluation; it does not affect other idea attributes (title, description, etc.).
- A database index on the status column is required to keep filtering performant as the idea volume grows.
- No notification mechanism (email, in-app alert) is triggered when an idea's status changes; this is explicitly out of scope.
- Out of scope: scoring rubrics, multi-reviewer workflows, email notifications, public comments or discussion threads.

## Clarifications

### Session 2026-05-13

- Q: How should the Evaluation Action be persisted in the database? → A: Inline columns (`evaluation_status`, `evaluation_comment`, `evaluated_at`) added directly to the `ideas` table; no separate evaluations table.
- Q: How should concurrent evaluation by multiple admins be handled? → A: Only the admin who moves an idea to "Under Review" is assigned as its evaluator; all other admins are blocked from evaluating that idea thereafter. Concurrent pick-up of the same "Submitted" idea is resolved by first-write-wins (the second request is rejected due to state mismatch).
- Q: How should the status filter appear in the ideas list UI? → A: Dropdown/select menu (e.g., "All statuses ▾") in the filter bar alongside the existing "My Ideas" toggle; single-status selection only.
- Q: What is the target response time for a filtered ideas list request (SC-005)? → A: Under 500 ms.
- Q: How should the UI handle a comment-only update on an "Under Review" idea (FR-008)? → A: Single evaluation form with status pre-filled and locked to "Under Review"; only the comment field is editable.
