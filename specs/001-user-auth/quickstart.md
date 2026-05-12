# Quickstart: User Authentication System

**Feature**: `001-user-auth` | **Date**: 2026-05-12

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

---

## Backend Setup

```bash
# 1. Navigate to backend directory (create if first time)
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install fastapi "uvicorn[standard]" "PyJWT>=2.8.0" "passlib[bcrypt]" \
            sqlalchemy aiosqlite pydantic[email] python-multipart

pip install --dev pytest pytest-asyncio httpx  # test dependencies

# 4. Create .env file (copy from example)
cp .env.example .env
# Edit .env: set JWT_SECRET to a random 32+ character string

# 5. Initialise the database (creates users + sessions tables)
python -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"

# 6. Start the development server
uvicorn app.main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | — | **Required.** Random secret for signing JWTs. Min 32 chars. |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `SESSION_TTL_HOURS` | `8` | Session lifetime in hours |
| `COOKIE_NAME` | `access_token` | Name of the httpOnly cookie |
| `DATABASE_URL` | `sqlite+aiosqlite:///./innovatepam.db` | SQLite database path |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

---

## Frontend Setup

```bash
# 1. Navigate to frontend directory (create if first time)
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env.local file
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env.local

# 4. Start the development server
npm run dev
```

The app is now available at `http://localhost:5173`.

---

## Running Tests

### Backend

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest

# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

### Frontend

```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

## Verify the Full Auth Flow

Once both servers are running:

```bash
# 1. Register the first user (will be Admin)
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin User","email":"admin@epam.com","password":"password123","privacy_policy_accepted":true}' \
  | python -m json.tool

# 2. Check current user (uses cookie)
curl -s -b cookies.txt http://localhost:8000/api/v1/auth/me | python -m json.tool

# 3. Register a second user (will be Submitter)
curl -s -c cookies2.txt -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Bob Lee","email":"bob@epam.com","password":"password123","privacy_policy_accepted":true}' \
  | python -m json.tool

# 4. List all users as Admin
curl -s -b cookies.txt http://localhost:8000/api/v1/users | python -m json.tool

# 5. Logout
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/auth/logout | python -m json.tool
```

---

## Common Issues

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `JWT_SECRET` error on startup | `.env` file missing or empty | Copy `.env.example` and set a real secret |
| `401` on all requests after login | Browser not sending cookie | Ensure `credentials: 'include'` in all `fetch()` calls and CORS `allow_credentials=True` |
| `422` on register | Password < 8 chars or invalid email | Check request body against contract in `contracts/auth.md` |
| Frontend shows login on every refresh | `/auth/me` call failing | Check backend is running and CORS origins include frontend URL |
