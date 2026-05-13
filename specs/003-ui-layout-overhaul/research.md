# Research: UI Layout Overhaul — Fixed Sidebar Shell

**Branch**: `003-ui-layout-overhaul` | **Date**: 2026-05-13

---

## Decision 1: URL-Persistent Filter State via `useSearchParams`

**Decision**: Use React Router v6 `useSearchParams` hook to manage `mine` and `page` query params in the browser URL.

**Rationale**: React Router v6 is already the router in use (`App.tsx`). `useSearchParams` provides a hook-based API identical to `useState` semantics, writing directly to the URL on each change. This satisfies FR-016 (bookmarkable/shareable filter state) without introducing new state-management libraries. The URL becomes the source of truth: refreshing the page, copying the URL, or using browser back/forward all preserve the filter state correctly.

**Alternatives considered**:

| Option | Reason Rejected |
|--------|-----------------|
| React `useState` only | Filter resets on page reload or navigating away — violates FR-016 |
| React Context / Zustand | Overkill for a single filter toggle on one page; conflicts with Principle V (no unjustified complexity) |
| Local storage | Persists across sessions which is unexpected for a page filter; harder to share via URL |

---

## Decision 2: Mobile Sidebar — CSS Transition, No New Library

**Decision**: Implement mobile sidebar overlay using `useState(isOpen)` + Tailwind CSS `translate-x` transition. No new shadcn/ui component (e.g., `Sheet`) added.

**Rationale**: The sidebar's mobile behavior is a simple show/hide with a CSS slide-in. Adding the shadcn/ui `Sheet` component would introduce a new Radix UI primitive dependency just to replicate a `transform: translateX(0)` transition. The existing codebase implements all layout via Tailwind utilities; a custom CSS approach fits the stack and keeps dependencies minimal (Principle V).

**Implementation pattern**:
```tsx
// Sidebar.tsx — mobile state
const [mobileOpen, setMobileOpen] = useState(false)

// Panel — hidden off-screen on mobile, always visible on desktop
className={cn(
  "fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-border",
  "transition-transform duration-300 z-40",
  "md:translate-x-0",                    // always visible on desktop
  mobileOpen ? "translate-x-0" : "-translate-x-full"  // slide in/out on mobile
)}

// Backdrop — shown only on mobile when open
{mobileOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-30 md:hidden"
    onClick={() => setMobileOpen(false)}
  />
)}

// Hamburger button — visible only on mobile
<button className="fixed top-4 left-4 z-50 md:hidden ...">
  {mobileOpen ? <X /> : <Menu />}
</button>
```

**Alternatives considered**:

| Option | Reason Rejected |
|--------|-----------------|
| shadcn/ui Sheet | Requires `@radix-ui/react-dialog` (new dep) for a feature achievable with 20 lines of CSS + state |
| Headless UI Transition | Another new dep; overkill for a single slide transition |
| Radix UI Dialog | Same issue as Sheet |

---

## Decision 3: Lucide Icons for Nav Items

**Decision**: Use `Home`, `Lightbulb`, `PlusCircle`, `Users` from `lucide-react` (already installed).

**Rationale**: `lucide-react` is already in use throughout the project (`Lightbulb` on IdeasPage, `Eye`/`EyeOff` on login, etc.). Adding icons to nav items follows the MASTER.md rule: "use SVG icons (Heroicons, Lucide, Simple Icons)" — emojis are explicitly prohibited.

**Nav item → icon mapping**:

| Nav Item | Icon | Import |
|----------|------|--------|
| Home | `Home` | `lucide-react` |
| Ideas | `Lightbulb` | `lucide-react` |
| Submit an Idea | `PlusCircle` | `lucide-react` |
| Manage Users | `Users` | `lucide-react` |

**No new import** — all four icons are included in the existing `lucide-react` package.

---

## Decision 4: Active Nav Highlight — Prefix Match Reuse

**Decision**: Reuse the exact active-detection pattern already in `AppLayout.tsx`:
```ts
const active = pathname === to || (to !== '/' && pathname.startsWith(to))
```

**Rationale**: This logic is already correct, already tested in the browser, and already handles the `/` edge case. Moving it from the inline `NavLink` helper in `AppLayout.tsx` into `Sidebar.tsx` is a pure copy — no logic change needed. This also satisfies the clarification from Session 2026-05-13 (Q2): sub-routes like `/ideas/42` highlight "Ideas" because `/ideas/42`.startsWith(`/ideas`) is true.

---

## Decision 5: Backend `mine` Filter — Additive WHERE Clause

**Decision**: Add `submitter_id_filter: str | None = None` to `idea_service.list_ideas()`. When set, add `WHERE Idea.submitter_id = submitter_id_filter` to both the COUNT and the data query. The route passes `current_user.id` when `mine=True`.

**Rationale**: The existing `idx_ideas_submitter_id` index on `ideas.submitter_id` makes this filter efficient at any data volume the project targets. The pattern is additive — the default `None` preserves exact backward compatibility with all existing callers. The `mine` value is sourced server-side from the authenticated session (`current_user.id`), never from the URL parameter value itself.

**Query pattern**:
```python
async def list_ideas(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    submitter_id_filter: str | None = None,
) -> IdeaListResponse:
    base_q = select(Idea, User.full_name.label("submitter_name")).join(User, ...)
    count_q = select(func.count()).select_from(Idea)
    if submitter_id_filter:
        base_q = base_q.where(Idea.submitter_id == submitter_id_filter)
        count_q = count_q.where(Idea.submitter_id == submitter_id_filter)
    ...
```

**Alternatives considered**:

| Option | Reason Rejected |
|--------|-----------------|
| Client-side filter (filter after fetching all ideas) | Violates FR-014 (must be server-side); breaks pagination correctness |
| New `/api/v1/ideas/mine` endpoint | Violates feature scope constraint: "no new API endpoints except mine filter parameter" |
| Passing `user_id` as a URL query value the client provides | Security risk — client could pass any user's ID; server must derive it from session |

---

## Decision 6: Content Area Layout

**Decision**: Content area uses `md:ml-[220px]` margin offset (desktop) and full-width on mobile. `AppLayout.tsx` wraps `<Outlet>` in `<div className="md:ml-[220px] min-h-screen bg-background">`.

**Rationale**: The sidebar is `fixed` positioned (removed from document flow), so the content area needs a left margin matching the sidebar width on desktop. On mobile the sidebar is an overlay, so no margin is needed. Tailwind's responsive prefix `md:` applies the margin only at ≥768px, exactly matching the mobile breakpoint in the spec.

**Content area standard padding and max-width** (sourced from MASTER.md page specs, now formally documented as the layout contract):
- Page wrapper: `px-6 py-8` (matches existing Ideas and Detail page patterns)
- Content column max-width: `max-w-2xl` for forms (Submit Idea), `max-w-3xl` for detail pages, full-width for tables (Ideas, Users)
- These conventions are documented in the MASTER.md sidebar shell amendment

---

## Zero New Dependencies Confirmed

| Dependency | Status | Justification |
|------------|--------|---------------|
| `lucide-react` | Already installed | Icons |
| `react-router-dom` v6 | Already installed | `useSearchParams` |
| shadcn/ui Sheet | Not needed | CSS transition suffices |
| Any new pip package | Not needed | `mine` filter uses existing SQLAlchemy |
