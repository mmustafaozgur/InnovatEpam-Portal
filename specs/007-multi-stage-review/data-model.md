# Data Model: Multi-Stage Review Pipeline

**Feature**: `007-multi-stage-review` | **Date**: 2026-05-14

---

## Stage Enum

```python
STAGES = [
    'new_idea',
    'initial_screening',
    'technical_review',
    'business_impact_assessment',
    'final_selection',
]
STAGE_ORDER = {s: i for i, s in enumerate(STAGES)}
```

## Outcome Enum

```python
OUTCOMES = ['accepted', 'rejected']
# Non-null only when stage == 'final_selection'
# NULL for all other stages
```

---

## Entities

### Idea (modified)

**Table**: `ideas`

**Added columns**:

| Column | Type | Constraints |
|--------|------|-------------|
| `current_stage` | `TEXT NOT NULL` | `DEFAULT 'new_idea'`; `CHECK(current_stage IN ('new_idea','initial_screening','technical_review','business_impact_assessment','final_selection'))` |

**Reused columns (no change)**:

| Column | Notes |
|--------|-------|
| `assigned_admin_id` | FK to `users.id`; set when idea first advances from `new_idea` to `initial_screening` |

**Dropped columns (post-migration)**:

| Column | Reason |
|--------|--------|
| `evaluation_status` | Replaced by `current_stage` |
| `evaluation_comment` | Migrated to `stage_reviews.comment` |
| `evaluated_at` | Migrated to `stage_reviews.reviewed_at` |

**New index**:
```sql
CREATE INDEX idx_ideas_current_stage ON ideas(current_stage);
```

---

### StageReview (new)

**Table**: `stage_reviews`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `TEXT` | `PRIMARY KEY` | UUID |
| `idea_id` | `TEXT NOT NULL` | `REFERENCES ideas(id)` | Owning idea |
| `stage` | `TEXT NOT NULL` | `CHECK(stage IN ('new_idea','initial_screening','technical_review','business_impact_assessment','final_selection'))` | Target stage of this transition |
| `outcome` | `TEXT` | nullable; `CHECK(outcome IN ('accepted','rejected'))` | Non-null iff `stage = 'final_selection'` |
| `comment` | `TEXT` | nullable; `CHECK(length(comment) <= 1000)` | Optional reviewer comment |
| `reviewed_by` | `TEXT` | nullable; `REFERENCES users(id)` | NULL for migrated records without assigned admin |
| `reviewed_at` | `TEXT NOT NULL` | — | ISO 8601 UTC; server-recorded |

**Index**:
```sql
CREATE INDEX idx_stage_reviews_idea_id ON stage_reviews(idea_id);
```

---

## State Machine

```
new_idea
  └─► initial_screening
        └─► technical_review
              └─► business_impact_assessment
                    └─► final_selection  ← TERMINAL (locked)
```

**Rules**:
- Exactly one stage advance at a time; no skipping, no backward movement.
- `final_selection` is terminal: no further stage advances or comments permitted.
- Advancing from `new_idea` → `initial_screening` assigns `idea.assigned_admin_id = acting_admin.id`.
- Only the assigned admin may advance from `initial_screening` onward.
- `outcome` is required when advancing to `final_selection`; NULL for all other stages.

---

## Visibility Matrix

| Role | `stage_reviews` array in response | Action access |
|------|-----------------------------------|---------------|
| Assigned admin (`role=admin` AND `id == assigned_admin_id`) | All records | Advance stage, add comment |
| Other admin (`role=admin` AND `id != assigned_admin_id`) | All records, read-only | None |
| Original submitter (`role=submitter` AND `id == submitter_id`) | All records, read-only | None |
| All other authenticated users | Empty array `[]` — current_stage label only | None |

Visibility filtering is applied server-side in the service layer before building the response.

---

## Migration Mapping

| Old `evaluation_status` | New `current_stage` | `stage_reviews` record created? |
|------------------------|---------------------|---------------------------------|
| `submitted` | `new_idea` | No |
| `under_review` | `initial_screening` | Yes — `stage=initial_screening`, `comment=evaluation_comment`, `reviewed_by=assigned_admin_id` (may be NULL), `outcome=NULL` |
| `accepted` | `final_selection` | Yes — `stage=final_selection`, `outcome=accepted`, `comment=evaluation_comment` |
| `rejected` | `final_selection` | Yes — `stage=final_selection`, `outcome=rejected`, `comment=evaluation_comment` |

Migration is idempotent: ideas with `current_stage` already set are skipped.

---

## Validation Rules

| Rule | Enforcement Layer |
|------|-------------------|
| `current_stage` is a valid stage value | SQLAlchemy `CheckConstraint` + Pydantic `Literal` |
| `stage` in `stage_reviews` is a valid stage value | SQLAlchemy `CheckConstraint` + Pydantic `Literal` |
| `outcome` is null for non-terminal stages | Application layer (`idea_service.py`) |
| `outcome` is non-null when `stage = 'final_selection'` | Application layer + Pydantic validation |
| `comment` max 1000 characters | `CheckConstraint(length(comment) <= 1000)` + Pydantic `max_length=1000` |
| Stage advances exactly one step (no skipping) | Application layer: `STAGE_ORDER[next] == STAGE_ORDER[current] + 1` |
| Only assigned admin can advance from `initial_screening` onward | Application layer |
| Locked ideas (`final_selection`) cannot be advanced or commented | Application layer |
| Comment cannot be edited or deleted after recording (FR-012) | No UPDATE/DELETE permitted on `stage_reviews`; no API endpoint for it |
