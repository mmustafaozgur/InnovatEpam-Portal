# API Contract: Multi-Stage Review Pipeline

**Feature**: `007-multi-stage-review` | **Date**: 2026-05-14

---

## Shared Types

```typescript
type Stage =
  | 'new_idea'
  | 'initial_screening'
  | 'technical_review'
  | 'business_impact_assessment'
  | 'final_selection'

type Outcome = 'accepted' | 'rejected'

interface StageReviewRecord {
  id: string
  stage: Stage
  outcome: Outcome | null      // non-null only at final_selection
  comment: string | null       // max 1000 chars; null if no comment was given
  reviewer_name: string | null // null for migrated records without an assigned admin
  reviewed_at: string          // ISO 8601 UTC
}

interface AttachmentInfo {
  id: string
  name: string
  size: number
  mime_type: string
  is_image: boolean
}

interface IdeaDetailResponse {
  id: string
  title: string
  description: string
  category: string
  submitter_id: string
  submitter_name: string
  submitted_at: string              // ISO 8601
  attachments: AttachmentInfo[]
  current_stage: Stage              // CHANGED: replaces evaluation.status
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  stage_reviews: StageReviewRecord[] // server-side filtered per FR-009 visibility rules
  extra_data: Record<string, unknown> | null
}

interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string       // ISO 8601
  attachment_count: number
  current_stage: Stage       // CHANGED: replaces evaluation_status
  reviewer_name: string | null // assigned admin's display name
  extra_data: Record<string, unknown> | null
}

interface IdeaListResponse {
  ideas: IdeaSummaryResponse[]
  total: number
  page: number
  limit: number
}

interface AdvanceStageRequest {
  comment?: string | null   // optional, max 1000 chars
  outcome?: Outcome | null  // required when advancing to final_selection
}
```

---

## Endpoints

### `POST /api/v1/ideas` — Submit Idea *(unchanged)*

No changes from Feature 006.

---

### `GET /api/v1/ideas` — List Ideas *(modified)*

**Query Parameters**:

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `page` | `int` | No (default `1`) | |
| `limit` | `int` | No (default `20`) | |
| `mine` | `bool` | No (default `false`) | Filter to current user's ideas |
| `stage` | `Stage` | No | **CHANGED** — replaces `status`; filters by `current_stage` |

**Response**: `200 OK` → `IdeaListResponse`

**Breaking changes from Feature 004**:
- Query param `?status=` removed; use `?stage=` (old values not accepted).
- `IdeaSummaryResponse.evaluation_status` → `IdeaSummaryResponse.current_stage`.

---

### `GET /api/v1/ideas/{idea_id}` — Get Idea Detail *(modified)*

**Response**: `200 OK` → `IdeaDetailResponse`

**Breaking changes from Feature 004**:
- Top-level `evaluation` block removed; replaced by:
  - `current_stage: Stage`
  - `assigned_admin_id: string | null`
  - `assigned_admin_name: string | null`
  - `stage_reviews: StageReviewRecord[]`
- `stage_reviews` visibility (applied server-side per FR-009):

| Caller role | `stage_reviews` content |
|-------------|------------------------|
| Assigned admin | All records |
| Other admin | All records (read-only) |
| Original submitter | All records (read-only) |
| Other authenticated user | `[]` (empty; current_stage still shown) |

---

### `POST /api/v1/ideas/{idea_id}/reviews` — Advance Stage *(new)*

**Authentication**: Required. Caller must have `role = 'admin'`.

**Request Body**: `AdvanceStageRequest`

**Response**: `201 Created` → `IdeaDetailResponse` (full updated idea detail)

**Error Responses**:

| HTTP Status | Condition |
|------------|-----------|
| `401 Unauthorized` | Not authenticated |
| `403 Forbidden` | Caller is not an admin; or idea is past `new_idea` and caller is not the assigned admin |
| `404 Not Found` | `idea_id` does not exist |
| `409 Conflict` | Race condition — idea was claimed by another admin between the caller's request and the DB write |
| `422 Unprocessable Entity` | Idea is at `final_selection` (locked); or `outcome` missing when advancing to `final_selection`; or `comment` exceeds 1000 chars |

**Business Rules**:
1. Any admin may advance a `new_idea` to `initial_screening` — the first to do so becomes the assigned admin (`assigned_admin_id`).
2. Only the assigned admin may advance from `initial_screening` onward.
3. Stage advances exactly one step (no skipping, no backward movement).
4. `outcome` MUST be provided when the next stage is `final_selection`.
5. No advance is permitted when `current_stage == 'final_selection'` (terminal/locked).
6. A created `stage_review` record is immutable — no UPDATE or DELETE is permitted.

---

### `GET /api/v1/ideas/{idea_id}/attachments/{attachment_id}` — Download Attachment *(unchanged)*

No changes from Feature 006.

---

### `PATCH /api/v1/ideas/{idea_id}/evaluate` — Evaluate Idea *(REMOVED)*

This endpoint is removed. Use `POST /api/v1/ideas/{idea_id}/reviews` instead.

---

## Frontend API Client Changes

**`frontend/src/types/ideas.ts`**:
- Remove: `EvaluationStatus`, `EvaluationInfo`, `EvaluateIdeaRequest`
- Add: `Stage`, `Outcome`, `StageReviewRecord`, `AdvanceStageRequest`
- Modify: `IdeaDetailResponse` — remove `evaluation`, add `current_stage`, `assigned_admin_id`, `assigned_admin_name`, `stage_reviews`
- Modify: `IdeaSummaryResponse` — `evaluation_status` → `current_stage`

**`frontend/src/api/ideas.ts`**:
- Remove: `evaluateIdea(id, status, comment)`
- Add: `advanceStage(id: string, body: AdvanceStageRequest): Promise<IdeaDetailResponse>`
- Modify: `listIdeas(params)` — `status` query param → `stage` query param
- Modify: `getIdea(id)` — update return type to new `IdeaDetailResponse` shape
