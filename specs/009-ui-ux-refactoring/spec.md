# Feature Specification: UI/UX Refactoring

**Feature Branch**: `009-ui-ux-refactoring`

**Created**: 2026-05-14

**Status**: Draft

**Input**: User description: "A targeted UI/UX refactoring across multiple pages to modernize the interface, improve information architecture, and add several small interactive features."

## Clarifications

### Session 2026-05-14

- Q: When the user confirms a dialog and the API call returns an error, which recovery pattern should the UI follow? → A: Close the dialog immediately on error and show an inline error message near the triggering button.
- Q: Should the My Ideas page stage filter also persist its selection via URL query parameters (consistent with the Ideas page)? → A: Yes — both Ideas and My Ideas pages use URL query params for stage filter persistence.
- Q: Should the evaluation page entrance animation fire on every page mount, or only on the initial navigation into the page? → A: Every page mount — no navigation-origin tracking required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Home Page as Idea-Stage Dashboard (Priority: P1)

A logged-in user visits the home page and immediately sees a visual overview of all idea stages. Each stage is represented as a clickable card that shows the stage name. Clicking any stage card navigates the user to the ideas list pre-filtered to that stage, allowing quick exploration by category.

**Why this priority**: The home page is the first screen users see after login. Transforming it into a stage-based dashboard gives immediate context and a navigation shortcut, reducing clicks to reach a filtered idea list. This is the highest-visibility change.

**Independent Test**: Can be fully tested by visiting the home page and verifying that one card per stage appears, and clicking a card lands on the ideas page with the correct stage filter applied and persisting through a browser refresh.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on the home page, **When** the page loads, **Then** one clickable card per idea stage is displayed (New Idea, Initial Screening, Technical Review, Business Impact Assessment, Final Selection) with no empty or blank areas.
2. **Given** a logged-in user clicks the "Technical Review" stage card, **When** the navigation completes, **Then** the ideas page loads with the stage filter pre-set to "Technical Review" and the URL reflects `?stage=technical_review`.
3. **Given** a user navigates to `/ideas?stage=initial_screening` directly (or via a stage card), **When** the page fully loads including a browser refresh, **Then** the stage filter remains "Initial Screening" and only ideas in that stage are shown.

---

### User Story 2 - Confirmation Dialogs for Consequential Actions (Priority: P1)

When a user is about to take an irreversible action — submitting an idea or advancing its stage — a confirmation dialog appears explaining the consequences. The user must explicitly confirm before the action proceeds, preventing accidental submissions or stage advances.

**Why this priority**: Submitting an idea locks it from further edits. Advancing a stage is also irreversible. Accidental clicks on these buttons represent high-impact, hard-to-recover errors. Preventing them is a safety-critical UX requirement.

**Independent Test**: Can be fully tested by clicking "Submit Idea" and "Advance Stage" buttons and verifying that a dialog appears, that clicking Cancel aborts the action, and that confirming proceeds with the API call.

**Acceptance Scenarios**:

1. **Given** a user is on the idea submission form, **When** the user clicks "Submit Idea", **Then** a dialog appears with the text "Are you sure you want to submit this idea? You will not be able to edit it after submission." with Cancel and "Submit Idea" buttons.
2. **Given** the confirmation dialog is open, **When** the user clicks Cancel or presses Escape, **Then** the dialog closes and no submission occurs.
3. **Given** the confirmation dialog is open, **When** the user clicks "Submit Idea" or presses Enter on the focused confirm button, **Then** the idea is submitted via the API.
4. **Given** an evaluator is on an idea's evaluation page, **When** the evaluator clicks "Advance Stage", **Then** a dialog appears with "Are you sure you want to advance this idea to the next stage? This action cannot be undone." with Cancel and "Advance Stage" buttons.
5. **Given** the Advance Stage dialog is open, **When** the evaluator confirms, **Then** the stage advance API call fires and the UI updates accordingly.
6. **Given** either confirmation dialog fires an API call that returns an error, **When** the error response is received, **Then** the dialog closes and an inline error message appears near the triggering button; the idea's state remains unchanged.

---

### User Story 3 - Stage Filter Cards on Ideas and My Ideas Pages (Priority: P1)

On the Ideas page and the My Ideas page, the existing stage dropdown/select is replaced by a horizontal row of clickable filter cards — one per stage. Users can click multiple cards to filter by several stages simultaneously. Zero cards selected means no filter is active and all ideas are shown.

**Why this priority**: The horizontal filter card pattern provides a richer, more discoverable filter UX than a dropdown. Applying the same component to both pages ensures consistency and is immediately usable after a single implementation.

**Independent Test**: Can be fully tested on the Ideas page by clicking one or more stage cards and verifying that the list updates to show only ideas matching the selected stages, and that deselecting all cards shows all ideas.

**Acceptance Scenarios**:

1. **Given** a user is on the Ideas page, **When** the page loads, **Then** a horizontal row of clickable stage filter cards is displayed (one per stage) with no dropdown present, and no card is selected (all ideas visible).
2. **Given** no filter is active, **When** the user clicks the "New Idea" filter card, **Then** the card gets a visual selected state (primary-color border and background tint) and the list shows only "New Idea" ideas.
3. **Given** the "New Idea" card is selected, **When** the user also clicks "Technical Review", **Then** both cards are selected and the list shows ideas in either stage (multi-select OR logic).
4. **Given** multiple cards are selected, **When** the user clicks a selected card again, **Then** that card deselects and the filter updates.
5. **Given** all selected cards are deselected, **When** zero cards are selected, **Then** all ideas are shown (no filter applied).
6. **Given** a user navigates to the My Ideas page, **Then** the same filter card component is present and behaves identically.
7. **Given** a user is on the My Ideas page with one or more stage filter cards selected, **When** the user refreshes the browser, **Then** the previously selected filter cards are restored from the URL query parameter and the list reflects the active filter.

---

### User Story 4 - Category Validation Friendly Error Message (Priority: P2)

When a user submits an idea without selecting a category, the system currently displays a raw technical error. Instead, the user should see a friendly, human-readable message guiding them to select a category.

**Why this priority**: Error messages are a critical UX touchpoint. A raw enum error breaks trust and confuses non-technical users. This is a targeted fix with no structural changes.

**Independent Test**: Can be fully tested by submitting the idea form without a category and verifying the error message displayed reads "Please select a category before submitting." with no raw enum text visible.

**Acceptance Scenarios**:

1. **Given** a user is on the idea submission form with no category selected, **When** the user attempts to submit, **Then** the form displays "Please select a category before submitting." adjacent to the category field.
2. **Given** a backend API error is returned containing a raw enum validation message about category, **When** the error is displayed to the user, **Then** the message shown is "Please select a category before submitting." rather than the raw string.
3. **Given** a valid category is selected before submission, **When** the form is submitted, **Then** no category validation error appears.

---

### User Story 5 - Ideas Page Data Grid Column Readability (Priority: P2)

The ideas data table on the Ideas page is reorganised so columns appear in a logical left-to-right reading order (Status/Stage → Title → Category → Submitted By → Date → Actions) and column widths are tuned so text does not wrap on a standard desktop viewport.

**Why this priority**: A well-structured table improves scan-ability and reduces cognitive load when managing many ideas. No-wrap columns prevent truncated or hard-to-read rows.

**Independent Test**: Can be fully tested by opening the Ideas page at 1280px wide and verifying column order matches the specified sequence, and that all cell text (for typical data lengths) fits without line-wrapping.

**Acceptance Scenarios**:

1. **Given** a user is on the Ideas page on a 1280px-wide viewport, **When** the table loads, **Then** columns appear in the order: Status/Stage, Title, Category, Submitted By, Date, Actions.
2. **Given** the table is rendered on a 1280px viewport with normal-length data, **When** the user visually inspects the rows, **Then** no cell text wraps to a second line.

---

### User Story 6 - Privacy Policy Modal on Register Screen (Priority: P3)

On the registration screen, the "Privacy Policy" text link is replaced by a button that opens a modal dialog. The modal displays a "Privacy Policy" heading and placeholder body content, with a "Close" button to dismiss it.

**Why this priority**: The change removes a broken or out-of-scope external link, keeping users in-context while providing a placeholder for future legal content. It is a low-complexity, low-risk change.

**Independent Test**: Can be fully tested by visiting the register page, clicking "Privacy Policy", verifying a modal appears with the correct title and close button, and confirming the modal dismisses on clicking Close or pressing Escape.

**Acceptance Scenarios**:

1. **Given** a visitor is on the registration page, **When** the user clicks the "Privacy Policy" element, **Then** a modal dialog opens titled "Privacy Policy" with a body area and a "Close" button in the footer.
2. **Given** the Privacy Policy modal is open, **When** the user clicks "Close" or presses Escape, **Then** the modal closes and the user returns to the registration form.

---

### User Story 7 - Global UI Polish and Evaluation Phase Animation (Priority: P3)

All pages are audited for visual consistency against the design system: padding, typography scale, card shadows, and button variants are corrected where they deviate. On the evaluation/idea-detail page, the stage content area gains a smooth fade-in and slide-up entrance animation, the status badge is enlarged for legibility, and badge color changes transition smoothly rather than flickering.

**Why this priority**: Polish is cumulative and contextual. The evaluation page gets specific animated improvements to communicate state changes clearly. This is purely additive and affects no data flows.

**Independent Test**: Can be fully tested by navigating to each page and verifying design token compliance, then triggering a status change on the evaluation page and observing the animation and badge color transition.

**Acceptance Scenarios**:

1. **Given** a user navigates to the evaluation/idea-detail page, **When** the page content loads (on every mount, regardless of navigation origin), **Then** the stage content area appears with a fade-in and upward slide effect (200–300ms duration).
2. **Given** an idea's status changes (e.g., stage is advanced), **When** the badge updates, **Then** the badge color changes with a smooth transition rather than an abrupt swap (≤150ms).
3. **Given** a user's operating system has "Reduce Motion" enabled, **When** any animated element on any page would normally animate, **Then** the animation is suppressed and the element appears in its final state immediately.
4. **Given** any page is loaded, **When** the UI is visually compared against the design system tokens, **Then** padding, typography scale, card shadows, and button variants match the design system without deviation.

---

### Edge Cases

- What happens when a user arrives on the Ideas page via a stage card link from the home page and then deselects that filter card? All ideas should be shown without navigating away.
- What happens when the stage enum in the codebase changes (a stage is added or removed)? Stage cards on the home page and filter cards should automatically derive from the same source of truth so they stay in sync.
- What happens when a user submits the Advance Stage dialog and the API call fails? The dialog closes immediately, an inline error message appears near the "Advance Stage" button, and the stage remains unchanged.
- What happens if the user has "Reduce Motion" enabled in their OS? All animations (entrance animation, badge transition) must be suppressed.
- What if the Privacy Policy modal is opened on a narrow mobile screen? The modal must be responsive and usable at 375px width.
- What if a user tabs through the confirmation dialog using only a keyboard? All interactive elements (Cancel, confirm button) must be reachable and operable via Tab and Enter/Space.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display one clickable card per idea stage, derived from the canonical stage enumeration, in a layout with no empty space.
- **FR-002**: Clicking a stage card on the home page MUST navigate to the Ideas page with that stage's filter pre-applied, reflected in the URL query parameter.
- **FR-003**: The Ideas page and My Ideas page MUST replace the stage dropdown with a horizontal row of toggleable filter cards (one per stage), supporting multi-select.
- **FR-004**: Zero selected filter cards MUST result in all ideas being displayed (no filter applied); there MUST be no "All Stages" card.
- **FR-005**: The stage filter selection on the Ideas page and the My Ideas page MUST persist through a browser page refresh (read from URL query parameter on mount) on both pages.
- **FR-006**: The ideas data table MUST present columns in the order: Status/Stage → Title → Category → Submitted By → Date → Actions, with no text wrapping on a 1280px viewport.
- **FR-007**: The "Submit Idea" button MUST trigger a confirmation dialog before firing the submission API call; the API call MUST only execute upon explicit user confirmation; if the API call fails, the dialog MUST close and an inline error MUST appear near the "Submit Idea" button.
- **FR-008**: The confirmation dialog for idea submission MUST display the exact text "Are you sure you want to submit this idea? You will not be able to edit it after submission." with Cancel and "Submit Idea" action buttons.
- **FR-009**: The "Advance Stage" button MUST trigger a confirmation dialog; the API call MUST only execute upon explicit user confirmation; if the API call fails, the dialog MUST close and an inline error MUST appear near the "Advance Stage" button.
- **FR-010**: The confirmation dialog for advancing stage MUST display "Are you sure you want to advance this idea to the next stage? This action cannot be undone." with Cancel and "Advance Stage" action buttons.
- **FR-011**: Both confirmation dialogs MUST be keyboard-accessible: Escape MUST close the dialog without action; Enter on the focused confirm button MUST submit.
- **FR-012**: Submitting the idea form without a category selected MUST show the message "Please select a category before submitting." (not a raw enum error string).
- **FR-013**: Any raw backend category enum validation error MUST be intercepted and replaced with the friendly message "Please select a category before submitting." before display.
- **FR-014**: The "Privacy Policy" link on the register page MUST be replaced with an element that opens a modal dialog titled "Privacy Policy" with a placeholder body and a "Close" button only.
- **FR-015**: The Privacy Policy modal MUST be dismissible via the "Close" button or the Escape key.
- **FR-016**: The idea-detail/evaluation page MUST render its stage content area with a fade-in and slide-up entrance animation of 200–300ms duration on every page mount, regardless of navigation origin.
- **FR-017**: Status badge color changes on the evaluation page MUST animate with a smooth transition of ≤150ms rather than flickering.
- **FR-018**: All animations MUST be suppressed for users with "Reduce Motion" enabled in their operating system.
- **FR-019**: All interactive elements across the application MUST have a visible focus ring, a pointer cursor, and a touch target size of at least 44×44px.
- **FR-020**: All visual styles MUST match the design system (MASTER.md) tokens for padding, typography, card shadows, and button variants across all pages.

### Key Entities

- **Stage**: An enumerated progression state for an idea (`new_idea`, `initial_screening`, `technical_review`, `business_impact_assessment`, `final_selection`). Used as the basis for all stage-based filtering and navigation.
- **Idea**: A user-submitted proposal that progresses through stages. Becomes read-only after submission.
- **StageFilterCard**: A UI element representing a single stage, toggled by the user to filter idea lists. Has selected and unselected visual states.
- **ConfirmationDialog**: A modal that presents the consequence of a destructive or irreversible action and requires explicit user acknowledgement before the action proceeds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can navigate from the home page to a stage-filtered ideas list in one click with zero additional steps.
- **SC-002**: Zero occurrences of raw enum validation error text visible to end users after the category error message fix is applied.
- **SC-003**: 100% of tested user flows for idea submission and stage advancement require at least one explicit confirmation click before the action fires.
- **SC-004**: All idea table columns on the Ideas page display without text wrapping when tested at 1280px viewport width with realistic data.
- **SC-005**: Stage filter selections on both the Ideas page and the My Ideas page survive a browser refresh — the filter state is readable from the URL on both pages without requiring a new user interaction.
- **SC-006**: All animated elements render their final state immediately (within one frame) when the operating system "Reduce Motion" preference is active.
- **SC-007**: All interactive elements across all pages pass a WCAG 2.1 AA contrast check (≥ 4.5:1) and are reachable and operable using keyboard-only navigation.
- **SC-008**: The Privacy Policy modal opens, displays its title and close button, and dismisses without any page navigation on 100% of tested interactions.
- **SC-009**: All pages are visually consistent with the design system tokens for spacing, typography, shadows, and button variants with no deviations.

## Assumptions

- The canonical Stage enum in `frontend/src/types/ideas.ts` is the single source of truth for all stage-based UI (home page cards, filter cards, and table values); no new stages will be added during this feature's implementation.
- The existing shadcn/ui Dialog and AlertDialog components are installed and available; no new packages need to be added.
- All filtering is performed client-side or via existing URL query parameters; no new backend API endpoints are required.
- The "Reduce Motion" implementation uses the CSS `prefers-reduced-motion: reduce` media query, respected without JavaScript detection.
- The design system tokens referenced are defined in `design-system/innovatepam/MASTER.md`; this file exists and is up to date before implementation begins.
- The category field's backend validation error string is stable and does not vary across API versions, allowing reliable string-matching for the friendly message substitution.
- Responsive breakpoints to target are 375px, 768px, 1024px, and 1440px; no intermediate breakpoints are required.
- The "Submit Idea" confirmation and "Advance Stage" confirmation dialogs do not need to persist draft state — cancelling the dialog leaves all form fields unchanged.
