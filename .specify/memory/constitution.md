<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial constitution — first adoption)
Modified principles: N/A
Added sections:
  - Core Principles (I–V)
  - Technology Stack
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate reviewed; generic [Gates determined
     based on constitution file] placeholder is filled dynamically at /speckit-plan time; no static
     update required.
  ✅ .specify/templates/spec-template.md — No constitution-specific mandatory sections added.
  ✅ .specify/templates/tasks-template.md — TDD gate ("Tests MUST be written and FAIL before
     implementation") already aligns with Principle III.
  ⚠ design-system/innovatepam/MASTER.md — MUST be generated via /ui-ux-pro-max before any UI
     work begins. Principle IV is blocked until this file exists.
Follow-up TODOs:
  - Run /ui-ux-pro-max to generate design-system/innovatepam/MASTER.md before first UI feature.
-->

# InnovatEpam Portal Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

No code MUST be written without a prior, approved specification and implementation plan.
All features MUST follow the `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-implement` workflow in strict order. Work that begins without an approved spec
is considered unauthorized and MUST be reverted or retroactively specified before review.

**Rationale**: Prevents scope creep, ensures alignment between product intent and
implementation, and maintains a traceable decision history across the bootcamp timeline.

### II. High-Performance Engineering

All API endpoints MUST target sub-100ms p95 response times under normal load. Database
query patterns MUST be reviewed during the planning phase — not after. N+1 queries and
missing indices are blocking defects that MUST be resolved before merge. Performance
regressions introduced by a feature MUST be documented and justified in the PR.

**Rationale**: The portal's expert evaluation flows and real-time idea management require
snappy UX. Retrofitting performance after the fact is significantly costlier than
designing for it from the start.

### III. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation code. The Red-Green-Refactor cycle is
strictly enforced: tests MUST be confirmed failing before any implementation begins.
No commit MUST be pushed until all tests pass. Integration and contract tests MUST
cover all API endpoints. Unit tests MUST cover all business-logic service layers.

**Rationale**: EPAM innovation workflows are mission-critical. Regressions in idea
submission, expert evaluation, or budget allocation are unacceptable and must be
caught before they reach reviewers.

### IV. Design System Compliance (NON-NEGOTIABLE)

No custom CSS or ad-hoc styling MUST be written. All design decisions — color palettes,
typography, spacing, component variants, and interaction patterns — MUST strictly adhere
to `design-system/innovatepam/MASTER.md` (generated and maintained via the
`/ui-ux-pro-max` tool). Only Tailwind CSS utility classes and the specified shadcn/ui
components MUST be used. Any visual deviation MUST be proposed as a MASTER.md amendment
before implementation.

**Rationale**: Visual consistency signals platform quality to EPAM evaluators.
Undocumented style exceptions compound into unmaintainable UI debt and undermine the
design system's authority.

### V. Simplicity & Minimalism

Complexity MUST be justified in writing before being introduced. New abstractions,
patterns, or third-party dependencies require documented rationale in the relevant
plan.md. YAGNI applies: no speculative features, no over-engineering. SQLite is the
designated storage layer and MUST NOT be migrated to another database unless benchmarks
with reproducible evidence demonstrate it is a bottleneck.

**Rationale**: A bootcamp-scoped project succeeds by shipping complete, working features
rather than sophisticated architecture. Premature optimization and abstraction are the
primary sources of unfinished work.

## Technology Stack

**Backend**: Python 3.11+ · FastAPI · Pydantic (models & validation) · SQLite (storage)

**Frontend**: React + Vite · TypeScript · Tailwind CSS · shadcn/ui

**Design System**: `design-system/innovatepam/MASTER.md` — the authoritative source of
truth for all visual and component decisions. Generated and updated exclusively via
`/ui-ux-pro-max`. MUST exist before any UI feature work begins.

**Testing**: pytest (backend) · Vitest + React Testing Library (frontend)

**Tooling**: Spec Kit (`/speckit-*` commands) · Git with sequential branch numbering
(`###-feature-name` convention)

Deviations from this stack MUST be proposed as a constitution amendment (MINOR or MAJOR
version bump) and merged BEFORE any implementation using the alternate technology begins.

## Development Workflow

1. **Feature Start**: Run `/speckit-specify` to produce a spec; run `/speckit-plan` to
   produce the implementation plan; run `/speckit-tasks` to generate the ordered task list.
   No implementation task MUST start before tasks.md is approved.
2. **Branch Naming**: Every feature MUST be developed on a dedicated branch following
   the `###-feature-name` convention, created via `speckit.git.feature`.
3. **ADR Check**: Before writing any implementation plan, review `docs/adr/` for all
   project-wide and feature-specific ADRs that apply. Every `plan.md` MUST include a
   populated "ADRs Referenced" table. If a decision made during planning is not covered
   by an existing ADR, create one in `docs/adr/` before finalising the plan.
4. **Tests First**: For every implementation phase, write tests per Principle III and
   confirm they fail before writing any production code.
5. **Design Gate**: For any UI task, verify the target component and style rules exist
   in `design-system/innovatepam/MASTER.md` before writing code. If missing, amend
   MASTER.md first via `/ui-ux-pro-max`.
6. **Code Review**: All PRs MUST include a "Constitution Check" section confirming
   compliance with all five Core Principles.
7. **Merge Gate**: All tests MUST pass; no placeholder or TODO code MUST remain in
   production paths; MASTER.md MUST be up to date if any UI changes were introduced.

## Governance

This constitution supersedes all other conventions, practices, and verbal agreements
made within the InnovatEpam Portal project. In case of conflict, the constitution wins.

**Amendment Procedure**: Propose the change in writing (as a spec or PR description).
Increment `CONSTITUTION_VERSION` per the versioning policy below. Update this file and
all affected templates in a single atomic commit. All active feature branches MUST
re-evaluate their plan.md Constitution Check against the new version before continuing.

**Versioning Policy**:
- MAJOR: Removal or redefinition of a NON-NEGOTIABLE principle (Principles I, III, IV).
- MINOR: New principle or section added, or material expansion of existing guidance.
- PATCH: Clarifications, wording improvements, or non-semantic refinements.

**Compliance Review**: Every PR description MUST include a "Constitution Check" section.
The plan.md Constitution Check gate is mandatory before Phase 0 research begins and MUST
be re-checked after Phase 1 design is complete.

All runtime UI/UX guidance is in `design-system/innovatepam/MASTER.md`.

**Version**: 1.0.1 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
