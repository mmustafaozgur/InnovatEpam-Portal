# ADR-004: Test-Driven Development with Red-Green-Refactor Strictly Enforced

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

The InnovatEpam Portal supports mission-critical EPAM innovation workflows: idea submission, expert evaluation, and budget allocation. Regressions in these workflows are unacceptable and must be caught before they reach reviewers. A testing discipline had to be established at the project level to prevent regressions from reaching production and to ensure implementation correctness is validated before code is written.

## Decision

Tests must be written before implementation code. The Red-Green-Refactor cycle is strictly enforced: tests must be confirmed failing before any implementation begins. No commit may be pushed until all tests pass. Integration and contract tests must cover all API endpoints. Unit tests must cover all business-logic service layers. pytest is used for backend tests; Vitest and React Testing Library are used for frontend tests.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Test-after (write code, then tests) | Does not guarantee tests actually validate the behaviour being implemented; regressions in mission-critical workflows are unacceptable (Principle III rationale) |
| No formal testing strategy | Unacceptable for a portal where regressions in idea submission or expert evaluation cannot reach reviewers |
| End-to-end tests only | E2E tests alone are too slow and brittle for the Red-Green-Refactor cycle; unit and integration layers are needed to catch regressions quickly |
| Coverage-only metric (no TDD discipline) | Coverage metrics can be gamed; the failing-test-first requirement is the enforcement mechanism, not coverage percentage |

## Consequences

**Positive**: Implementation correctness is validated by tests written against the specification before any production code exists; regressions are caught at the unit/integration layer before merge; tests serve as living documentation of intended behaviour.

**Negative / Trade-offs**: TDD adds upfront authoring time per feature; developers must resist the temptation to write implementation first and tests afterward; strict enforcement requires discipline during time-pressured bootcamp sprints.

**Neutral**: The testing tools (pytest, Vitest, React Testing Library) are fixed by this ADR and the constitution; introducing alternative test frameworks requires a constitution amendment.
