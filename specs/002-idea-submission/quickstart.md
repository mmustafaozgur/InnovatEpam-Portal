# Quickstart: Idea Submission System

**Feature**: `002-idea-submission`
**Branch**: `002-idea-submission`

---

## Prerequisites

- Feature `001-user-auth` merged and running (provides `/api/v1/auth/*`, the User model, and sessions)
- Python 3.11+ virtual environment activated
- Node 18+

---

## Backend

```bash
# From repo root
cd backend

# Install new dependency (none for this feature — python-multipart already present)
pip install -r requirements.txt

# Start server (creates ideas table on first run via init_db())
uvicorn main:app --reload --port 8000
```

The `uploads/` directory is created automatically by the service on first file write.
It is `.gitignore`d — do not commit it.

---

## Frontend

```bash
# From repo root
cd frontend

# Install new Radix dep for shadcn/ui Select
npm install @radix-ui/react-select

# Add shadcn/ui components (run once)
npx shadcn@latest add select textarea

# Start dev server
npm run dev
```

App runs at http://localhost:5173.

---

## Key Routes

| Path | Auth | Notes |
|------|------|-------|
| `/submit` | Submitter only | Idea submission form |
| `/ideas` | Any authenticated | Ideas list |
| `/ideas/:id` | Any authenticated | Idea detail |

Evaluators visiting `/submit` see the Role-Restriction Notice instead of the form.
Unauthenticated users are redirected to `/login`.

---

## Running Tests

```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd frontend
npm test
```

Per constitution Principle III, tests must be written and confirmed failing before any
implementation code is written. Run the test suite and verify failures before proceeding.

---

## Environment Variables

No new environment variables are required for this feature. The upload directory path
defaults to `./uploads` (relative to the `backend/` working directory) and can be
overridden via `UPLOAD_DIR` in `backend/.env` if needed.

```env
# backend/.env (optional override)
UPLOAD_DIR=./uploads
```
