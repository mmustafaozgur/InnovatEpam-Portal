# Research: Evaluation Workflow

**Branch**: `004-evaluation-workflow` | **Date**: 2026-05-13

## 1. Schema Migration Without Alembic

**Decision**: Write a lightweight `scripts/migrate_eval.py` script that issues `ALTER TABLE ideas ADD COLUMN …` statements guarded by `IF NOT EXISTS` (SQLite 3.37+) or equivalent existence check.

**Rationale**: `Base.metadata.create_all` only creates tables that do not yet exist; it does not add new columns to existing tables. The project deliberately avoids Alembic (ADR 001: SQLite + simplicity). A one-file migration script is the minimal intervention that satisfies both the no-Alembic constraint and the need to upgrade existing DBs.

**Alternatives considered**:
- Alembic: Adds a dependency and migration-revision workflow. Rejected per ADR 001 and Principle V.
- Drop-and-recreate DB: Destructive; loses all existing idea data. Rejected.
- `checkfirst=True` in `create_all`: Only works for whole tables, not columns. Not applicable.

**Implementation note**: The script checks each column individually using `PRAGMA table_info(ideas)` and runs `ALTER TABLE ideas ADD COLUMN …` only for missing columns. This makes the script idempotent.

---

## 2. Status Enum Representation

**Decision**: Store status values as lowercase strings with underscores in the database (`submitted`, `under_review`, `accepted`, `rejected`). Use a `Literal` type in Pydantic schemas. Add a SQLite `CHECK` constraint for database-level enforcement.

**Rationale**: SQLite has no native enum type. String columns with CHECK constraints are the established pattern already used for `category` and `role` in this codebase. A Python `Literal` type gives Pydantic compile-time + runtime validation without introducing an `Enum` class.

**Alternatives considered**:
- Python `enum.Enum` class: More verbose; requires `.value` access throughout service layer. Rejected — Literal is simpler.
- Integer codes: Harder to read in SQL queries; no benefit at this scale. Rejected.

---

## 3. Atomic Evaluation Save

**Decision**: A single SQLAlchemy `UPDATE` setting all four evaluation columns (`evaluation_status`, `evaluation_comment`, `evaluated_at`, `assigned_admin_id`) inside one `db.commit()` call constitutes the atomic unit.

**Rationale**: All evaluation fields live on the same `ideas` row. SQLite's serialized write model ensures that a commit is either fully applied or not. There is no partial-column-write risk within a single ORM `flush + commit` call.

**Consequence**: No separate transaction management beyond the existing session pattern is required.

---

## 4. Concurrent Pick-up Race Condition

**Decision**: Rely on application-layer state validation + SQLite's serialized writes. No optimistic locking (version column) or `SELECT … FOR UPDATE` (not supported in SQLite) required.

**Rationale**: When two admins simultaneously attempt to move the same "submitted" idea to "under review":
1. Admin A's request reads `evaluation_status = 'submitted'` → validates OK → writes `under_review`.
2. Admin B's request also read `evaluation_status = 'submitted'` before A committed, but SQLite serializes writes so B's UPDATE executes after A's commit. The service will have already written `under_review`, but B's request re-reads the status inside the same transaction and the transition check will fail because the spec says only the assigned admin may act after pick-up. 

However — the race is on the *first* write, not a re-read. The safest implementation is to `SELECT … WHERE id = ? AND evaluation_status = 'submitted'` as the fetch step and return 409 if nothing is returned (status already changed). This is a conditional update pattern: read-validate-write within one DB session without intermediate commit, making B's write see A's committed state.

**Conclusion**: Use a "re-read under the same session, validate, then commit" pattern. This is sufficient under SQLite's write serialization. Documented in `evaluate_idea()` implementation notes.

---

## 5. Comment Visibility Logic

**Decision**: Apply visibility filtering in the service layer (`idea_service.get_idea` and `idea_service.list_ideas`), not at the route or schema level. The `EvaluationInfo.comment` field is set to `None` for submitters viewing "under review" ideas.

**Rationale**: The service layer is the canonical location for business rules in this codebase. Routes pass `current_user` to the service; the service decides what to expose. This avoids duplicating visibility logic across routes.

**Rule table**:

| Status | Caller is admin | Caller is submitter |
|--------|-----------------|---------------------|
| submitted | comment = None (none exists) | comment = None |
| under_review | comment = actual value | comment = **None** (hidden) |
| accepted | comment = actual value | comment = actual value |
| rejected | comment = actual value | comment = actual value |

---

## 6. State Machine Transition Rules

**Decision**: Enforce the following transition table in `evaluate_idea()` service function:

| Current status | Allowed next status (by assigned admin) | Notes |
|---|---|---|
| submitted | under_review | Any admin; sets `assigned_admin_id` |
| under_review | under_review | Comment update only; assigned admin only |
| under_review | accepted | Assigned admin only |
| under_review | rejected | Assigned admin only |
| accepted | — | Locked; all transitions rejected |
| rejected | — | Locked; all transitions rejected |

Skipping `under_review` (submitted → accepted/rejected directly) is a 400 error.

---

## 7. Design System Gap

**Decision**: Three new UI components (`EvaluationStatusBadge`, `EvaluationForm`, `StatusFilter`) are not currently documented in `design-system/innovatepam/MASTER.md`. A `/ui-ux-pro-max` amendment run is required before any UI implementation task begins.

**Rationale**: Constitution Principle IV is non-negotiable. Implementing UI components without MASTER.md coverage is an unauthorized deviation.

**Action required**: Before tasks T-UI-01 through T-UI-05, run `/ui-ux-pro-max` to add:
- `EvaluationStatusBadge` — four color variants (submitted: slate, under_review: blue, accepted: green, rejected: red)
- `EvaluationForm` — admin panel with status select (locked when comment-only update) + comment textarea (1 000 char limit with counter)
- `StatusFilter` — dropdown in the filter bar alongside "My Ideas" toggle

---

## 8. New ADR Required

**Decision**: Create `docs/adr/009-evaluation-inline-storage.md` documenting the choice to store evaluation data as inline columns on `ideas` rather than a separate `evaluations` table.

**Rationale**: The spec explicitly mandates inline columns. No existing ADR covers this pattern. Constitution §3 requires an ADR for every planning-phase decision not already recorded.
