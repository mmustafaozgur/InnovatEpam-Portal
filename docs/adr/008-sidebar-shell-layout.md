# ADR-008: Sidebar Shell as Universal Layout Contract

**Date**: 2026-05-13
**Status**: Accepted
**Scope**: Project-wide (all protected pages)

## Context

The portal's top navigation bar (`AppLayout.tsx`) works for the first two features but
imposes two problems as the feature set grows: (1) each new page must either rely on a
shared navbar that may not expose contextually relevant actions, or duplicate navigation
chrome; (2) a horizontal navbar does not scale visually when the number of navigation
destinations grows. The feature specification `003-ui-layout-overhaul` also introduces
a per-user "My Ideas" filter that requires URL-persistent state on the Ideas page —
independent of the navigation layout decision.

The constitution (Principle IV) requires a single source of truth for all visual decisions
in `design-system/innovatepam/MASTER.md`. A layout decision of this scope — affecting every
authenticated page — requires an ADR before implementation.

## Decision

The top navigation bar is replaced with a fixed left sidebar shell (~220 px wide, full
viewport height). The sidebar is the **universal layout wrapper** for all current and future
protected pages. It provides:

1. A brand/logo link at the top
2. Role-gated navigation items in the middle (Home, Ideas, Submit an Idea, Manage Users)
3. An active-page pill highlight using prefix-based route matching
4. A user identity footer (display name, role badge, Sign Out)
5. A collapsible mobile overlay triggered by a hamburger toggle

The sidebar shell's content area enforces a **layout contract** documented in
`design-system/innovatepam/MASTER.md §"Sidebar Shell (Feature 003)"`:
- Standard page wrapper: `px-6 py-8`
- Form content max-width: `max-w-2xl mx-auto`
- Detail content max-width: `max-w-3xl`
- Table pages: full-width

New features MUST render their page content inside the existing sidebar shell and MUST NOT
build their own navigation chrome. They MUST use the layout contract padding/max-width
conventions.

The sidebar is a purely structural UX layer. **It is not an authorization boundary.**
Route guards (`ProtectedRoute`, `AdminRoute`) remain the sole authorization mechanism.
The sidebar hides nav items as a UX convenience only.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Keep top navbar, add more items | Horizontal navbars do not scale beyond ~5 items; no persistent user identity footer; mobile experience degrades without significant extra work |
| Per-page navigation (each page builds its own nav) | Violates the principle that "new features should never need to build their own navigation or page chrome"; creates divergent UX over time |
| Full-page modal / drawer navigation (hamburger-only) | Hides navigation on desktop; no persistent wayfinding; regression from current UX |
| Next.js layout system | Would require migrating the entire frontend stack — violates ADR-002 and Principle V |

## Consequences

**Positive**:
- All future feature developers receive navigation and page chrome for free by rendering
  inside the sidebar shell
- Layout contract (padding, max-width) prevents per-page visual divergence without policing
  individual page implementations
- Mobile sidebar collapse follows a single well-tested pattern, not duplicated per page
- Active-page highlighting works for all sub-routes automatically via prefix match

**Negative / Trade-offs**:
- The content area has a fixed `md:ml-[220px]` offset that all pages must accommodate;
  full-bleed page designs (e.g., hero banners) would need the sidebar spec amended first
- The sidebar requires `useAuth()` context — any page outside `AuthProvider` cannot use it
  (this is by design: the sidebar is only for authenticated pages)

**Neutral**:
- The `AdminRoute` wrapper in `App.tsx` must be merged into the single `AppLayout`-wrapping
  route so the sidebar renders correctly for `/users` as well
- Mobile overlay z-index layering (`z-40` backdrop, `z-50` sidebar panel) must be documented
  in MASTER.md to prevent future components from accidentally appearing beneath the overlay
