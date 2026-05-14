# ADR 012: Stage Review Table for Multi-Stage Pipeline

**Status**: Accepted
**Date**: 2026-05-14
**Feature**: `007-multi-stage-review`
**Supersedes**: [ADR-009: Evaluation Data as Inline Columns](009-evaluation-inline-storage.md)

---

## Context

Feature 007 replaces the single-field evaluation workflow (ADR-009) with a four-stage review pipeline.
The spec (FR-003) requires an **immutable audit trail** of every stage transition: each transition must
record the target stage, an optional comment, the acting admin, and the timestamp. A single idea passes
through up to four stages, producing up to four immutable records.

ADR-009 explicitly acknowledged: *"Cannot support evaluation history (multiple evaluations per idea)
without a schema change"* and *"If multi-reviewer workflows are ever needed, this model will require
a migration to a separate table."* Feature 007 is exactly that moment.

---

## Decision

Introduce a new **`stage_reviews` table** with one row per stage transition.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | UUID |
| `idea_id` | `TEXT NOT NULL FK` | Owning idea |
| `stage` | `TEXT NOT NULL` | Target stage (one of the five stage values) |
| `outcome` | `TEXT` (nullable) | `accepted` or `rejected` — only at `final_selection` |
| `comment` | `TEXT` (nullable) | Max 1000 chars |
| `reviewed_by` | `TEXT` (nullable FK) | NULL for migrated records without an assigned admin |
| `reviewed_at` | `TEXT NOT NULL` | ISO 8601 UTC |

**Index**: `CREATE INDEX idx_stage_reviews_idea_id ON stage_reviews(idea_id)`

**Ideas table changes**:
- ADD: `current_stage TEXT NOT NULL DEFAULT 'new_idea'` with CHECK constraint
- DROP (post-migration): `evaluation_status`, `evaluation_comment`, `evaluated_at`
- KEEP: `assigned_admin_id` (reused without changes)

---

## Alternatives Considered

### Option A: Extend Inline Columns (12 new columns)

Add three columns per stage: `{stage}_comment`, `{stage}_reviewer_id`, `{stage}_reviewed_at`
(4 stages × 3 = 12 columns).

**Rejected because**:
- Rigid schema; future stage changes require another migration.
- 12 new nullable columns appear on every idea row regardless of pipeline progress.
- No clean way to retrieve "all transitions in order" without a complex SELECT across nullable columns.

### Option B: JSON Column on `ideas`

Store all transitions as a JSON array in a single `stage_reviews_json` column.

**Rejected because**:
- Cannot add a database index on array contents (same issue as ADR-009 §Option B).
- Cannot enforce CHECK constraints at the DB layer on inner fields.
- Opaque to SQL queries and migration scripts.

---

## Consequences

**Positive**:
- Cleanly supports FR-003 (immutable audit trail of every transition).
- Index on `idea_id` keeps the JOIN fast; max 4 rows per idea ensures a bounded result set.
- Each StageReview record is independently queryable (useful for future reporting).
- Clean separation: `ideas` holds current state; `stage_reviews` holds history.

**Negative**:
- Every `GET /ideas/{id}` response now requires a JOIN to `stage_reviews`. Mitigated by the
  bounded row count (≤4) and the index on `idea_id`.
- One additional table to maintain; mitigated by simplicity of schema (7 columns, no complex relations).

These trade-offs are acceptable: FR-003 is non-negotiable, and the bounded row count ensures
performance compliance with Constitution Principle II (sub-100ms p95).

---

## References

- Spec: [specs/007-multi-stage-review/spec.md](../../specs/007-multi-stage-review/spec.md)
- Research: [specs/007-multi-stage-review/research.md](../../specs/007-multi-stage-review/research.md)
- Data Model: [specs/007-multi-stage-review/data-model.md](../../specs/007-multi-stage-review/data-model.md)
- ADR-001: [001-sqlite-storage.md](001-sqlite-storage.md) — SQLite as the storage layer
- ADR-009 (superseded): [009-evaluation-inline-storage.md](009-evaluation-inline-storage.md)
