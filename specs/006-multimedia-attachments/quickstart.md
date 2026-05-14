# Quickstart: Multi-Media Attachments (006)

**Date**: 2026-05-14 | **Branch**: `006-multimedia-attachments`

---

## Prerequisites

- Python 3.11+ virtualenv activated (`cd backend && pip install -r requirements.txt`)
- Node 20+ (`cd frontend && npm install`)
- SQLite database at `backend/innovatepam.db` (existing dev DB)

---

## Step 1 — Run Database Migration

```bash
cd backend
python scripts/migrate_attachments.py
# Expected output:
#   Created: attachments table
#   Created: idx_attachments_idea_id index
#   Migrated: N existing attachment(s) from ideas table
#   Recreated: ideas table (attachment_* columns removed)
#   Migration forward complete.
```

To verify:

```bash
sqlite3 innovatepam.db ".schema attachments"
sqlite3 innovatepam.db ".schema ideas"
# Confirm: attachments table exists; ideas table has no attachment_* columns
```

To rollback (if needed):

```bash
python scripts/migrate_attachments.py --rollback
```

---

## Step 2 — Run Backend Tests

```bash
cd backend
pytest tests/ -v
# All tests must pass (including new multi-file tests)
```

---

## Step 3 — Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

---

## Step 4 — Run Frontend Tests

```bash
cd frontend
npm test
# All tests must pass (including FileUploadControl multi-file and AttachmentsSection tests)
```

---

## Step 5 — Start Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## Smoke Test Checklist

1. **Submit idea with multiple files**
   - Navigate to Submit Idea
   - Attach 2–3 files of different types (e.g., a `.png` and a `.pdf`)
   - Verify preview tiles appear: image shows thumbnail, PDF shows icon + filename
   - Remove one tile, verify it disappears
   - Submit — verify redirect to idea detail page

2. **Detail page: inline image**
   - Open the submitted idea
   - Verify the PNG is rendered inline in the Attachments section
   - Verify the PDF shows icon + filename + Download link

3. **Access control**
   - Log in as a different (non-submitter, non-admin) user
   - Open the same idea
   - Verify the PNG is still displayed inline
   - Verify there is no Download link for the PDF
   - Try directly accessing `/api/v1/ideas/{id}/attachments/{pdf_attachment_id}` — expect 403

4. **Legacy idea compatibility**
   - Open any idea submitted before this feature (no attachments)
   - Verify the detail page loads without errors and shows no Attachments section (or empty state)

5. **Validation**
   - Attempt to attach 6 files — verify the sixth is blocked with a clear message
   - Attempt to attach a `.exe` file — verify it is rejected immediately with a clear message

---

## Uploads Directory

Files are stored at `backend/uploads/{idea_id}/{stored_name}`. This directory is created automatically at startup and must be `.gitignore`d. Existing upload files from the pre-migration single-file system remain in place at their original paths — the migration does not move them.
