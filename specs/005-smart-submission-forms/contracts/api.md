# API Contract Changes: Smart Submission Forms

**Branch**: `005-smart-submission-forms` | **Date**: 2026-05-13

All changes are additive (backward-compatible). Existing clients that ignore unknown fields are unaffected. Clients that strictly validate response shapes must be updated to accept `extra_data`.

---

## 1. `POST /api/v1/ideas` — Submit Idea

### Change

New optional form field added.

### Request (multipart/form-data)

| Field | Type | Required | Change |
|-------|------|----------|--------|
| title | string | Yes | Unchanged |
| description | string | Yes | Unchanged |
| category | string | Yes | Expanded: now accepts 7 values (was 4) |
| file | binary | No | Unchanged |
| extra_data | string (JSON) | No | **NEW** — JSON-serialised extra fields for the selected category |

**`extra_data` field**:
- Must be a valid JSON string when present
- When `category = "other"`: MUST be omitted or null
- For all other categories: MUST contain all required keys for that category (see data-model.md §3.2)
- If server-side validation fails: HTTP 422 with per-field error map (see §1.1 below)

### `category` Accepted Values (expanded)

| Value | New? |
|-------|------|
| process_improvement | Existing |
| technology | Existing |
| cost_saving | Existing |
| other | Existing |
| talent_development | **New** |
| client_delivery | **New** |
| workplace_culture | **New** |

### Response (`IdeaDetailResponse`) — Change

Added field:
```json
{
  "extra_data": {
    "target_process": "Onboarding checklist review",
    "estimated_time_saved_per_week": 3
  }
}
```
Or `null` if no extra fields were provided.

### 1.1 Validation Error Response (HTTP 422)

When `extra_data` fails server-side validation, the response has this shape:

```json
{
  "detail": {
    "extra_data": {
      "projected_annual_saving_usd": "This field is required.",
      "current_annual_cost_usd": "Must be a number."
    }
  }
}
```

The frontend maps each key to its corresponding form field to display inline errors.

---

## 2. `GET /api/v1/ideas` — List Ideas

### Change

`extra_data` field added to each idea entry in the response.

### Response (`IdeaListResponse`)

```json
{
  "ideas": [
    {
      "id": "...",
      "title": "...",
      "category": "cost_saving",
      "submitter_name": "...",
      "submitted_at": "...",
      "has_attachment": false,
      "evaluation_status": "submitted",
      "reviewer_name": null,
      "extra_data": {
        "current_annual_cost_usd": 50000,
        "projected_annual_saving_usd": 12000
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

`extra_data` is `null` for ideas that have none (pre-existing ideas, `other` category).

---

## 3. `GET /api/v1/ideas/{id}` — Get Idea Detail

### Change

`extra_data` field added to the response.

### Response (`IdeaDetailResponse`)

```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "category": "talent_development",
  "submitter_id": "...",
  "submitter_name": "...",
  "submitted_at": "...",
  "file": null,
  "evaluation": { "status": "submitted", "comment": null, "evaluated_at": null, "assigned_admin_id": null, "assigned_admin_name": null },
  "extra_data": {
    "target_audience": "All engineers",
    "skill_area": "Cloud infrastructure",
    "estimated_duration_hours": 8
  }
}
```

---

## 4. Unchanged Endpoints

| Endpoint | Status |
|----------|--------|
| `PATCH /api/v1/ideas/{id}/evaluate` | Unchanged — evaluators cannot modify `extra_data` |
| `GET /api/v1/ideas/{id}/attachment` | Unchanged |
| All auth endpoints | Unchanged |
| All user endpoints | Unchanged |

---

## 5. Extra Data Key Reference

| Category | Key | Value Type | Required |
|----------|-----|-----------|----------|
| process_improvement | target_process | string (max 200) | Yes |
| process_improvement | estimated_time_saved_per_week | number \| null | No |
| technology | technology_tool_name | string (max 200) | Yes |
| technology | affected_systems_or_teams | string (max 300) \| null | No |
| cost_saving | current_annual_cost_usd | number \| null | No |
| cost_saving | projected_annual_saving_usd | number | Yes |
| talent_development | target_audience | string (max 200) | Yes |
| talent_development | skill_area | string (max 200) | Yes |
| talent_development | estimated_duration_hours | number \| null | No |
| client_delivery | affected_delivery_phase | string (max 200) | Yes |
| client_delivery | client_impact | string (max 300) | Yes |
| workplace_culture | target_group | string (max 200) | Yes |
| workplace_culture | recurring_or_one_time | "recurring" \| "one_time" | Yes |
| other | (none) | — | — |
