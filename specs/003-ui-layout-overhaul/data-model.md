# Data Model: UI Layout Overhaul — Fixed Sidebar Shell

**Branch**: `003-ui-layout-overhaul` | **Date**: 2026-05-13

---

## Summary

This feature introduces **no new database entities, tables, columns, or migrations**. All
layout changes are purely frontend (React components). The sole backend change is an additive
query filter on the existing `ideas` table.

---

## Existing Entity: `ideas` (read-only changes)

The `ideas` table schema is unchanged. The `mine` filter uses an existing column and index.

### Relevant Columns

| Column | Type | Constraint |
|--------|------|------------|
| `id` | `STRING` | Primary Key |
| `submitter_id` | `STRING` | NOT NULL |
| `submitted_at` | `STRING` | NOT NULL, ISO-8601 |

### Existing Indices (already in `backend/app/models/idea.py`)

| Index | Column | Used By |
|-------|--------|---------|
| `idx_ideas_submitted_at` | `submitted_at` | Default list order |
| `idx_ideas_submitter_id` | `submitter_id` | **mine filter** — equality lookup |

The `mine` filter executes as:
```sql
-- WITH mine=true (submitter_id_filter = current_user.id):
SELECT ideas.*, users.full_name AS submitter_name
FROM ideas JOIN users ON users.id = ideas.submitter_id
WHERE ideas.submitter_id = :submitter_id_filter
ORDER BY ideas.submitted_at DESC
LIMIT :limit OFFSET :offset;

-- Count query (same WHERE applied):
SELECT COUNT(*) FROM ideas WHERE submitter_id = :submitter_id_filter;
```

Both queries use `idx_ideas_submitter_id`, keeping latency well within the sub-100ms p95
target (Principle II) at the project's expected data volumes.

---

## Frontend-Only "Entities"

The following are React/TypeScript constructs, not database entities.

### Sidebar Shell

The sidebar shell is a React layout component with no persisted state. Its configuration
is derived entirely from the authenticated user's session data already available via
`useAuth()`.

| Property | Source | Type |
|----------|--------|------|
| `user.full_name` | `AuthContext` | `string` |
| `user.role` | `AuthContext` | `'submitter' \| 'admin'` |
| Active route | `useLocation().pathname` | `string` |
| Mobile open state | `useState(false)` | `boolean` |

### Nav Items (static configuration, not persisted)

```ts
const NAV_ITEMS = [
  { to: '/',       label: 'Home',           icon: Home,        roles: ['submitter', 'admin'] },
  { to: '/ideas',  label: 'Ideas',          icon: Lightbulb,   roles: ['submitter', 'admin'] },
  { to: '/submit', label: 'Submit an Idea', icon: PlusCircle,  roles: ['submitter'] },
  { to: '/users',  label: 'Manage Users',   icon: Users,       roles: ['admin'] },
]
```

### Ideas Page Filter State (URL-persisted)

The `mine` filter and pagination page are stored in the browser URL, not in component state
or a database. The URL is the canonical source of truth.

| URL Param | Type | Default | Example |
|-----------|------|---------|---------|
| `mine` | `'1'` \| absent | absent (show all) | `?mine=1` |
| `page` | numeric string | `'1'` | `?page=2` |

Combined: `?mine=1&page=3` — shows the third page of the current user's ideas.
