<!--
Sync Impact Report
Version change: 1.0.0 -> 1.0.1
Modified principles:
- V. Enterprise Accessible UI: updated design system path
Added sections: None
Removed sections: None
Templates requiring updates:
- updated: .specify/templates/plan-template.md
- updated: .specify/templates/spec-template.md
- reviewed: .specify/templates/tasks-template.md
- not present: .specify/templates/commands/*.md
Runtime guidance:
- reviewed: AGENTS.md
Follow-up TODOs: None
-->
# InnovatEPAM Portal Constitution

## Core Principles

### I. Spec-First Delivery
Every feature MUST begin with a committed `spec.md` under `specs/` before
implementation work starts. The spec is the source of truth for scope,
acceptance criteria, user journeys, and success measures; chat history and
informal notes do not override it. Architectural decisions MUST be captured in
an ADR before the decision is acted upon.

Rationale: InnovatEPAM Portal is an internal B2B enterprise platform where
traceable requirements and auditable decisions matter more than ad hoc speed.

### II. Layered FastAPI Architecture
Backend code MUST follow the route -> service -> repository -> model flow.
Routes handle HTTP translation only. Services contain business logic.
Repositories own all SQLAlchemy database queries. SQLAlchemy models define the
database schema, Pydantic models define API contracts, and these layers MUST
NOT be mixed. Routes and services MUST NOT issue direct database queries.

Rationale: Explicit boundaries keep innovation workflows maintainable as ideas,
evaluations, users, roles, and reporting features grow.

### III. Strict Typed Contracts
Python code MUST use strict type hints on all functions and avoid untyped
application code. TypeScript MUST run in strict mode with no implicit `any`.
Every API endpoint MUST declare Pydantic request and response models. Runtime
data crossing the API boundary MUST be validated through Pydantic schemas, not
through ORM objects or unstructured dictionaries.

Rationale: Typed contracts reduce ambiguity between the FastAPI backend, React
frontend, and SQLite persistence layer.

### IV. Test-First Quality Gates
Development MUST follow RED-GREEN-REFACTOR: write failing tests before
implementation, make them pass, then refactor. The test portfolio MUST target
70% unit tests, 20% integration tests, and 10% E2E tests. Business logic MUST
maintain at least 80% line coverage. Unit tests cover service functions,
utilities, and Pydantic validators; integration tests cover API endpoints and
SQLAlchemy database operations; E2E tests cover only critical user journeys
such as registration, idea submission, and idea evaluation. Tests MUST be
independent, MUST avoid shared global state, and MUST use fixtures instead of
hardcoded setup data.

Rationale: Test-first delivery protects enterprise workflows while keeping E2E
scope small enough to stay reliable.

### V. Enterprise Accessible UI
The frontend MUST present a professional internal B2B tool experience using
React, Vite, TypeScript, Tailwind CSS, and shadcn/ui components. UI
implementation MUST meet WCAG AA minimum accessibility requirements and support
responsive layouts down to a 375px viewport. Tailwind utilities MUST be used
where available instead of custom CSS. When
`design-system/innovatepam/MASTER.md` exists, UI implementation MUST follow it.

Rationale: EPAM employees need a consistent, accessible, work-focused portal
that supports repeated operational use.

## Technology Baseline

The backend MUST use FastAPI with Python 3.11 or newer. SQLite MUST be the
default storage engine as a single local file with no database server
requirement. SQLAlchemy MUST be the database access layer. Pydantic MUST be the
API schema and validation layer. Authentication MUST use JWT tokens with
`python-jose`.

The frontend MUST use React with Vite and TypeScript. Styling MUST use Tailwind
CSS and shadcn/ui components. Backend tests MUST use pytest and pytest-asyncio.
Frontend tests MUST use Vitest and React Testing Library.

Any departure from this baseline MUST be documented in the feature plan, backed
by an ADR when architectural, and approved before implementation.

## Development Workflow

Each feature plan MUST pass a Constitution Check before research and again
after design. The check MUST confirm the existence of a spec, typed API
contracts, layered backend boundaries, TDD tasks, required test levels,
accessibility coverage, and adherence to the approved technology baseline.

Implementation tasks MUST be organized so tests precede production code for
each user story. Backend tasks MUST preserve route, service, repository, model,
and schema separation. Frontend tasks MUST include accessibility and responsive
verification for user-facing changes. Generated design-system guidance MUST be
treated as authoritative when present.

## Governance

This constitution supersedes conflicting project practices, generated task
defaults, and informal instructions. Amendments require an explicit update to
this file, a semantic version change, and synchronization of dependent Spec Kit
templates. Feature work that violates a principle MUST record the violation in
the plan's Complexity Tracking section with a rationale and rejected simpler
alternative.

Versioning policy:
- MAJOR: Removes or redefines a core principle or introduces incompatible
  governance requirements.
- MINOR: Adds a principle or materially expands required workflow, testing,
  architecture, or technology guidance.
- PATCH: Clarifies wording, fixes typos, or makes non-semantic refinements.

Compliance review is required during specification, planning, task generation,
implementation review, and release readiness. Specs remain the source of truth
for feature scope. ADRs remain the source of truth for architectural decisions.

**Version**: 1.0.1 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
