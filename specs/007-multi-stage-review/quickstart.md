# Developer Quickstart: Multi-Stage Review Pipeline

**Feature**: `007-multi-stage-review` | **Date**: 2026-05-14

---

## Overview

This feature replaces the single `evaluation_status` column with a four-stage pipeline backed by a
separate `stage_reviews` table. Follow this guide for local development and TDD-driven implementation.

## Prerequisites

- Python 3.11+, Node.js 18+
- Working dev environment from Feature 006 (see [006 quickstart](../006-multimedia-attachments/quickstart.md))
- Branch: `007-multi-stage-review`

---

## Backend Setup

### Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Run the database migration
```bash
cd backend
python scripts/migrate_stage_reviews.py
```
The script is idempotent — running it twice does not create duplicate records.

### Start the server
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Run backend tests
```bash
cd backend
pytest
# or targeted:
pytest tests/unit/test_idea_service.py -v
pytest tests/integration/test_idea_routes.py -v
```

---

## Frontend Setup

### Install dependencies
```bash
cd frontend
npm install
```

### Start the dev server
```bash
cd frontend
npm run dev
```

### Run frontend tests
```bash
cd frontend
npm test
```

---

## TDD Implementation Sequence

Follow Constitution Principle III strictly: write failing tests before any production code.

### Backend: Stage Advance

1. Write failing tests in `backend/tests/unit/test_idea_service.py`:
   - `advance_stage()` creates a `stage_review` record and updates `current_stage`
   - Stage skipping is rejected
   - Non-assigned admin is rejected after initial assignment
   - `final_selection` without `outcome` is rejected
   - Already-locked idea is rejected
2. Write failing tests in `backend/tests/integration/test_idea_routes.py`:
   - `POST /ideas/{id}/reviews` returns 201 with updated detail
   - Returns 403 for non-assigned admin
   - Returns 422 for locked idea
   - Returns 409 on race condition (first-admin claim)
3. Implement `StageReview` model in `backend/app/models/stage_review.py`
4. Implement `advance_stage()` in `backend/app/services/idea_service.py`
5. Add `POST /ideas/{id}/reviews` in `backend/app/api/routes/ideas.py`
6. Confirm all tests pass (green)

### Backend: Updated List and Detail Endpoints

1. Write failing tests for `stage_reviews` visibility filtering
2. Update `idea_service.get_idea()` and `idea_service.list_ideas()` to use `current_stage`
3. Update schemas in `backend/app/schemas/ideas.py`
4. Confirm tests pass

### Frontend: Stage Types and API Client

1. Update `frontend/src/types/ideas.ts` (Stage, Outcome, StageReviewRecord, AdvanceStageRequest)
2. Update `frontend/src/api/ideas.ts` (advanceStage, updated list/detail shapes)
3. Run `npm test` — existing snapshot tests will fail; update snapshots after verifying correctness

### Frontend: New Components

For each component, write the test file first, confirm it fails, then implement:

| Component | Test file |
|-----------|-----------|
| `StageTimeline.tsx` | `__tests__/StageTimeline.test.tsx` |
| `StageAdvanceForm.tsx` | `__tests__/StageAdvanceForm.test.tsx` |
| `StageBadge.tsx` | `__tests__/StageBadge.test.tsx` |
| `StageFilter.tsx` | `__tests__/StageFilter.test.tsx` |

Update `IdeaDetailPage.tsx` last, after its dependencies pass tests.

---

## Validation Checklist

- [ ] `POST /api/v1/ideas/{id}/reviews` creates a `stage_review` record and advances `current_stage`
- [ ] First admin to advance from `new_idea` becomes the assigned admin
- [ ] Only the assigned admin can advance from `initial_screening` onward
- [ ] Race condition (two admins claim `new_idea` simultaneously) returns 409
- [ ] `final_selection` requires `outcome`; locks the idea afterward
- [ ] Stage timeline shows all records for assigned admin, other admins, and original submitter
- [ ] Non-submitter, non-admin users receive an empty `stage_reviews` array
- [ ] `GET /api/v1/ideas?stage=new_idea` filters correctly
- [ ] Migration maps all old `evaluation_status` values without data loss
- [ ] `evaluation_status` column is dropped after migration
- [ ] Comment max 1000 chars enforced at API and UI layers
- [ ] New Idea stage shows as greyed/pending in the timeline when no review records exist
