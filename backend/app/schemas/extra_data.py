from __future__ import annotations

from typing import Any

CATEGORY_FIELD_SCHEMA: dict[str, list[dict[str, Any]]] = {
    "process_improvement": [
        {"key": "target_process", "label": "Target Process", "type": "text", "required": True, "max_length": 200},
        {"key": "estimated_time_saved_per_week", "label": "Estimated Time Saved per Week", "type": "number", "required": False},
    ],
    "technology": [
        {"key": "technology_tool_name", "label": "Technology / Tool Name", "type": "text", "required": True, "max_length": 200},
        {"key": "affected_systems_or_teams", "label": "Affected Systems or Teams", "type": "text", "required": False, "max_length": 300},
    ],
    "cost_saving": [
        {"key": "current_annual_cost_usd", "label": "Current Annual Cost (USD)", "type": "number", "required": False},
        {"key": "projected_annual_saving_usd", "label": "Projected Annual Saving (USD)", "type": "number", "required": True},
    ],
    "talent_development": [
        {"key": "target_audience", "label": "Target Audience", "type": "text", "required": True, "max_length": 200},
        {"key": "skill_area", "label": "Skill Area", "type": "text", "required": True, "max_length": 200},
        {"key": "estimated_duration_hours", "label": "Estimated Duration in Hours", "type": "number", "required": False},
    ],
    "client_delivery": [
        {"key": "affected_delivery_phase", "label": "Affected Delivery Phase", "type": "text", "required": True, "max_length": 200},
        {"key": "client_impact", "label": "Client Impact", "type": "text", "required": True, "max_length": 300},
    ],
    "workplace_culture": [
        {"key": "target_group", "label": "Target Group", "type": "text", "required": True, "max_length": 200},
        {
            "key": "recurring_or_one_time",
            "label": "Recurring or One-Time",
            "type": "select",
            "required": True,
            "options": ["recurring", "one_time"],
        },
    ],
    "other": [],
}


def validate_extra_data(
    category: str,
    extra_data: dict | None,
) -> dict[str, str]:
    """
    Returns field_key -> error_message for each violation. Empty dict means valid.
    Callers must check: if errors: raise HTTPException(422, detail={"extra_data": errors})
    """
    errors: dict[str, str] = {}

    if category == "other":
        if extra_data:
            errors["__root__"] = "Category 'other' must not have extra data."
        return errors

    fields = CATEGORY_FIELD_SCHEMA.get(category, [])
    if not fields:
        return errors

    data = extra_data or {}

    for field in fields:
        key: str = field["key"]
        ftype: str = field["type"]
        required: bool = field["required"]
        value = data.get(key)

        empty = value is None or (isinstance(value, str) and value.strip() == "")

        if required and empty:
            errors[key] = "This field is required."
            continue

        if empty:
            continue

        if ftype == "text":
            max_length = field.get("max_length")
            if max_length is not None and isinstance(value, str) and len(value) > max_length:
                errors[key] = f"Must be {max_length} characters or fewer."

        elif ftype == "number":
            try:
                float(value)
            except (TypeError, ValueError):
                errors[key] = "Must be a number."

        elif ftype == "select":
            options: list[str] = field.get("options", [])
            if value not in options:
                errors[key] = f"Must be one of: {', '.join(options)}."

    return errors
