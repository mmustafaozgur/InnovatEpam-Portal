# Research: Multi-Stage Review Pipeline

**Feature**: `007-multi-stage-review` | **Date**: 2026-05-14

---

## Decision 1: Stage Storage Architecture

**Decision**: Separate `stage_reviews` table (one row per stage transition per idea).

**Rationale**: The spec requires an immutable audit trail of every stage transition (FR-003: "System
MUST record a permanent review entry for every stage transition"). A single idea passes through up to
four stages, each with its own reviewer, timestamp, and optional comment — a structure inline columns
cannot represent. ADR-009 acknowledged this explicitly: "Cannot support evaluation history without a
schema change." The `stage_reviews` table is bounded at max 4 rows per idea; a `(idea_id)` index
keeps the JOIN fast and within the sub-100ms p95 target (Constitution Principle II).

**Alternatives Considered**:
- Extending inline columns (4 stages × 3 fields = 12 new nullable columns): Rigid; cannot represent
  ordered history cleanly. Rejected.
- JSON column on `ideas` for history: Cannot be indexed or validated at the DB layer (same issue as
  ADR-009 §Option B). Rejected.
- Keeping ADR-009 single-inline approach: Fundamentally incompatible with FR-003. Rejected.

---

## Decision 2: Stage Advance API Shape

**Decision**: `POST /api/v1/ideas/{idea_id}/reviews` — creates a new `stage_review` record, advances
`current_stage`, and returns the full updated `IdeaDetailResponse`.

**Rationale**: POST semantics match the primary action (creating an immutable record). The stage
advance is a side effect of the record creation. A single round-trip returns the full updated state,
avoiding a follow-up `GET`.

**Alternatives Considered**:
- `PATCH /api/v1/ideas/{idea_id}/stage`: PATCH semantics imply a partial update of the idea, obscuring
  that the primary action is creating a review record. Rejected.
- Two separate requests (POST review + PATCH stage): Risks partial failure; over-engineered. Rejected.

---

## Decision 3: Timeline Embedding in Detail Response

**Decision**: Embed `stage_reviews` array directly in `GET /api/v1/ideas/{idea_id}`. Visibility is
filtered server-side per FR-009 before returning.

**Rationale**: SC-005 explicitly states "The timeline loads synchronously as part of the idea detail
page response — no separate async fetch is required." With max 4 records per idea, response size
overhead is minimal. Server-side filtering prevents unauthorized data exposure.

**Alternatives Considered**:
- Separate `GET /api/v1/ideas/{idea_id}/reviews` endpoint: Requires a second network request per page
  load. Contradicts SC-005. Rejected.

---

## Decision 4: Stage Filter Query Parameter

**Decision**: Replace `?status=` with `?stage=` on `GET /api/v1/ideas`. Old status values are not
mapped — clean break per spec clarification: "Drop after successful migration — no backward-compatibility
retention period."

**Rationale**: New stage names differ from old status names. A clean rename eliminates confusion and
matches the spec mandate to drop the old column entirely.

**Alternatives Considered**:
- Keep `?status=` with value mapping: Adds unnecessary backward-compat layer. Rejected per
  clarification answer.
- Support both `?status=` and `?stage=`: Ambiguous; doubles validation surface. Rejected.

---

## Decision 5: SQLite Concurrency for First-Admin Assignment

**Decision**: Rely on SQLite's serialized write lock plus an in-transaction pre-condition check. Within
a single transaction: (1) fetch the idea and verify `current_stage == 'new_idea'` and
`assigned_admin_id IS NULL`; (2) update atomically. If the pre-condition fails, return 409 Conflict.

**Rationale**: SQLite serializes all write transactions — only one concurrent first-assignment can
succeed. The spec edge case states: "Only one assignment succeeds; the second request is rejected with
a 'this idea has already been assigned' message." No external locking is needed.

**Alternatives Considered**:
- Redis-based distributed lock: Adds a dependency; violates Principle V (Simplicity). Rejected.
- Separate lock table: More complexity without benefit over SQLite's built-in serialization. Rejected.
- Optimistic concurrency with a version column: Viable but unnecessary given SQLite serialization.
  Rejected (YAGNI).

---

## Decision 6: Migration Strategy

**Decision**: Python script at `backend/scripts/migrate_stage_reviews.py`, following the pattern of
`migrate_eval.py` and `migrate_attachments.py`. The script:
1. ALTERs `ideas` to add `current_stage TEXT NOT NULL DEFAULT 'new_idea'`
2. Inserts `stage_reviews` records per the mapping table below
3. Drops `evaluation_status`, `evaluation_comment`, `evaluated_at` via `ALTER TABLE DROP COLUMN`
   (safe: Python 3.11 ships with SQLite ≥ 3.39, which supports DROP COLUMN since 3.35.0)
4. Is idempotent: skips ideas that already have a non-null `current_stage`

**Mapping**:

| Old `evaluation_status` | New `current_stage` | `stage_reviews` record |
|------------------------|---------------------|------------------------|
| `submitted` | `new_idea` | None |
| `under_review` | `initial_screening` | `stage=initial_screening`, `comment=evaluation_comment`, `reviewed_by=assigned_admin_id` (nullable), `outcome=NULL` |
| `accepted` | `final_selection` | `stage=final_selection`, `outcome=accepted`, `comment=evaluation_comment` |
| `rejected` | `final_selection` | `stage=final_selection`, `outcome=rejected`, `comment=evaluation_comment` |

**Alternatives Considered**:
- Alembic migrations: Not used in this project; inconsistent with existing migration scripts.
  Rejected for consistency (Principle V).
- In-app migration on startup: Risky for production; migration must be verified before going live.
  Rejected per spec ("offline, one-time operation").

---

## Decision 7: New ADR Required

**Decision**: ADR-012 (Stage Review Table for Multi-Stage Pipeline) created, superseding ADR-009.

**Rationale**: Constitution Step 3 requires every `plan.md` to include an ADRs Referenced table, and
decisions not covered by existing ADRs must have a new ADR before the plan is finalised. The switch
from inline columns to a separate table is a significant architectural decision that ADR-009 anticipated
but explicitly deferred.
