# ADR-000: Python 3.11 + FastAPI + Pydantic as the Backend Stack

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

The InnovatEpam Portal requires a backend capable of serving API endpoints for idea submission, expert evaluation, and budget allocation workflows. A technology choice had to be made before any feature implementation began. The project is bootcamp-scoped, meaning shipping complete working features is the primary success criterion. The constitution (Principle V) requires that complexity be justified in writing and that YAGNI applies — no speculative abstractions or over-engineering.

## Decision

Python 3.11+ with FastAPI as the web framework and Pydantic for data modelling and validation is the backend stack for the InnovatEpam Portal.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Node.js / Express | Adds a second runtime alongside the React frontend; no advantage over FastAPI for this project's payload types |
| Django / Django REST Framework | Higher baseline complexity and convention overhead not justified for a bootcamp-scoped project (Principle V: complexity must be justified) |
| Flask | Lacks built-in async support, data validation, and OpenAPI generation that FastAPI provides out of the box |
| Go / Java / other compiled languages | Disproportionate operational and cognitive overhead for a bootcamp project; conflicts with Principle V (Simplicity & Minimalism) |

## Consequences

**Positive**: FastAPI's automatic OpenAPI docs reduce integration friction; Pydantic enforces schema correctness at the boundary; Python 3.11 async support satisfies the sub-100ms p95 API target from Principle II; stack is well-known to the team.

**Negative / Trade-offs**: Python's concurrency model (GIL) limits raw multi-core throughput; acceptable given SQLite is already the chosen storage layer and the portal is not a high-concurrency system.

**Neutral**: All backend dependencies must be documented in plan.md before use, per Principle V.
