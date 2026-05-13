# ADR-001: SQLite as the Sole Storage Engine

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

The portal needs a persistent storage layer for all feature data. A database technology had to be selected before any feature's data model could be designed. The constitution (Principle V) explicitly names SQLite and prohibits migration to another database without reproducible benchmark evidence of a bottleneck. The project is bootcamp-scoped: shipping complete, working features is more valuable than sophisticated infrastructure.

## Decision

SQLite is the designated and sole storage engine for the InnovatEpam Portal. No migration to another database is permitted unless benchmarks with reproducible evidence demonstrate SQLite is a bottleneck.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| PostgreSQL | Operational overhead (separate process, connection pooling, migrations tooling) not justified for a bootcamp project; conflicts with Principle V (Simplicity & Minimalism) |
| MySQL / MariaDB | Same operational overhead as PostgreSQL with no feature advantage for this use case |
| MongoDB | Document-store model adds schema flexibility not needed here; operational complexity conflicts with Principle V |
| In-memory store only | Cannot persist data across restarts; unsuitable for production-facing features |

## Consequences

**Positive**: Zero-configuration setup; single file database simplifies local development and CI; no separate database process to manage; sufficient for the portal's expected internal employee user base.

**Negative / Trade-offs**: Not horizontally scalable; concurrent write throughput is limited by SQLite's write locking; migration to another engine later would require a documented benchmark and a constitution amendment.

**Neutral**: All database query patterns must be reviewed during the planning phase per Principle II; N+1 queries and missing indices are blocking defects.
