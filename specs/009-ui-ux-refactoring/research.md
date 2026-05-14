# Research: UI/UX Refactoring (009)

## Decision 1 — Dialog Component Availability

**Question**: Are `@radix-ui/react-dialog` / shadcn/ui Dialog and AlertDialog components installed?

**Finding**: `frontend/package.json` does **not** include `@radix-ui/react-dialog` or `@radix-ui/react-alert-dialog`. The spec assumption ("no new packages need to be added") is **incorrect**.

**Decision**: Add `@radix-ui/react-dialog` and generate `frontend/src/components/ui/dialog.tsx` via the shadcn/ui pattern. This is consistent with all other Radix primitives already in the project (`@radix-ui/react-checkbox`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-slot`). No `@radix-ui/react-alert-dialog` is needed — both the confirmation dialogs and the Privacy Policy modal can use the generic `Dialog` primitive with a consistent component wrapper.

**Rationale**: The shadcn/ui pattern adds Radix primitives as direct dependencies; they install as small, peer-dep-free packages with zero runtime overhead. Using `<dialog>` HTML element instead was considered but rejected — it lacks focus-trap and accessible Esc-close behaviour that Radix Dialog provides out of the box.

**Alternatives considered**: Native HTML `<dialog>`, custom focus-trap hook. Both rejected for complexity and a11y risk.

---

## Decision 2 — "My Ideas" Page Identity

**Question**: Is "My Ideas" a separate route/page, or the same `IdeasPage` with `?mine=1`?

**Finding**: `App.tsx` defines a single `/ideas` route pointing to `IdeasPage`. The `mine` URL param (`?mine=1`) is already used as an in-page filter via `MineFilter`. No `/my-ideas` route exists; the sidebar has no "My Ideas" link.

**Decision**: Treat the `IdeasPage` component as the single source for both "Ideas" and "My Ideas" behaviour. The `StageFilterCards` component will appear on this page regardless of the `mine` param value. Stage filter URL persistence (FR-005) is already partially implemented; it will be extended to support multi-select (array of stages).

**Alternatives considered**: Adding a dedicated `/my-ideas` route. Rejected — adds a duplicate page with zero UX benefit; the spec's references to "My Ideas page" map to `IdeasPage` with `?mine=1`.

---

## Decision 3 — Multi-Stage Filtering Architecture

**Question**: How should multi-stage selection be persisted and sent to the API?

**Finding**: Current `GET /api/v1/ideas?stage=<single>` accepts one optional `Stage` value (FastAPI `Optional[Stage]`). For multi-select, the options are:
1. Client-side filtering over a full (unfiltered) API response — breaks server-side pagination.
2. Extend the existing `stage` param to accept repeated values: `?stage=new_idea&stage=technical_review`.
3. Add a new endpoint — ruled out by spec.

**Decision**: Extend the existing `GET /api/v1/ideas` endpoint to accept repeated `stage` query parameters via FastAPI's `List[Stage]` annotation. This is not a new endpoint — it is a backwards-compatible extension of an existing query parameter. When one stage is sent the behaviour is identical to current. The frontend `listIdeas` function signature changes from `stage?: Stage` to `stages?: Stage[]` and serialises as multiple params.

**URL encoding**: `?stage=new_idea&stage=technical_review` (multi-value same key). Frontend uses `URLSearchParams.append('stage', s)` per stage; `searchParams.getAll('stage')` to read back.

**Rationale**: Server-side filtering preserves pagination correctness. Client-side filtering was rejected because it would silently return incomplete results across pages.

**Alternatives considered**: CSV encoding `?stage=new_idea,technical_review` — rejected, non-standard and harder to validate in FastAPI without custom parsing.

---

## Decision 4 — Animation Implementation

**Question**: How should entrance animations and badge transitions be implemented? Should a JS animation library be added?

**Finding**: The project uses Tailwind CSS 3.4 (which includes `@keyframes` via `animate-*` classes) and CSS variables. No JS animation library exists.

**Decision**: Use CSS-native animations only:
- Entrance animation (fade-in + slide-up): Custom `@keyframes` rule in `frontend/src/index.css` + Tailwind `animate-*` class or inline `style` with `animationName`.
- Badge color transition: Tailwind `transition-colors duration-150` on `StageBadge`.
- `prefers-reduced-motion`: CSS media query `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }` added to global stylesheet.

**Rationale**: No new package needed. Tailwind utility classes keep animation consistent with the design system. The `prefers-reduced-motion` CSS rule is already the recommended WCAG technique.

**Alternatives considered**: Framer Motion — rejected (new heavy dependency, not in constitution stack, not needed for two simple CSS transitions).

---

## Decision 5 — Category Error Message Interception Point

**Question**: Where should the raw backend category enum validation error be intercepted?

**Finding**: `SubmitIdeaPage.tsx` `onSubmit` handler catches errors and maps them to per-field errors. The category Zod validation in the frontend already shows "Please select a category" for missing values. The backend would only send a raw enum error if the value is missing/invalid at the API level (bypassing Zod).

**Decision**: Two interception points:
1. **Zod schema** (`SubmitIdeaPage.tsx`): Already present — `required_error: 'Please select a category'`. Verify exact text matches FR-012.
2. **API error handler** (`SubmitIdeaPage.tsx` `onSubmit` catch block): Inspect the error message/detail string; if it contains a raw category enum string (e.g., `category`, `enum`), replace with "Please select a category before submitting." before surfacing to `setFormError`.

**Rationale**: Zod handles the FE validation case; the catch-block handles unexpected backend-returned enum errors (FR-013). No backend changes needed.

---

## Decision 6 — ConfirmationDialog Reuse Pattern

**Question**: Build one shared `ConfirmationDialog` component or two separate dialogs?

**Decision**: One shared `ConfirmationDialog` component at `frontend/src/components/ui/ConfirmationDialog.tsx` accepting `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`, and `open` props. Used by both `SubmitIdeaPage` and `StageAdvanceForm`.

**Rationale**: Both dialogs have identical structure and behaviour — only copy text differs. A single component guarantees keyboard accessibility (Esc, Enter on confirm button) is tested once and maintained in one place.

---

## Decision 7 — Home Page Stage Cards Source of Truth

**Question**: Where should the home page derive its stage list from?

**Decision**: Import `STAGE_OPTIONS` from `frontend/src/components/ideas/StageFilterCards.tsx` (the new multi-select filter component). Both the home page cards and the filter cards share this array. If a stage is added/removed, one change propagates to both.

**Alternatives considered**: Inline the stage array in `HomePage.tsx` — rejected because it creates a duplicate that can drift from the filter.
