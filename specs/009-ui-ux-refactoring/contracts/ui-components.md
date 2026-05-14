# Contract: UI Component Interfaces

## StageFilterCards

**File**: `frontend/src/components/ideas/StageFilterCards.tsx`

```ts
export const STAGE_OPTIONS: ReadonlyArray<{ value: Stage; label: string }>

interface StageFilterCardsProps {
  value: Stage[]                        // active selection; [] = no filter (show all)
  onChange: (stages: Stage[]) => void   // toggling a selected stage removes it
}
```

**Contract rules**:
- Renders exactly 5 clickable elements (one per Stage enum value).
- Clicking an unselected card appends its value to `value` and calls `onChange`.
- Clicking a selected card removes it from `value` and calls `onChange`.
- When `value` is empty, no card shows the selected visual state.
- Each card has `role="button"` or is a `<button>` with `aria-pressed={selected}`.
- Minimum touch target: 44×44px.
- Exported: `STAGE_OPTIONS` (so `HomePage` can import it for navigation cards).

---

## ConfirmationDialog

**File**: `frontend/src/components/ui/ConfirmationDialog.tsx`

```ts
interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string              // default: "Cancel"
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean               // default: false
}
```

**Contract rules**:
- Renders nothing when `open` is false.
- When `open` is true: renders a modal with `title`, `description`, a Cancel button, and a Confirm button labelled `confirmLabel`.
- Escape key calls `onCancel` (via Radix Dialog `onOpenChange`).
- Confirm button has `autoFocus`; pressing Enter fires `onConfirm`.
- When `isLoading` is true: confirm button shows a loading state and is `disabled`.
- On `onCancel` or Escape: dialog closes; no API call fires.
- Built on `@radix-ui/react-dialog`; uses `dialog.tsx` primitive.

---

## PrivacyPolicyModal

**File**: `frontend/src/components/auth/PrivacyPolicyModal.tsx`

```ts
interface PrivacyPolicyModalProps {
  open: boolean
  onClose: () => void
}
```

**Contract rules**:
- Displays heading "Privacy Policy".
- Displays body text: "Our privacy policy will be published here. Please contact your EPAM administrator for details."
- Has one action button labelled "Close" that calls `onClose`.
- Escape key calls `onClose`.
- Responsive at 375px (modal width: `max-w-lg w-full mx-4`).

---

## Dialog primitive

**File**: `frontend/src/components/ui/dialog.tsx`

Shadcn/ui-style wrapper over `@radix-ui/react-dialog`. Must export:
`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.

Follows the design system (`MASTER.md`):
- Overlay: `bg-black/50`
- Panel: `bg-white rounded-xl shadow-lg p-6`
- Title: `font-heading font-semibold text-lg text-primary`

---

## HomePage Stage Navigation Cards

**Not a new component** — inline in `frontend/src/pages/HomePage.tsx`.

**Contract rules**:
- Renders `STAGE_OPTIONS.length` (5) cards.
- Each card is a `<Link>` to `/ideas?stage=<value>`.
- Clicking navigates to `IdeasPage` with that stage pre-selected as the single filter.
- Cards must be responsive: wrap on mobile (`flex-wrap`).
- Derives stage list from `import { STAGE_OPTIONS } from '@/components/ideas/StageFilterCards'`.

---

## Modified: IdeasTable Column Order

**File**: `frontend/src/components/ideas/IdeasTable.tsx`

Column order (left-to-right): Stage → Title → Category → Submitted By → Date → Actions

Actions column: contains a `<Link>` to `/ideas/${idea.id}` labelled "View". The title column retains its attachment-count badge but is no longer itself a link (the Actions column holds the navigation link).
