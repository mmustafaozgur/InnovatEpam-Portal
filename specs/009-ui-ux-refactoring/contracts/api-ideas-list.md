# Contract: GET /api/v1/ideas — Multi-Stage Filter Extension

## Change Type

Backwards-compatible extension of an existing endpoint query parameter.

## Endpoint

```
GET /api/v1/ideas
```

## Query Parameters (updated)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | `int` (≥1) | No (default: 1) | Pagination page number |
| `limit` | `int` (1–100) | No (default: 20) | Items per page |
| `mine` | `bool` | No (default: false) | Restrict to caller's ideas |
| `stage` | `Stage` (repeated) | No | Filter by one or more stages. May be repeated: `?stage=new_idea&stage=technical_review` |

**Stage enum values**: `new_idea`, `initial_screening`, `technical_review`, `business_impact_assessment`, `final_selection`

## Behaviour

| `stage` param | Effect |
|---------------|--------|
| Absent | All ideas returned (no stage filter) |
| `?stage=new_idea` | Only `new_idea` ideas |
| `?stage=new_idea&stage=technical_review` | Ideas in `new_idea` OR `technical_review` |

## Response (unchanged)

```json
{
  "ideas": [IdeaSummaryResponse],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

## Backwards Compatibility

- A single `?stage=x` call behaves identically to the previous implementation.
- Callers sending no `stage` param are unaffected.

## Files Changed

- `backend/app/api/routes/ideas.py` — `list_ideas` route: `Optional[Stage]` → `Optional[List[Stage]]`
- `backend/app/services/idea_service.py` — `list_ideas` service: `== stage_filter` → `.in_(stage_filter)`
- `frontend/src/api/ideas.ts` — `listIdeas` function: `stage?: Stage` → `stages?: Stage[]`

## Tests Required (TDD — write tests first)

### Backend (pytest)

- `test_list_ideas_multi_stage_filter`: Call with `?stage=new_idea&stage=technical_review` → only those stages returned.
- `test_list_ideas_single_stage_backwards_compat`: Existing single-stage tests still pass unchanged.
- `test_list_ideas_no_stage_filter`: No `stage` param → all ideas returned.

### Frontend (Vitest)

- `listIdeas` unit test: when `stages=['new_idea', 'technical_review']` → URL includes two `stage=` params.
- `listIdeas` unit test: when `stages=[]` or `stages=undefined` → no `stage=` param in URL.
