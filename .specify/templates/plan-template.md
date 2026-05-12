# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11+ backend; TypeScript strict-mode frontend  
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic, python-jose, React, Vite, Tailwind CSS, shadcn/ui  
**Storage**: SQLite single-file database unless a constitution-approved ADR changes this  
**Testing**: pytest + pytest-asyncio; Vitest + React Testing Library; E2E only for critical journeys  
**Target Platform**: Internal EPAM web application  
**Project Type**: Full-stack web application  
**Performance Goals**: [domain-specific measurable target or NEEDS CLARIFICATION]  
**Constraints**: WCAG AA minimum; responsive to 375px; JWT auth; no direct DB queries outside repositories  
**Scale/Scope**: [domain-specific employee/user/workflow scope or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Spec exists at `specs/[###-feature-name]/spec.md` and is the source of truth for scope.
- ADR exists before any new architectural decision is implemented.
- Backend plan preserves route -> service -> repository -> model separation.
- SQLAlchemy models are used only for persistence and Pydantic models only for API contracts.
- All API endpoints declare Pydantic request/response models.
- Python functions and TypeScript code remain strictly typed with no implicit `any`.
- Test plan follows RED-GREEN-REFACTOR with unit, integration, and critical E2E coverage as applicable.
- Business logic coverage target remains at least 80% line coverage.
- UI plan uses Tailwind CSS and shadcn/ui, meets WCAG AA, supports 375px viewport, and follows `design-system/innovatepam/MASTER.md` when present.
- Technology choices match the constitution baseline or are justified by ADR and Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: InnovatEPAM Portal web application
backend/
├── src/
│   ├── api/             # FastAPI routes: HTTP translation only
│   ├── services/        # Business logic
│   ├── repositories/    # SQLAlchemy database queries
│   ├── models/          # SQLAlchemy schema models
│   └── schemas/         # Pydantic API contracts
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
