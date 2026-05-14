# Project Summary - InnovatEPAM Portal

## Overview

InnovatEPAM Portal is an EPAM employee innovation management platform where employees submit ideas for organizational improvement across 7 categories. Ideas flow through a structured 4-stage review pipeline (Initial Screening → Technical Review → Business Impact Assessment → Final Selection) with role-based access for Admins and Submitters.

## Phases Completed

### Phase 1: Core Portal
- [x] User registration with email/password
- [x] User login/logout
- [x] Role-based access (submitter/admin — first user auto-becomes Admin)
- [x] Idea submission form
- [x] Single file attachment
- [x] Idea listing page
- [x] Status tracking
- [x] Admin evaluation workflow

### Phase 2: Smart Submission Forms
- [x] Dynamic form fields by category (7 categories, each with unique required/optional extra fields)
- [x] Category-specific guidance (inline validation, fields clear on category switch)

### Phase 3: Multi-Media Support
- [x] Multiple file attachments (up to 5 files, 50 MB combined; PDF, DOCX, PNG, JPG, GIF, MP4, MOV, PPTX)
- [x] File preview capabilities (image thumbnails, file-type icons for non-images)

### Phase 4: Draft Management
- [ ] Save ideas as drafts — Not implemented
- [ ] Edit drafts before submission — Not implemented

### Phase 5: Multi-Stage Review
- [x] Configurable evaluation stages (4-stage pipeline: Initial Screening → Technical Review → Business Impact Assessment → Final Selection)
- [x] Stage-specific actions (assigned admin advances stages; only assigned admin can proceed after claiming)

### Phase 6: Blind Review
- [ ] Anonymous evaluation mode — Not implemented
- [ ] Identity reveal after decision — Not implemented

### Phase 7: Scoring System
- [ ] Multi-dimension scoring — Not implemented
- [ ] Score aggregation and ranking — Not implemented


### Additional Features and Fixes Between Phases
- [x] UI Layout Overhaul: Fixed left sidebar with role-based nav, responsive mobile toggle
- [x] Forgot Password & My Profile: Inline password reset, editable profile page
- [x] UI/UX Refactoring: Home stage dashboard, confirmation dialogs, filter cards, table readability

  
## Technical Decisions

### Technology Stack
- **Backend**: FastAPI (Python 3.11+) + Uvicorn (ADR-000)
- **Frontend**: React 19 + Vite + TypeScript (ADR-002)
- **UI**: Tailwind CSS + shadcn/ui, governed by design-system/innovatepam/MASTER.md (ADR-003)
- **Storage**: SQLite + SQLAlchemy (async) + aiosqlite (ADR-001)
- **Auth**: JWT in httpOnly cookies + server-side sessions table for immediate invalidation (ADR-006)
- **Testing**: pytest + pytest-asyncio + httpx (backend), Vitest + React Testing Library + MSW (frontend)
- **Key Libraries**: PyJWT, passlib/bcrypt, Pydantic v2, React Router DOM, React Hook Form, Zod, Radix UI

### Key Architecture Decisions
1. **Extra data as JSON TEXT column** (ADR-010): Category-specific extra fields are stored as a single `extra_data TEXT NULL` JSON column on the `ideas` table rather than 15+ nullable typed columns. This kept the schema stable as categories evolved and moved validation to the application layer.
2. **Stage Review as a separate immutable table** (ADR-012): Each stage transition creates a new row in `stage_reviews` (idea_id, stage, outcome, comment, reviewed_by, reviewed_at) rather than overwriting inline columns. This provides a full audit trail of who reviewed at each stage and when — a requirement that emerged mid-project and superseded the original inline evaluation columns (ADR-009).
  
## Test Coverage
- **Overall**: 91% backend - 85% frontend
- **Tests passing**: 199/199 backend - 237/240 frontend tests passed.
- **Test files**: 39/41 total — 29/31 frontend (Vitest), 10/10 backend (pytest) test files passed.
- **Test types**: Unit tests + integration tests (backend hits real in-memory SQLite; frontend uses MSW mocks)

## Challenges & Solutions

### Challenge 1: Evolving data model mid-project
As features 005–007 were added, the initial single-table evaluation design became insufficient (single file → multi-file, single status → 4-stage pipeline). Each change required a migration script that preserved existing production data.
**Solution:** Each feature had its own migration script (`migrate_stage_reviews.py`, etc.) and a corresponding ADR amendment documenting what changed and why. The SQLite + SQLAlchemy async stack made incremental migrations manageable.

### Challenge 2: Running out of premium usages of Copilot and Claude
I ran out of copilot usage during the hands-on labs and some tests of precise prompts between different models. I found out late that using Opus 4.7 model consumed all my premium usage limit. I switched to my own Claude Code Pro account for projects implementation. Then after 2 days I ran out of the weekly limit of my Pro plan too.
**Solution:**  I upgraded my Claude Pro plan to Claude Max plan in order to keep developing the project. But this challenge taught a lot about the importance of context, using precise prompts even for SDD workflow matters.

## AI Collaboration

### Tools Used
- VSCode as primary IDE.
- Claude Code Sonnet 4.6  as primary coding agent: used for spec-driven development via SpecKit workflow throughout all 9 feature branches
- GitHub as primary version control

### What Worked Well
I developed the project with SDD workflow within the speckit and this approach improved my work by catching the edge cases early, recommending fixes and improvements for partial specs and also with the TDD ensured high code quality and much faster development pace without any errors.

### What Could Be Improved
In the future I would prioritize a more thorough mental mapping and rough design phase before finalizing the project constitution and specifications. Taking this extra step would prevent downstream constraints in the UI and architecture, ultimately reducing the need for time-consuming hotfixes and preventing me from hitting API usage limits prematurely.

## Time Breakdown

| Phase                                   | Actual (hours) |
| --------------------------------------- | -------------- |
| Setup & SpecKit                         | 1              |
| Phase 1: Core Portal                    | 6              |
| Phase 2: Smart Submission Forms         | 2-3            |
| Phase 3: Multi-Media Support            | 2-3            |
| Phase 4: Draft Management               | skipped        |
| Phase 5: Multi-Stage Review             | 2-3            |
| Phase 6: Blind Review                   | skipped        |
| Phase 7: Scoring System                 | skipped        |
| Additional features and fixes by myself | 2              |
| Documentation                           | 2              |
| Total                                   | ~20            |

## Reflection

### Key Learning
The most fundamental thing I learned in this bootcamp and project was experiencing how to use AI with maximum efficiency from start to finish in the development and coding processes. Looking back, I realized how much time I wasted dealing with errors and bugs, arguing with the AI when I tried to build projects using simple, vague prompts and vibe coding. Also surprised by the how precise prompts and SDD workflow can make developers life easier and how gen AI shapes and improves the whole SDLC. From now on the AI-Native loop will be my primary method in my daily work and hopefully in my engineering career.

### What I'd Do Differently
If I were to start over, I wouldn't immediately jump into using speckit and writing the constitution. Because the constitution cannot be changed once it is written and future implementations depend on it, some errors are noticed late, making it difficult to go back. I realized this after rushing into the project and starting to implement features. First, I would take a step back to roughly sketch out and design the project in my mind before creating the constitution and specifications. I noticed that when I went straight into implementation without mentally planning out future features, the constitution or earlier features could sometimes negatively affect the upcoming ones. This mostly impacted the UI, but occasionally, I had to apply hotfixes by running the speckit workflow from scratch. And most likely this problem costed my time and also the claude code premium usage limit

### SDD vs Vibe Coding
First of all, while using speckit, the `/analyze` and `/clarify` skills effectively spotted the details I missed and recommended potential improvements. This allowed me to prevent many errors and bugs that I would have otherwise encountered after the implementation was finished. Secondly, integrating TDD into this workflow by writing all the tests before the code, and testing the code both before and after writing it, improved my code quality and sped up the overall process.

### AI Collaboration Insight
Working with AI on this project really showed me how fast a product can be built. AI supports the developer through the entire process, offers suggestions, and speeds everything up. As a result, the developer gets away from the tedious parts of coding. Instead, they can spend most of their time choosing architectures, developing them, and optimizing the system. Basically, it allows them to focus on the actual engineering side of the job.

---

*Submitted by: Mustafa Özgür*
*Date: 2026-05-15*
*A201 Cohort: A!Tech Bootcamp #2, May 2026
