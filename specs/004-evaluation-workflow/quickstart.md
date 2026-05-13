# Quickstart: Evaluation Workflow

**Branch**: `004-evaluation-workflow` | **Date**: 2026-05-13

This guide explains how to set up, run, and manually test the evaluation workflow feature from a
clean checkout or an existing development environment.

---

## Prerequisites

- Python 3.11+ with a working virtual environment (`backend/.venv`)
- Node.js 20+ with `npm`
- The project checked out on branch `004-evaluation-workflow`

---

## 1. Database Migration

> **Required for existing databases.** A fresh checkout with no `innovatepam.db` file will
> auto-create the correct schema when the backend starts — skip to step 2.

If you already have a `backend/innovatepam.db` file from a prior branch, run the migration script:

```bash
cd backend
python scripts/migrate_eval.py
```

Expected output:
```
  Added: evaluation_status
  Added: evaluation_comment
  Added: evaluated_at
  Added: assigned_admin_id
Migration complete.
```

The script is idempotent — running it multiple times is safe.

---

## 2. Start the Backend

```bash
cd backend
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

On first startup with no DB file, `init_db()` creates the `ideas` table with all evaluation
columns included.

---

## 3. Start the Frontend

```bash
cd frontend
npm install          # first time only
npm run dev
```

Frontend available at `http://localhost:5173`.

---

## 4. Design System Gate (UI Tasks Only)

> **IMPORTANT**: Before implementing any UI component for this feature, amend
> `design-system/innovatepam/MASTER.md` via `/ui-ux-pro-max`.

Components that need MASTER.md coverage:

| Component | Purpose |
|-----------|---------|
| `EvaluationStatusBadge` | Colored badge: submitted (slate), under_review (blue), accepted (green), rejected (red) |
| `EvaluationForm` | Admin panel: status select (locked on comment-update) + comment textarea with 1,000-char counter |
| `StatusFilter` | Dropdown in filter bar alongside "My Ideas" toggle |

Run `/ui-ux-pro-max` and describe the three components above. Confirm MASTER.md is updated before
writing any `.tsx` file for this feature.

---

## 5. Run Tests

### Backend

```bash
cd backend
pytest tests/unit/test_idea_service.py -v      # unit tests
pytest tests/integration/test_idea_routes.py -v # integration tests
```

Per TDD (Principle III): run these **before** writing implementation code and confirm they **fail**.
Then implement until they pass.

### Frontend

```bash
cd frontend
npm test                      # Vitest unit tests
npm run test:integration      # Integration tests (if configured)
```

---

## 6. Manual Test Flow

### 6.1 Happy Path: Full Evaluation Lifecycle

1. Log in as a **submitter** and submit a new idea.
2. Verify the idea appears in the list with status badge "Submitted".
3. Log in as **admin**.
4. Open the idea detail page. Verify the evaluation form is visible (admin only).
5. Submit status "Under Review" with a comment.
6. Log back in as the **submitter**. Open the idea. Confirm:
   - Status badge shows "Under Review".
   - No comment is visible.
7. Log back in as **admin**. Open the idea. Confirm:
   - Status badge shows "Under Review".
   - Comment is visible.
8. Submit status "Accepted" with a comment.
9. Log in as the **submitter**. Confirm:
   - Status badge shows "Accepted".
   - Comment is now visible.

### 6.2 Status Filter

1. Seed ideas across multiple statuses (use the admin panel to evaluate several).
2. On the ideas list, open the status filter dropdown.
3. Select "Under Review" — only under-review ideas appear.
4. Enable "My Ideas" toggle as well — verify the AND combination works.
5. Select "All statuses" — all ideas reappear.

### 6.3 Lock Enforcement

1. Evaluate an idea to "Accepted".
2. Attempt to re-evaluate it via the UI or directly via `curl`:

```bash
curl -X PATCH http://localhost:8000/ideas/{idea_id}/evaluate \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'
```

Expected: HTTP 409 with `"This idea is locked"`.

### 6.4 Non-Assigned Admin Blocked

1. Log in as admin A; move idea to "Under Review".
2. Log in as admin B; attempt to evaluate the same idea.
3. Expected: HTTP 403 `"Only the assigned admin may evaluate this idea."`.

---

## 7. API Reference Quick-look

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `PATCH` | `/ideas/{id}/evaluate` | admin | Evaluate (transition or comment update) |
| `GET` | `/ideas?status=…` | any authenticated | Filter list by evaluation status |
| `GET` | `/ideas/{id}` | any authenticated | Idea detail with evaluation info |

Full contract: [contracts/evaluate-idea.md](contracts/evaluate-idea.md)
