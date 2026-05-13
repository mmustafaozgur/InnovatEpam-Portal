import pytest
from app.schemas.extra_data import validate_extra_data


class TestRequiredField:
    def test_required_text_field_absent_returns_error(self):
        errors = validate_extra_data("process_improvement", {})
        assert "target_process" in errors
        assert errors["target_process"] == "This field is required."

    def test_required_number_field_absent_returns_error(self):
        errors = validate_extra_data("cost_saving", {"current_annual_cost_usd": None})
        assert "projected_annual_saving_usd" in errors
        assert errors["projected_annual_saving_usd"] == "This field is required."

    def test_required_select_field_absent_returns_error(self):
        errors = validate_extra_data("workplace_culture", {"target_group": "Engineers"})
        assert "recurring_or_one_time" in errors
        assert errors["recurring_or_one_time"] == "This field is required."

    def test_null_extra_data_with_required_fields_returns_errors(self):
        errors = validate_extra_data("talent_development", None)
        assert "target_audience" in errors
        assert "skill_area" in errors


class TestTextFieldMaxLength:
    def test_text_exceeds_max_length_returns_error(self):
        errors = validate_extra_data(
            "process_improvement",
            {"target_process": "x" * 201},
        )
        assert "target_process" in errors
        assert "200" in errors["target_process"]

    def test_text_at_max_length_is_valid(self):
        errors = validate_extra_data(
            "process_improvement",
            {"target_process": "x" * 200},
        )
        assert "target_process" not in errors

    def test_optional_text_exceeds_max_length_returns_error(self):
        errors = validate_extra_data(
            "technology",
            {"technology_tool_name": "Python", "affected_systems_or_teams": "y" * 301},
        )
        assert "affected_systems_or_teams" in errors
        assert "300" in errors["affected_systems_or_teams"]


class TestNumberField:
    def test_non_numeric_string_returns_error(self):
        errors = validate_extra_data(
            "cost_saving",
            {"projected_annual_saving_usd": "not-a-number"},
        )
        assert "projected_annual_saving_usd" in errors
        assert errors["projected_annual_saving_usd"] == "Must be a number."

    def test_valid_integer_is_accepted(self):
        errors = validate_extra_data(
            "cost_saving",
            {"projected_annual_saving_usd": 5000},
        )
        assert "projected_annual_saving_usd" not in errors

    def test_valid_float_is_accepted(self):
        errors = validate_extra_data(
            "process_improvement",
            {"target_process": "Review", "estimated_time_saved_per_week": 2.5},
        )
        assert "estimated_time_saved_per_week" not in errors


class TestSelectField:
    def test_invalid_select_option_returns_error(self):
        errors = validate_extra_data(
            "workplace_culture",
            {"target_group": "All", "recurring_or_one_time": "monthly"},
        )
        assert "recurring_or_one_time" in errors
        assert "recurring" in errors["recurring_or_one_time"]
        assert "one_time" in errors["recurring_or_one_time"]

    def test_valid_select_option_recurring_accepted(self):
        errors = validate_extra_data(
            "workplace_culture",
            {"target_group": "All", "recurring_or_one_time": "recurring"},
        )
        assert "recurring_or_one_time" not in errors

    def test_valid_select_option_one_time_accepted(self):
        errors = validate_extra_data(
            "workplace_culture",
            {"target_group": "All", "recurring_or_one_time": "one_time"},
        )
        assert "recurring_or_one_time" not in errors


class TestOtherCategory:
    def test_other_with_non_null_extra_data_returns_error(self):
        errors = validate_extra_data("other", {"some_key": "some_value"})
        assert "__root__" in errors
        assert "other" in errors["__root__"].lower()

    def test_other_with_null_extra_data_returns_empty(self):
        errors = validate_extra_data("other", None)
        assert errors == {}

    def test_other_with_empty_dict_returns_empty(self):
        errors = validate_extra_data("other", {})
        assert errors == {}


class TestValidPayload:
    def test_valid_process_improvement_required_only(self):
        errors = validate_extra_data(
            "process_improvement",
            {"target_process": "Onboarding review"},
        )
        assert errors == {}

    def test_valid_process_improvement_all_fields(self):
        errors = validate_extra_data(
            "process_improvement",
            {"target_process": "Onboarding review", "estimated_time_saved_per_week": 3},
        )
        assert errors == {}

    def test_optional_number_field_absent_null_extra_data_is_valid(self):
        """FR-005: optional extra fields must not block submission."""
        errors = validate_extra_data("process_improvement", {"target_process": "Review"})
        assert "estimated_time_saved_per_week" not in errors

    def test_valid_talent_development_required_fields(self):
        errors = validate_extra_data(
            "talent_development",
            {"target_audience": "All engineers", "skill_area": "Cloud"},
        )
        assert errors == {}

    def test_valid_client_delivery(self):
        errors = validate_extra_data(
            "client_delivery",
            {"affected_delivery_phase": "Design", "client_impact": "Reduced delays"},
        )
        assert errors == {}
