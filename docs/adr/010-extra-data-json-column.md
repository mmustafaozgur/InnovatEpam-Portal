# ADR 010: Extra Data as a JSON TEXT Column on `ideas`

**Status**: Accepted
**Date**: 2026-05-13
**Feature**: `005-smart-submission-forms`

---

## Context

The Smart Submission Forms feature introduces category-specific extra fields for idea submissions. Each of the 7 categories has a distinct, fixed set of 0–3 extra fields with different names, types, and constraints. The extra fields must be persisted alongside the idea and returned in API responses.

Two structural options were evaluated.

---

## Decision

Store all category-specific extra fields as a **single `extra_data TEXT NULL` column on the `ideas` table**, containing a JSON-serialised object (or NULL when no extra fields apply).

---

## Alternatives Considered

### Option A: 15+ Nullable Inline Columns (one per field)

Add one column per extra field (e.g., `target_process TEXT`, `estimated_time_saved_per_week INTEGER`, `technology_tool_name TEXT`, …).

**Rejected because**:
- Adds ~15 columns to the `ideas` table, almost all of which are NULL for any given row.
- Schema becomes tightly coupled to the current category set; adding a new category in future requires another migration and new columns.
- Violates Principle V (Simplicity & Minimalism) — the extra columns add real schema complexity without enabling any filtering, sorting, or indexing benefit.

### Option B: Separate `idea_extra_data` Table (FK to `ideas`)

A dedicated table with one row per idea (keyed by `idea_id`), or a key–value pairs table.

**Rejected because**:
- Every idea read would require a JOIN; violates Principle II (High-Performance Engineering).
- No audit trail or one-to-many relationship is needed — each idea has at most one set of extra data.
- Adds a new table, a FK relationship, and a JOIN to manage, violating Principle V.
- The evaluation workflow (ADR 009) explicitly rejected a separate table for the same reasons.

### Option C: JSON TEXT Column (chosen)

**Accepted because**:
- One column; no JOIN; NULL for `other` category and all pre-existing ideas (backward-compatible).
- Application-layer validation (`validate_extra_data`) enforces required fields, types, and length limits — so DB-level CHECK constraints on JSON content are not needed.
- Unlike `evaluation_status` (ADR 009 §Alternatives — "JSON blob rejected" because it needed a DB-level index for the status-filter query), `extra_data` is never filtered, sorted, or indexed. The JSON-column objection from ADR 009 does not apply here.
- Schema stays flexible: adding or modifying category fields only requires updating `extra_data.py` and a clarification, not a new column migration.
- SQLite supports TEXT columns natively; no extensions required.

---

## Consequences

**Positive**:
- Single-column addition; minimal schema change.
- No new JOINs; list and detail reads remain single-table.
- NULL-safe: old ideas render correctly without migration of existing data.
- Category field schema changes (labels, new optional fields) require no DB migration.

**Negative**:
- Individual extra fields cannot be filtered or indexed at the DB layer (acceptable — no such requirement exists in the spec).
- Extra data is opaque to SQL queries; debugging requires JSON parsing.
- If a future feature requires filtering ideas by an extra field value, a schema change will be needed.

These consequences are acceptable: the spec explicitly rules out filtering on extra_data, and Principle V discourages speculative schema design.

---

## References

- Spec: [specs/005-smart-submission-forms/spec.md](../../specs/005-smart-submission-forms/spec.md)
- Data Model: [specs/005-smart-submission-forms/data-model.md](../../specs/005-smart-submission-forms/data-model.md)
- ADR 001: [001-sqlite-storage.md](001-sqlite-storage.md) — SQLite as the designated storage layer
- ADR 009: [009-evaluation-inline-storage.md](009-evaluation-inline-storage.md) — precedent for inline vs. JSON vs. separate table decision
