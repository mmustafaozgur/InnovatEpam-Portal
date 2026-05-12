# ADR-002: React + Vite + TypeScript + Tailwind CSS + shadcn/ui as the Frontend Stack

**Date**: 2026-05-12
**Status**: Accepted
**Scope**: Project-wide

## Context

The portal requires a browser-based UI for idea submission, expert evaluation, and administration workflows. A frontend technology choice had to be made before any UI feature implementation began. The constitution (Principle IV) mandates that all visual decisions adhere to `design-system/innovatepam/MASTER.md`, and that only Tailwind CSS utility classes and shadcn/ui components be used. Any deviation must be proposed as a MASTER.md amendment. Principle V requires that complexity be justified and that no speculative abstractions be introduced.

## Decision

React with Vite as the build tool, TypeScript for type safety, Tailwind CSS for styling, and shadcn/ui for the component library is the frontend stack for the InnovatEpam Portal.

## Alternatives Considered

| Option | Reason Rejected |
|--------|-----------------|
| Next.js | SSR/SSG complexity not required for an internal employee portal; adds framework overhead that conflicts with Principle V (Simplicity & Minimalism) |
| Vue.js | Viable alternative but no team-specific advantage; shadcn/ui ecosystem is React-native, and switching would require a different component library |
| Svelte / SvelteKit | Smaller ecosystem for component libraries; shadcn/ui not available; would require custom design-system tooling |
| Plain HTML + CSS | Insufficient for the reactive, component-driven UX required by the portal's evaluation and submission flows |
| CSS Modules / styled-components | Conflicts with Principle IV: only Tailwind CSS utility classes are permitted |

## Consequences

**Positive**: Vite provides fast HMR and lean build output; TypeScript catches integration errors at compile time; Tailwind + shadcn/ui enforces design system compliance from the component level up; large ecosystem and team familiarity.

**Negative / Trade-offs**: React's rendering model requires discipline to avoid unnecessary re-renders; TypeScript adds upfront type-authoring cost; any component not in shadcn/ui requires a MASTER.md amendment before use.

**Neutral**: All frontend dependencies must be documented in plan.md before introduction, per Principle V. The design system MASTER.md must exist before any UI feature work begins (see ADR-003).
