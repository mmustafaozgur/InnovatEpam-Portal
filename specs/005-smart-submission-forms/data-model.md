# Data Model: Smart Submission Forms

**Branch**: `005-smart-submission-forms` | **Date**: 2026-05-13

---

## 1. Database Changes

### 1.1 New Column — `ideas.extra_data`

| Attribute | Value |
|-----------|-------|
| Table | `ideas` |
| Column | `extra_data` |
| SQLite Type | `TEXT` |
| Nullable | YES |
| Default | `NULL` |
| Description | JSON-serialised category-specific extra fields. NULL for `other` category and pre-existing ideas. |

No index on `extra_data`. No DB-level CHECK on its contents (validated at the application layer by `validate_extra_data`).

### 1.2 Updated CHECK Constraint — `ck_ideas_category`

**Before** (4 values):
```sql
category IN ('process_improvement','technology','cost_saving','other')
```

**After** (7 values):
```sql
category IN (
  'process_improvement','technology','cost_saving',
  'talent_development','client_delivery','workplace_culture','other'
)
```

This constraint change requires a full table recreation migration (see `backend/scripts/migrate_extra_data.py`).

---

## 2. SQLAlchemy Model Changes (`backend/app/models/idea.py`)

New column added:
```python
extra_data = Column(String, nullable=True)
```

Updated `CheckConstraint` in `__table_args__`:
```python
CheckConstraint(
    "category IN ('process_improvement','technology','cost_saving',"
    "'talent_development','client_delivery','workplace_culture','other')",
    name="ck_ideas_category",
)
```

---

## 3. Category Field Schema (`backend/app/schemas/extra_data.py`)

This module is the single source of truth for all extra field definitions.

### 3.1 Field Definition Structure

Each field definition is a dict with:
- `key` — snake_case identifier stored in `extra_data` JSON
- `label` — human-readable display label (used by frontend and detail page)
- `type` — `"text"` | `"number"` | `"select"`
- `required` — `True` | `False`
- `max_length` — int (text fields only; omit for number/select)
- `options` — list of allowed string values (select fields only)

### 3.2 Full Category Field Schema

| Category | Key | Label | Type | Required | Constraint |
|----------|-----|-------|------|----------|------------|
| process_improvement | target_process | Target Process | text | Yes | max 200 |
| process_improvement | estimated_time_saved_per_week | Estimated Time Saved per Week | number | No | — |
| technology | technology_tool_name | Technology / Tool Name | text | Yes | max 200 |
| technology | affected_systems_or_teams | Affected Systems or Teams | text | No | max 300 |
| cost_saving | current_annual_cost_usd | Current Annual Cost (USD) | number | No | — |
| cost_saving | projected_annual_saving_usd | Projected Annual Saving (USD) | number | Yes | — |
| talent_development | target_audience | Target Audience | text | Yes | max 200 |
| talent_development | skill_area | Skill Area | text | Yes | max 200 |
| talent_development | estimated_duration_hours | Estimated Duration in Hours | number | No | — |
| client_delivery | affected_delivery_phase | Affected Delivery Phase | text | Yes | max 200 |
| client_delivery | client_impact | Client Impact | text | Yes | max 300 |
| workplace_culture | target_group | Target Group | text | Yes | max 200 |
| workplace_culture | recurring_or_one_time | Recurring or One-Time | select | Yes | recurring / one_time |
| other | — | — | — | — | — |

### 3.3 `validate_extra_data` Contract

```python
def validate_extra_data(
    category: str,
    extra_data: dict | None,
) -> dict[str, str]:
    """
    Returns a dict of field_key -> error_message for each violation.
    Returns empty dict if valid.
    Callers MUST check: if errors: raise HTTPException(422, detail={"extra_data": errors})
    """
```

Validation rules enforced:
- Required field absent or empty → `"This field is required."`
- Text field exceeds max_length → `"Must be {max_length} characters or fewer."`
- Number field is non-numeric → `"Must be a number."`
- Select field value not in allowed options → `"Must be one of: {options}."`
- `extra_data` is non-null/non-empty for `other` category → `"Category 'other' must not have extra data."`
- `extra_data` is null for any category other than `other` when required fields exist → treated as all required fields missing

---

## 4. Pydantic Schema Changes (`backend/app/schemas/ideas.py`)

### 4.1 `IdeaCategory`

```python
IdeaCategory = Literal[
    "process_improvement", "technology", "cost_saving",
    "talent_development", "client_delivery", "workplace_culture", "other"
]
```

### 4.2 `IdeaCreateRequest`

Added field:
```python
# extra_data is handled outside Pydantic (as a Form JSON string) and
# validated by validate_extra_data in the service layer.
```
`extra_data` is NOT in `IdeaCreateRequest` — it arrives as a `Form(None)` string in the route and is parsed + validated before being passed to the service. This keeps the Pydantic model clean (file upload requires Form fields, not JSON body).

### 4.3 `IdeaDetailResponse`

Added field:
```python
extra_data: Optional[dict[str, Any]] = None
```

### 4.4 `IdeaSummaryResponse`

Added field:
```python
extra_data: Optional[dict[str, Any]] = None
```

---

## 5. Frontend Type Changes (`frontend/src/types/ideas.ts`)

### 5.1 `IdeaDetailResponse`

Added field:
```typescript
extra_data: Record<string, unknown> | null
```

### 5.2 `IdeaSummaryResponse`

Added field:
```typescript
extra_data: Record<string, unknown> | null
```

---

## 6. Query Impact Analysis

| Operation | Change | N+1 Risk |
|-----------|--------|----------|
| `GET /ideas` (list) | `extra_data` column added to existing SELECT | None — inline column, no JOIN |
| `GET /ideas/{id}` (detail) | `extra_data` column added to existing SELECT | None — inline column, no JOIN |
| `POST /ideas` (create) | `extra_data` value added to INSERT | None |
| `PATCH /ideas/{id}/evaluate` | No change to `extra_data` | None |

No new indices required. No new JOINs introduced. Constitution Principle II is satisfied.

---

## 7. Migration Script (`backend/scripts/migrate_extra_data.py`)

The script performs two operations in sequence:

1. **Add `extra_data` column** (if not already present):
   ```sql
   ALTER TABLE ideas ADD COLUMN extra_data TEXT
   ```

2. **Expand category CHECK constraint** via table recreation:
   ```sql
   -- Step 1: Create new table with updated constraint
   CREATE TABLE ideas_new (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     category TEXT NOT NULL CHECK(category IN (
       'process_improvement','technology','cost_saving',
       'talent_development','client_delivery','workplace_culture','other'
     )),
     submitter_id TEXT NOT NULL,
     submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
     attachment_filename TEXT,
     attachment_stored_name TEXT,
     attachment_mime_type TEXT,
     attachment_size INTEGER,
     evaluation_status TEXT NOT NULL DEFAULT 'submitted',
     evaluation_comment TEXT,
     evaluated_at TEXT,
     assigned_admin_id TEXT,
     extra_data TEXT,
     CHECK(length(title) <= 150),
     CHECK(length(description) <= 3000),
     CHECK((attachment_filename IS NULL) = (attachment_stored_name IS NULL)),
     CHECK(evaluation_status IN ('submitted','under_review','accepted','rejected'))
   );
   -- Step 2: Copy all rows
   INSERT INTO ideas_new SELECT * FROM ideas;
   -- Step 3: Drop old table
   DROP TABLE ideas;
   -- Step 4: Rename
   ALTER TABLE ideas_new RENAME TO ideas;
   -- Step 5: Recreate indices
   CREATE INDEX IF NOT EXISTS idx_ideas_submitted_at ON ideas (submitted_at);
   CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas (submitter_id);
   CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status);
   ```

The script is idempotent: it checks column existence before the ADD COLUMN step, and skips table recreation if the current constraint already includes all 7 categories.
