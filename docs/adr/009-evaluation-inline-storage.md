# ADR 009: Evaluation Data as Inline Columns on `ideas` Table

**Status**: Accepted
**Date**: 2026-05-13
**Feature**: `004-evaluation-workflow`

---

## Context

The evaluation workflow requires storing per-idea evaluation state: a status, an optional comment,
a timestamp, and the identity of the assigned admin. Two structural options were evaluated.

---

## Decision

Store all evaluation data as **four inline columns on the existing `ideas` table**:

| Column | Type |
|--------|------|
| `evaluation_status` | `TEXT NOT NULL DEFAULT 'submitted'` |
| `evaluation_comment` | `TEXT` (nullable) |
| `evaluated_at` | `TEXT` (nullable, ISO 8601) |
| `assigned_admin_id` | `TEXT` (nullable, FK to `users.id`) |

---

## Alternatives Considered

### Option A: Separate `evaluations` table (FK to `ideas`)

A dedicated table with one row per idea (or per evaluation event for an audit trail).

**Rejected because**:
- The spec mandates inline columns explicitly (Data Model section).
- No audit trail is required — each evaluation replaces the previous one.
- Every idea read would require a JOIN; the inline approach avoids that.
- Adds a new table and a relationship to manage, violating Principle V (Simplicity).

### Option B: JSON blob column on `ideas`

Store all evaluation fields as a JSON string in a single column.

**Rejected because**:
- Cannot add a database index on `evaluation_status` for the required status-filter query.
- Harder to validate at the SQLite layer (no CHECK constraint on inner fields).
- Opaque to SQL queries and debugging.

---

## Consequences

**Positive**:
- Single-row read for any idea; no JOIN needed for evaluation data.
- `CHECK` constraint on `evaluation_status` enforces the enum at the DB layer.
- `INDEX` on `evaluation_status` keeps the status-filter query fast (satisfies SC-005).
- Minimal schema change; aligns with existing column patterns for `category` and `role`.

**Negative**:
- Cannot support evaluation history (multiple evaluations per idea) without a schema change.
- If multi-reviewer workflows are ever needed, this model will require a migration to a separate table.

These consequences are acceptable: the spec explicitly rules out audit trails and multi-reviewer
workflows, and the project is constrained to Principle V (no speculative architecture).

---

## References

- Spec: [specs/004-evaluation-workflow/spec.md](../../specs/004-evaluation-workflow/spec.md) — Data Model section
- Research: [specs/004-evaluation-workflow/research.md](../../specs/004-evaluation-workflow/research.md) — §1 (migration) and §2 (enum representation)
- ADR 001: [001-sqlite-storage.md](001-sqlite-storage.md) — SQLite as the designated storage layer
- ADR 005: [005-spec-driven-development.md](005-spec-driven-development.md) — Principle V (Simplicity)
