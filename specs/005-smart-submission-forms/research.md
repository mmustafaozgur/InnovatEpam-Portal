# Research: Smart Submission Forms

**Branch**: `005-smart-submission-forms` | **Date**: 2026-05-13

## Decision 1: extra_data Storage Approach

**Decision**: Store `extra_data` as a `TEXT NULL` column on the `ideas` table, containing a JSON-serialised object specific to each category (or NULL when no extra fields apply).

**Rationale**: Per-category schema variability means the set of meaningful keys differs across all 7 categories. No filtering, sorting, or indexing on individual extra_data keys is required by any spec requirement. SQLite's TEXT column with JSON content is zero-overhead and backward-compatible (existing rows simply keep NULL).

**Alternatives Considered**:

| Option | Verdict |
|--------|---------|
| 15+ nullable inline columns (one per field) | Rejected — most columns always NULL; bloats the table; violates Principle V (Simplicity). |
| Separate `idea_extra_data` table (FK to `ideas`) | Rejected — every idea read requires a JOIN; violates Principle II (Performance). Extra data is always needed when an idea is fetched. No audit trail requirement justifies the added relationship. |
| JSON TEXT column (chosen) | Accepted — one column, no JOIN, NULL-safe, backward-compatible. ADR 009 rejected JSON for evaluation columns because `evaluation_status` needs a DB-level index for filtering; `extra_data` has no such requirement. |

**Documents**: ADR 010 (`docs/adr/010-extra-data-json-column.md`)

---

## Decision 2: Category Constraint Migration Strategy

**Decision**: Two-step migration script (`backend/scripts/migrate_extra_data.py`):
1. `ALTER TABLE ideas ADD COLUMN extra_data TEXT` — add the new column (SQLite supports this natively).
2. Full table recreation to update the `ck_ideas_category` CHECK constraint from 4 to 7 values — SQLite does not support `ALTER TABLE … MODIFY CONSTRAINT`, so the safe workaround is `CREATE TABLE ideas_new … / INSERT INTO … SELECT * / DROP TABLE / RENAME`.

**Rationale**: SQLite's column addition via `ALTER TABLE ADD COLUMN` is safe and fast. Constraint modification requires the copy-and-rename pattern, which is the official SQLite recommendation and is already used in the project's migration toolchain.

**Alternatives Considered**:

| Option | Verdict |
|--------|---------|
| Remove the DB-level category CHECK constraint entirely | Rejected — would remove a correctness guarantee; validation would rely solely on Python. Principle II requires DB-layer correctness for data that must be indexed. |
| Alembic / SQLAlchemy migrations toolchain | Out of scope — adding a migration framework is a Principle V violation for this single feature. The existing `migrate_eval.py` pattern is the precedent. |

---

## Decision 3: extra_data Transport in Multipart Form

**Decision**: Submit `extra_data` as a JSON string (`Form(...)` field) within the existing `multipart/form-data` request.

**Rationale**: The `POST /api/v1/ideas` endpoint must remain `multipart/form-data` to continue supporting file attachments. Switching to `application/json` would break file upload. Including a JSON-serialised string field within multipart is the standard workaround for nested objects in form submissions. The backend deserialises it with `json.loads`.

Frontend: `fd.append('extra_data', JSON.stringify(extraDataObj))` when extra fields are present; omit the field entirely for the `other` category.

Backend: `extra_data: Optional[str] = Form(None)` → `json.loads(extra_data)` → passes dict to service layer.

**Alternatives Considered**:

| Option | Verdict |
|--------|---------|
| Separate `PATCH /api/v1/ideas/{id}/extra` endpoint | Rejected — two-round-trip submission is worse UX and creates a partial-state risk (idea created but extra_data lost). |
| Switch to `application/json` + upload via separate endpoint | Rejected — breaks existing file upload flow; more frontend change for the same result. |

---

## Decision 4: Frontend Dynamic Schema Strategy

**Decision**: Single flat Zod schema with `superRefine` for category-specific required-field validation, combined with `form.watch('category')` + `form.resetField` to clear stale extra field values when the category changes.

**Rationale**: Dynamic `register`/`unregister` in react-hook-form is fragile and hard to test. A flat schema with all possible extra field keys as optional, plus a `superRefine` that makes the right ones required based on the current `category`, is testable and explicit. `form.resetField` on each extra key when category changes ensures stale values are cleared (satisfying FR-002).

**All extra field keys registered in the flat schema**:
`target_process`, `estimated_time_saved_per_week`, `technology_tool_name`, `affected_systems_or_teams`, `current_annual_cost_usd`, `projected_annual_saving_usd`, `target_audience`, `skill_area`, `estimated_duration_hours`, `affected_delivery_phase`, `client_impact`, `target_group`, `recurring_or_one_time`

On submit, only the keys relevant to the selected category are collected and sent as `extra_data`.

**Alternatives Considered**:

| Option | Verdict |
|--------|---------|
| Dynamic `register`/`unregister` per field | Rejected — fragile during re-render; hard to write deterministic tests. |
| `useFieldArray` with index-based fields | Rejected — extra fields are named, not array-indexed; index-based access is awkward. |

---

## Decision 5: Server-Side Validation Module

**Decision**: New `backend/app/schemas/extra_data.py` module containing `CATEGORY_FIELD_SCHEMA` (the canonical field definitions) and `validate_extra_data(category, extra_data)` (raises `ValueError` with a field-keyed dict for structured error responses per FR-014).

**Rationale**: Single source of truth for field definitions. The same schema drives validation (service layer) and can inform API documentation. Separating it from `schemas/ideas.py` keeps each module focused.

**Error response shape** (when extra_data fails server-side validation):
```json
{
  "detail": {
    "extra_data": {
      "target_process": "This field is required.",
      "projected_annual_saving_usd": "This field is required."
    }
  }
}
```
This shape enables the frontend to map errors to specific fields and display them inline (FR-014 + FR-004).
