# ADR-005: Spec-Driven Development — All Features Require an Approved Spec Before Code

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

Without a mandatory specification step, features are implemented based on verbal or informal descriptions, leading to scope creep, misaligned implementations, and no traceable decision history. For a bootcamp project evaluated by EPAM stakeholders, traceability between product intent and implementation is essential. The constitution (Principle I) designates spec-driven development as non-negotiable and defines the exact workflow all features must follow.

## Decision

No code may be written without a prior, approved specification and implementation plan. All features must follow the `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` workflow in strict order. Work that begins without an approved spec is considered unauthorized and must be reverted or retroactively specified before review.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Informal verbal or chat-based feature descriptions | No traceable decision history; scope creep is undetectable; conflicts directly with Principle I |
| Code-first, document-later | Documentation written after the fact reflects what was built, not what was intended; misalignment between product intent and implementation goes undetected until review |
| Lightweight tickets only (no spec document) | Tickets lack the structured ambiguity resolution, data modelling, and acceptance criteria depth required to support TDD (Principle III) and design-system compliance (Principle IV) |
| Optional spec for small features | "Small" is subjective; the non-negotiable status of Principle I eliminates case-by-case exceptions to prevent gradual erosion of the workflow |

## Consequences

**Positive**: Prevents scope creep; ensures alignment between product intent and implementation; maintains a traceable decision history across the bootcamp timeline; spec artifacts (spec.md, plan.md, tasks.md) serve as audit trail for EPAM evaluators.

**Negative / Trade-offs**: Every feature incurs an upfront specification cost before any implementation begins; exploratory spikes must still produce a retroactive spec before implementation proceeds; the workflow adds steps that feel slow during time-pressured sprints.

**Neutral**: The Spec Kit toolchain (`/speckit-*` commands) is the designated tooling for executing this workflow; deviations from the toolchain require a constitution amendment.
