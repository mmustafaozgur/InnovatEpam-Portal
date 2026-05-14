# Data Model: UI/UX Refactoring (009)

## Database Schema Changes

**None.** This feature is purely a UI/UX refactoring. No tables, columns, or migrations are added or modified. The SQLite database remains unchanged.

---

## Frontend Type Changes

### Modified: `listIdeas` API function signature

**File**: `frontend/src/api/ideas.ts`

```ts
// BEFORE
export async function listIdeas(
  page = 1, limit = 20, mine = false, stage?: Stage
): Promise<IdeaListResponse>

// AFTER
export async function listIdeas(
  page = 1, limit = 20, mine = false, stages?: Stage[]
): Promise<IdeaListResponse>
```

The function now serialises `stages` as repeated `stage=` params:
```ts
stages?.forEach(s => params.append('stage', s))
```

### No Changes to `frontend/src/types/ideas.ts`

The `Stage` union type, `IdeaSummaryResponse`, `IdeaDetailResponse`, and other interfaces are unchanged.

---

## New UI Component Interfaces

These are TypeScript prop contracts for new/modified components. They live in the frontend source — no database or backend schema impact.

### `StageFilterCards` (new)

**File**: `frontend/src/components/ideas/StageFilterCards.tsx`

```ts
export const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'new_idea',                    label: 'New Idea' },
  { value: 'initial_screening',           label: 'Initial Screening' },
  { value: 'technical_review',            label: 'Technical Review' },
  { value: 'business_impact_assessment',  label: 'Business Impact Assessment' },
  { value: 'final_selection',             label: 'Final Selection' },
]

interface StageFilterCardsProps {
  value: Stage[]                    // currently selected stages (empty = no filter)
  onChange: (stages: Stage[]) => void
}
```

Visual states:
- **Unselected**: neutral border, white background, `text-slate-600`
- **Selected**: `border-primary` border, `bg-primary/10` background, `text-primary` text
- **Hover**: `bg-primary/5` background
- **Touch target**: min `44×44px` per FR-019

### `ConfirmationDialog` (new)

**File**: `frontend/src/components/ui/ConfirmationDialog.tsx`

```ts
interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string              // e.g., "Submit Idea", "Advance Stage"
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean               // disables confirm button during API call
}
```

Keyboard behaviour:
- `Escape` → calls `onCancel` (Radix Dialog built-in)
- `Enter` on focused confirm button → calls `onConfirm`
- Tab order: Cancel → Confirm (confirm has `autoFocus`)

### `PrivacyPolicyModal` (new)

**File**: `frontend/src/components/auth/PrivacyPolicyModal.tsx`

```ts
interface PrivacyPolicyModalProps {
  open: boolean
  onClose: () => void
}
```

Content: Static heading "Privacy Policy" + placeholder body text + "Close" button.
Responsive: `max-w-lg w-full mx-4` (works at 375px per spec edge case).

### Modified: `StageFilter` → replaced by `StageFilterCards`

`frontend/src/components/ideas/StageFilter.tsx` is superseded by `StageFilterCards.tsx`. The old file remains (tests reference it) but `IdeasPage` switches to `StageFilterCards`.

### Modified: `StageBadge`

**File**: `frontend/src/components/ideas/StageBadge.tsx`

Add `transition-colors duration-150` to the className to satisfy FR-017. The component already uses inline Tailwind background/text classes; smooth colour transitions require the Tailwind `transition-colors` utility.

### Modified: `IdeasTable` column order

**File**: `frontend/src/components/ideas/IdeasTable.tsx`

New column order (FR-006):
1. Status/Stage (`current_stage` + `outcome`)
2. Title (with attachment count badge)
3. Category
4. Submitted By (`submitter_name`)
5. Date (`submitted_at`)
6. Actions (link to detail — currently inline in Title; extracted to own column)

Column widths tuned for 1280px no-wrap (FR-006):
| Column        | Width        |
|---------------|--------------|
| Stage         | `w-[160px]`  |
| Title         | flex-1 (`min-w-0`) |
| Category      | `w-[140px]`  |
| Submitted By  | `w-[140px]`  |
| Date          | `w-[100px]`  |
| Actions       | `w-[80px]`   |

---

## Backend Schema Changes

### Modified: `GET /api/v1/ideas` query parameter

**File**: `backend/app/api/routes/ideas.py`

```python
# BEFORE
stage: Optional[Stage] = Query(None, description="Filter by current stage"),

# AFTER
stage: Optional[List[Stage]] = Query(None, description="Filter by one or more stages"),
```

FastAPI automatically deserialises repeated `?stage=x&stage=y` into `List[Stage]`.

**File**: `backend/app/services/idea_service.py`

```python
# list_ideas signature change
async def list_ideas(
    db, caller, page, limit, submitter_id_filter,
    stage_filter: Optional[List[Stage]] = None,   # was: Optional[Stage]
) -> IdeaListResponse: ...
```

SQLAlchemy query change:
```python
# BEFORE
if stage_filter:
    stmt = stmt.where(Idea.current_stage == stage_filter)

# AFTER
if stage_filter:
    stmt = stmt.where(Idea.current_stage.in_(stage_filter))
```

This is a backwards-compatible change: single-value lists behave identically to the previous single-value param.

---

## State Transitions

No new state machine changes. The existing `Stage` enum progression is unchanged. The UI now supports *displaying* multiple stages simultaneously but does not alter the idea's progression logic.
