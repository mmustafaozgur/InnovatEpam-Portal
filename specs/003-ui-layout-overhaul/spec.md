# Feature Specification: UI Layout Overhaul — Fixed Sidebar Shell

**Feature Branch**: `003-ui-layout-overhaul`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "Replace the current top navbar with a fixed left sidebar navigation. This layout should become the permanent shell for all current and future pages — new features should never need to build their own navigation or page chrome."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate via Fixed Sidebar (Priority: P1)

Any authenticated user (Submitter or Evaluator) opens any protected page and sees a fixed left sidebar replacing the top navbar. The sidebar shows the portal brand at the top, role-appropriate navigation items in the middle, and their name, role badge, and a Sign Out button at the bottom. Clicking a nav item takes them to that page, with the active item visually highlighted.

**Why this priority**: The sidebar is the foundational chrome for every page in the portal. All other user stories in this feature depend on it existing. Without it, the layout contract for future features cannot be enforced.

**Independent Test**: Can be fully tested by logging in as either role, verifying the sidebar renders on every protected page (Home, Ideas, Submit an Idea, Users), verifying that clicking each nav item navigates correctly, and verifying the active item is highlighted.

**Acceptance Scenarios**:

1. **Given** a logged-in user on any protected page, **When** the page loads, **Then** a fixed left sidebar (~220px wide, full viewport height) is visible and the page content occupies the remaining area to the right.
2. **Given** a logged-in user viewing the sidebar, **When** they look at the navigation items, **Then** only items permitted for their role are shown (Submitters see Home, Ideas, Submit an Idea; Evaluators see Home, Ideas, Manage Users — mirroring current navbar role-gating).
3. **Given** a logged-in user on a specific page, **When** they view the sidebar, **Then** the nav item for the current page is displayed with a filled pill highlight (tinted background, colored text) and all other items are in their default state.
4. **Given** a logged-in user, **When** they click any nav item, **Then** they are navigated to the corresponding page and the active highlight moves to that item.
5. **Given** a logged-in user, **When** they click the portal brand/logo at the top of the sidebar, **Then** they are navigated to the Home page.
6. **Given** a logged-in user viewing the sidebar bottom section, **When** they look at the footer area, **Then** they see their display name, a role badge (showing their role), and a Sign Out button.
7. **Given** a logged-in user, **When** they click Sign Out in the sidebar, **Then** they are logged out and redirected to the login page.

---

### User Story 2 - Responsive Mobile Sidebar (Priority: P2)

On a small screen (mobile viewport), the sidebar is hidden by default and can be toggled open or closed using a hamburger icon. When open, the sidebar overlays the content area and clicking a nav item or tapping outside closes it.

**Why this priority**: Portal users may access it from mobile devices. The fixed sidebar layout works well on desktop but requires a collapse mechanism on narrow viewports. Depends on P1 (sidebar existing).

**Independent Test**: Can be fully tested by resizing the browser to a mobile width, verifying the sidebar is hidden and a hamburger button appears, tapping it to open the sidebar, navigating to a page, and confirming the sidebar closes and the target page loads.

**Acceptance Scenarios**:

1. **Given** a logged-in user on a mobile-width viewport, **When** any protected page loads, **Then** the sidebar is hidden and a hamburger toggle button is visible.
2. **Given** a logged-in user on mobile with the sidebar hidden, **When** they tap the hamburger button, **Then** the sidebar slides in (or appears) as an overlay and the hamburger button changes to a close indicator.
3. **Given** a logged-in user on mobile with the sidebar open, **When** they tap a navigation item, **Then** the navigation occurs and the sidebar closes.
4. **Given** a logged-in user on mobile with the sidebar open, **When** they tap anywhere outside the sidebar, **Then** the sidebar closes.
5. **Given** a logged-in user on mobile with the sidebar open, **When** they tap the close/hamburger button, **Then** the sidebar closes.

---

### User Story 3 - "My Ideas" Filter on Ideas Page (Priority: P3)

A Submitter on the Ideas page sees a toggle or checkbox labelled "My Ideas." When activated, the list is filtered to show only ideas submitted by the current user. The filter works correctly with pagination — navigating through pages respects the active filter. Evaluators (Admins) do not see this toggle.

**Why this priority**: Adds self-service filtering for Submitters without requiring new pages or data models. Depends on the sidebar (P1) being in place to ensure consistent page chrome.

**Independent Test**: Can be fully tested by logging in as a Submitter, enabling "My Ideas" on the Ideas page, verifying only that user's ideas appear across multiple pages, then disabling it and verifying all ideas return. Also verify an Evaluator does not see the toggle.

**Acceptance Scenarios**:

1. **Given** a logged-in Submitter on the Ideas page, **When** the page loads, **Then** a "My Ideas" toggle or checkbox is visible above the idea list.
2. **Given** a logged-in Evaluator on the Ideas page, **When** the page loads, **Then** no "My Ideas" toggle is visible.
3. **Given** a logged-in Submitter with "My Ideas" inactive, **When** they activate the toggle, **Then** the list immediately updates to show only ideas submitted by that user, starting from page 1.
4. **Given** a logged-in Submitter with "My Ideas" active and multiple pages of their own ideas, **When** they navigate to subsequent pages, **Then** only their ideas appear on each page and the total count reflects only their submissions.
5. **Given** a logged-in Submitter with "My Ideas" active, **When** they deactivate the toggle, **Then** the list returns to showing all ideas from page 1.
6. **Given** a logged-in Submitter with "My Ideas" active, **When** they have submitted zero ideas, **Then** an empty-state message is shown instead of a blank list.

---

### User Story 4 - Consistent Page Structure Across All Pages (Priority: P4)

Every protected page (Home, Ideas, IdeaDetail, Submit an Idea, Manage Users) follows a consistent visual structure — uniform heading hierarchy, spacing, card styles, and component usage — all sourced from the design system (MASTER.md). No page carries bespoke one-off styles.

**Why this priority**: Visual consistency is required by the design system compliance principle but does not block navigation or filtering. It is a polish pass that can be applied independently after the sidebar shell exists.

**Independent Test**: Can be fully tested by reviewing each page side-by-side against the MASTER.md design system rules, confirming that headings, spacing, card styles, and interactive elements match the defined tokens with no unexplained deviations.

**Acceptance Scenarios**:

1. **Given** any authenticated user visiting any protected page, **When** the page renders, **Then** all headings, spacing, card styles, and interactive elements match the specifications defined in MASTER.md with no one-off custom styles.
2. **Given** the Ideas page, IdeaDetail page, Submit an Idea page, Home page, and Manage Users page are compared visually, **When** rendered side by side, **Then** padding, max-width, font usage, and card component styles are uniform across all of them.
3. **Given** a new feature is implemented using the established layout contract, **When** rendered inside the sidebar shell, **Then** it requires zero additional styling to match the visual style of existing pages.

---

### Edge Cases

- What happens when a user is logged in but their role changes mid-session? The sidebar nav items should reflect the role at login time; a forced re-login resolves any mismatch.
- What happens when the sidebar is open on mobile and the user rotates to landscape? The sidebar should close (or transition to the desktop layout) to avoid a broken overlay state.
- What happens if a nav item routes to a page the current user cannot access (e.g., a Submitter manually navigates to /users)? Existing route guards should deny access and redirect — the sidebar only hides the nav item as a UX convenience, not as a security boundary.
- What happens when the Ideas page has zero total ideas and "My Ideas" filter is active? Empty-state message is shown.
- What happens if the API call for the "mine" filter fails? The error state should be displayed inline; existing pagination error handling applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the top navigation bar with a fixed left sidebar, approximately 220px wide, spanning the full viewport height, visible on all protected pages.
- **FR-002**: The sidebar top section MUST display the portal brand/logo that links to the Home page.
- **FR-003**: The sidebar middle section MUST display navigation items (Home, Ideas, Submit an Idea, Manage Users) with associated icons, each linking to its respective page.
- **FR-004**: Navigation items MUST be role-gated: Submitters see Home, Ideas, Submit an Idea; Evaluators see Home, Ideas, Manage Users — matching the access rules enforced by the existing top navbar.
- **FR-005**: The navigation item corresponding to the currently active section MUST be displayed with a filled pill highlight (tinted background, colored text in the EPAM Campus style) while all other items remain in their default state. Active matching uses prefix/parent rules: any route under a section's root path highlights that section's nav item (e.g., `/ideas/42` highlights "Ideas", `/ideas` highlights "Ideas").
- **FR-006**: The sidebar bottom section MUST display the authenticated user's display name, a role badge, and a Sign Out button.
- **FR-007**: Clicking Sign Out in the sidebar MUST log the user out and redirect to the login page, using the same session-termination logic as the current navbar.
- **FR-008**: On mobile viewports, the sidebar MUST be hidden by default. A hamburger toggle button MUST be visible and MUST open/close the sidebar as an overlay.
- **FR-009**: On mobile, tapping a sidebar navigation item or tapping outside the open sidebar MUST close the sidebar.
- **FR-010**: All protected pages MUST render their content inside the sidebar shell's content area, requiring no per-page navigation chrome. The sidebar shell is purely structural (sidebar nav + content slot); it does NOT provide a shared title bar or page heading. Each page is responsible for its own `<h1>` heading and any page-level actions within the content area.
- **FR-011**: The content area MUST use standard padding and a defined max-width consistent across all pages (values sourced from MASTER.md).
- **FR-012**: The layout pattern (sidebar shell, content area dimensions, padding/max-width conventions) MUST be documented in MASTER.md so future features can reference it without reverse-engineering existing pages.
- **FR-013**: The Ideas page MUST display a "My Ideas" toggle/checkbox visible only to users with the Submitter role.
- **FR-014**: When "My Ideas" is active, the Ideas list MUST be filtered server-side (via a `mine` query parameter on `GET /api/v1/ideas`) to return only ideas submitted by the authenticated user; client-side-only filtering is not acceptable.
- **FR-015**: Pagination on the Ideas page MUST respect the active "My Ideas" filter state — navigating to any page while the filter is active MUST return only the current user's ideas for that page.
- **FR-016**: The "My Ideas" filter state and current page number MUST be reflected in the browser URL as query parameters (e.g., `?mine=1&page=2`), making the filtered/paginated view bookmarkable, shareable, and persistent across browser back/forward navigation. Activating or deactivating "My Ideas" MUST reset the page parameter to 1.
- **FR-017**: All protected pages (Home, Ideas, IdeaDetail, SubmitIdea, Users) MUST use only design system components and Tailwind utility classes as specified in MASTER.md; no custom one-off CSS is permitted.
- **FR-018**: The top navbar component MUST be removed entirely once the sidebar shell is in place and all pages are confirmed to render correctly inside it.

### Key Entities *(include if feature involves data)*

- **Sidebar Shell**: The persistent layout wrapper rendered for all authenticated pages. Contains: brand/logo area, role-gated nav items with icons, user identity footer, and a content slot.
- **Nav Item**: A single entry in the sidebar navigation list. Attributes: label, icon, target route, required role(s), active state.
- **Layout Contract**: The standard content area rules (padding, max-width) documented in MASTER.md and applied by the sidebar shell to all child pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every protected page loads with the sidebar fully rendered in under 1 second, with no flash of the old top navbar visible.
- **SC-002**: The sidebar correctly shows only role-appropriate nav items for 100% of sessions — no Submitter can see "Manage Users" and no Evaluator can see "Submit an Idea" in the sidebar.
- **SC-003**: The active page highlight is correct on 100% of page loads and client-side navigations — no page renders with zero or multiple items highlighted simultaneously.
- **SC-004**: The mobile hamburger open/close cycle (open → tap nav item → navigate → sidebar closed) completes without visual glitches on viewport widths at or below 768px.
- **SC-005**: The "My Ideas" filter returns only the current user's ideas across all pages — 0 ideas from other users appear when the filter is active.
- **SC-006**: Paginating through "My Ideas" results returns the correct subset of ideas on every page with correct total counts.
- **SC-007**: All five protected pages (Home, Ideas, IdeaDetail, SubmitIdea, Users) pass a visual consistency audit against MASTER.md — no one-off styles identified.
- **SC-008**: A new feature page added to the sidebar shell requires zero additional layout or navigation code to match the visual standard of existing pages.

## Assumptions

- The design system file `design-system/innovatepam/MASTER.md` exists and contains sidebar, layout, and component specifications before implementation begins. If it does not exist, it MUST be generated via `/ui-ux-pro-max` before this feature's plan phase.
- Role-gating logic in the sidebar mirrors the existing top navbar exactly — no new roles or permissions are introduced.
- The existing route-guard/authentication protection on pages is unchanged; the sidebar is a UX affordance, not an authorization boundary.
- The `mine` filter parameter is the only new API change permitted (on `GET /api/v1/ideas`); no new endpoints, models, or database schema changes are introduced.
- Icons used in the sidebar navigation will be sourced from the icon library already referenced in MASTER.md (e.g., Lucide icons via shadcn/ui); no new icon libraries are added.
- "Mobile viewport" is defined as ≤768px wide, matching the existing Tailwind `md` breakpoint used in the project.
- The sidebar is a shared React component rendered at the router/layout level, not duplicated per page.
- The `mine` filter is enforced server-side by checking the authenticated user's identity from the session; no client-supplied user ID parameter is trusted.
- Visual polish (User Story 4) is applied by updating existing page components to use design system tokens — not by wrapping pages in additional layout layers.
- There is no animation requirement for the desktop sidebar (it is always visible); animation is only needed for the mobile overlay open/close transition, and a simple CSS transition is sufficient.

## Clarifications

### Session 2026-05-13

- Q: When a Submitter navigates away from the Ideas page and returns, should the "My Ideas" filter state persist or reset? → A: URL query parameter — filter state and page number are reflected in the URL (e.g., `?mine=1&page=2`), making the view bookmarkable/shareable and persistent across back/forward navigation.
- Q: When a user is on a sub-route of a section (e.g., `/ideas/42`), should the parent nav item ("Ideas") be highlighted? → A: Yes — active highlight uses prefix/parent matching so any route under a section's root path keeps that section's nav item highlighted.
- Q: Should the sidebar shell provide a shared page title/header bar, or should each page own its own heading? → A: Each page owns its own `<h1>` heading inside the content area; the shell is purely structural (sidebar nav + content slot) with no shared title bar.
