# Quickstart: Smart Submission Forms

**Branch**: `005-smart-submission-forms` | **Date**: 2026-05-13

---

## Prerequisites

- Python 3.11+ with venv active (`backend/.venv`)
- Node.js 18+ with deps installed (`frontend/`)
- The database file exists at `backend/innovatepam.db` (or will be created by `init_db`)

---

## Step 1: Run the Database Migration

```bash
cd backend
python scripts/migrate_extra_data.py
```

Expected output:
```
  Added: extra_data
  Updating category CHECK constraint (table recreation)...
  Recreated: ideas table with expanded category constraint
  Migration complete.
```

If the migration has already been run, it reports "Skipped" for each step.

---

## Step 2: Start the Backend

```bash
cd backend
uvicorn main:app --reload
```

The server starts at `http://localhost:8000`. Verify the migration took effect:

```bash
curl -s http://localhost:8000/api/v1/ideas | python -m json.tool | grep extra_data
```

Each idea entry should include `"extra_data": null` (or a value for any already-submitted ideas).

---

## Step 3: Start the Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Navigate to **Submit an Idea**.

---

## Step 4: Manual Smoke Tests

### Test dynamic form fields

1. Select **Process Improvement** → verify "Target Process" and "Estimated Time Saved per Week" fields appear.
2. Switch to **Technology** → verify previous fields disappear and "Technology / Tool Name" and "Affected Systems or Teams" appear.
3. Switch to **Other** → verify all extra fields disappear.

### Test validation

1. Select **Cost Saving**, leave "Projected Annual Saving (USD)" blank → try submitting → should see inline error on that field.
2. Fill in all required fields → submit → should succeed and redirect to the detail page.

### Test detail page rendering

1. Open an idea with extra data → should see a **Details** section with human-readable labels and values.
2. Open a pre-existing idea (null extra_data) → page should render without errors; no Details section shown.

---

## Step 5: Run the Test Suite

### Backend

```bash
cd backend
pytest tests/test_extra_data_validation.py tests/test_ideas_api_extra_data.py -v
```

### Frontend

```bash
cd frontend
npm run test
```

---

## Rollback

If the migration needs to be reversed:

```bash
cd backend
python scripts/migrate_extra_data.py --rollback
```

The rollback:
1. Drops the `extra_data` column (via table recreation, since SQLite doesn't support DROP COLUMN in older versions).
2. Restores the original 4-value category CHECK constraint.

> **Note**: Rollback discards any `extra_data` values already stored. Only run in non-production environments.
