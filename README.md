# InnovatEpam Portal

An employee innovation management platform built as a capstone project for the EPAM AI Bootcamp. It lets employees submit ideas, attach supporting files, and track them through a multi-stage evaluation workflow — while admins manage users and move ideas through review stages.

---

## Features

- **Authentication** — Register, login, logout with cookie-based JWT sessions
- **Role-based access** — Submitter and Admin roles with protected routes
- **Idea submission** — Title, description, category, dynamic extra fields, and file attachments
- **Idea listing & filtering** — Filter by stage or show only your own ideas
- **Multi-stage evaluation** — Ideas progress through configurable review stages with comments
- **Idea detail view** — Full timeline, attachments, stage history
- **User management** — Admin-only page to manage all users
- **Profile management** — Update account info and change password
- **Forgot password** — Password reset flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async), SQLite, Pydantic, PyJWT, passlib |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), React Router v6, React Hook Form, Zod |
| Backend Testing | pytest, pytest-asyncio, httpx |
| Frontend Testing | Vitest, React Testing Library, Playwright |

---

## Prerequisites

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd InnovatEpam-Portal
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Configure environment variables:**

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

`.env` settings:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `changeme-replace-with-32-plus-chars` | Secret key for signing JWT tokens (min 32 chars) |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `SESSION_TTL_HOURS` | `8` | Session lifetime in hours |
| `COOKIE_NAME` | `access_token` | Name of the auth cookie |
| `DATABASE_URL` | `sqlite+aiosqlite:///./innovatepam.db` | SQLite database path |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins (comma-separated) |

**Start the backend server:**

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running Tests

### Backend

```bash
cd backend
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate

pytest
```

### Frontend

```bash
cd frontend

# Run all tests once
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

---

## Project Structure

```
InnovatEpam-Portal/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Auth, users, ideas endpoints
│   │   ├── core/             # Config, security utilities
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic layer
│   ├── tests/
│   │   ├── integration/      # API route integration tests
│   │   └── unit/             # Service and utility unit tests
│   ├── main.py               # FastAPI app entrypoint
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── api/              # API client functions
        ├── components/       # Reusable UI components
        ├── context/          # React context (auth state)
        ├── pages/            # Route-level page components
        └── types/            # TypeScript type definitions
```

---

## Development Methodology

This project was built entirely using an **AI-Native, Spec-Driven Development** workflow — no feature was coded before a specification and implementation plan existed.

### Spec-Driven Development with SpecKit

Every feature followed a strict four-step pipeline enforced by the **SpecKit** workflow:

```
/speckit-specify  →  /speckit-plan  →  /speckit-tasks  →  /speckit-implement
```

| Step | Command | Output |
|---|---|---|
| 1. Specify | `/speckit-specify` | `spec.md` — feature requirements and acceptance criteria |
| 2. Plan | `/speckit-plan` | `plan.md` — architecture decisions, phases, ADR references |
| 3. Tasks | `/speckit-tasks` | `tasks.md` — ordered, dependency-resolved implementation tasks |
| 4. Implement | `/speckit-implement` | Working code, tests written before implementation (TDD) |

All feature specs and plans live under `specs/` in the repository, providing a full traceable history from idea to shipped code.

### AI-Native Development

All implementation was produced with AI assistance under the **Red-Green-Refactor** TDD discipline:

- Tests were written and confirmed **failing** before any production code was written
- Implementation was driven by the spec and plan artifacts — not improvised
- Every architectural decision was recorded as an ADR in `docs/adr/` before implementation began
- UI work was gated on the design system (`design-system/innovatepam/MASTER.md`) — no ad-hoc styling

### Tools

| Tool | Purpose |
|---|---|
| **Visual Studio Code** | Primary IDE |
| **Claude Code** (Sonnet 4.6 High) | AI coding assistant — spec generation, implementation, test authoring, code review |
| **SpecKit** | Spec-driven workflow CLI (`/speckit-*` slash commands inside Claude Code) |
| **Git** | Version control with sequential feature branch naming (`###-feature-name`) |

---

## API Overview

All endpoints are prefixed with `/api/v1`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive session cookie |
| POST | `/auth/logout` | Logout and clear session |
| GET | `/users/me` | Get current user profile |
| PUT | `/users/me` | Update profile info |
| POST | `/users/me/change-password` | Change password |
| GET | `/users/` | List all users (admin only) |
| GET | `/ideas/` | List ideas (filterable) |
| POST | `/ideas/` | Submit a new idea |
| GET | `/ideas/{id}` | Get idea detail |
| POST | `/ideas/{id}/advance` | Advance idea to next stage (admin) |
| POST | `/ideas/{id}/attachments` | Upload file attachment |
| GET | `/ideas/{id}/attachments/{name}` | Download attachment |
