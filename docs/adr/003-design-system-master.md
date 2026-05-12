# ADR-003: All UI Decisions Governed by design-system/innovatepam/MASTER.md

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

Without a single authoritative source of truth for visual decisions, individual feature implementations diverge in color palette, typography, spacing, and component variants. For an EPAM innovation portal evaluated by internal stakeholders, visual inconsistency signals poor platform quality. The constitution (Principle IV) identifies this risk explicitly and designates a design system file as the single source of truth, generated and maintained exclusively through the `/ui-ux-pro-max` tool.

## Decision

All UI design decisions — color palettes, typography, spacing, component variants, and interaction patterns — must strictly adhere to `design-system/innovatepam/MASTER.md`. This file is generated and maintained exclusively via the `/ui-ux-pro-max` tool. No custom CSS or ad-hoc styling is permitted. Any visual deviation must be proposed as a MASTER.md amendment before implementation. The design system file must exist before any UI feature work begins.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Per-feature ad-hoc styling decisions | Leads to unmaintainable UI debt and inconsistent appearance across features; explicitly identified as a risk in Principle IV |
| External design system (e.g., Material UI, Ant Design) | Introduces a third-party visual identity not tailored to EPAM portal requirements; conflicts with Principle V (no unjustified third-party dependencies) |
| Shared CSS variables without a governed document | No enforcement mechanism; developers can deviate without review; does not satisfy the "amendment before implementation" governance requirement |

## Consequences

**Positive**: Visual consistency across all features signals platform quality to EPAM evaluators; a single amendment process prevents undocumented style exceptions from accumulating; `/ui-ux-pro-max` provides structured tooling for design decisions.

**Negative / Trade-offs**: Every new UI component or style variation requires a MASTER.md amendment, adding a step before implementation; MASTER.md must be generated before the first UI feature can begin.

**Neutral**: The design gate is part of the standard development workflow (Step 5 of the Development Workflow in the constitution); all PRs must confirm MASTER.md is up to date if UI changes were introduced.
