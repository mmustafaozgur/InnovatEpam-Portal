import json
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_user, authenticated_client


@pytest_asyncio.fixture
async def submitter_client(async_client: AsyncClient, test_db: AsyncSession):
    user = await create_test_user(test_db, role="submitter")
    return await authenticated_client(async_client, test_db, user)


class TestCreateIdeaWithExtraData:
    async def test_valid_process_improvement_stores_and_returns_extra_data(
        self, submitter_client: AsyncClient
    ):
        payload = {
            "target_process": "Onboarding checklist review",
            "estimated_time_saved_per_week": 3,
        }
        data = {
            "title": "Test Idea",
            "description": "A description",
            "category": "process_improvement",
            "extra_data": json.dumps(payload),
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["extra_data"] == payload

    async def test_optional_extra_field_absent_returns_201(
        self, submitter_client: AsyncClient
    ):
        """FR-005: optional extra fields must NOT block submission."""
        data = {
            "title": "Process Idea",
            "description": "Improve onboarding",
            "category": "process_improvement",
            "extra_data": json.dumps({"target_process": "Onboarding"}),
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 201

    async def test_missing_required_field_returns_422_with_field_keyed_errors(
        self, submitter_client: AsyncClient
    ):
        """Missing projected_annual_saving_usd for cost_saving returns 422 with per-field error."""
        data = {
            "title": "Cost Idea",
            "description": "Save money",
            "category": "cost_saving",
            "extra_data": json.dumps({"current_annual_cost_usd": 50000}),
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 422
        body = resp.json()
        assert "extra_data" in body["detail"]
        assert "projected_annual_saving_usd" in body["detail"]["extra_data"]

    async def test_other_category_with_no_extra_data_stores_null(
        self, submitter_client: AsyncClient
    ):
        data = {
            "title": "Other Idea",
            "description": "Some description",
            "category": "other",
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["extra_data"] is None

    async def test_invalid_json_extra_data_returns_422(
        self, submitter_client: AsyncClient
    ):
        data = {
            "title": "Broken JSON",
            "description": "Description",
            "category": "process_improvement",
            "extra_data": "not-valid-json",
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 422

    async def test_new_category_talent_development_accepted(
        self, submitter_client: AsyncClient
    ):
        data = {
            "title": "Training Idea",
            "description": "Improve skills",
            "category": "talent_development",
            "extra_data": json.dumps({
                "target_audience": "All engineers",
                "skill_area": "Cloud infrastructure",
                "estimated_duration_hours": 8,
            }),
        }
        resp = await submitter_client.post("/api/v1/ideas", data=data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["extra_data"]["target_audience"] == "All engineers"

    async def test_get_idea_returns_extra_data(
        self, submitter_client: AsyncClient
    ):
        payload = {"target_process": "Review", "estimated_time_saved_per_week": 2}
        create_data = {
            "title": "Get Test",
            "description": "Get extra data test",
            "category": "process_improvement",
            "extra_data": json.dumps(payload),
        }
        create_resp = await submitter_client.post("/api/v1/ideas", data=create_data)
        assert create_resp.status_code == 201
        idea_id = create_resp.json()["id"]

        get_resp = await submitter_client.get(f"/api/v1/ideas/{idea_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["extra_data"] == payload


class TestListIdeasExtraData:
    async def test_list_includes_extra_data_on_matching_entry(
        self, submitter_client: AsyncClient
    ):
        payload = {"projected_annual_saving_usd": 12000}
        create_data = {
            "title": "List Test",
            "description": "For list check",
            "category": "cost_saving",
            "extra_data": json.dumps(payload),
        }
        resp = await submitter_client.post("/api/v1/ideas", data=create_data)
        assert resp.status_code == 201
        idea_id = resp.json()["id"]

        list_resp = await submitter_client.get("/api/v1/ideas?mine=true")
        assert list_resp.status_code == 200
        ideas = list_resp.json()["ideas"]
        match = next((i for i in ideas if i["id"] == idea_id), None)
        assert match is not None
        assert match["extra_data"] == payload

    async def test_other_category_extra_data_is_null_not_absent(
        self, submitter_client: AsyncClient
    ):
        create_data = {
            "title": "Other List",
            "description": "For null check",
            "category": "other",
        }
        resp = await submitter_client.post("/api/v1/ideas", data=create_data)
        assert resp.status_code == 201
        idea_id = resp.json()["id"]

        list_resp = await submitter_client.get("/api/v1/ideas?mine=true")
        assert list_resp.status_code == 200
        ideas = list_resp.json()["ideas"]
        match = next((i for i in ideas if i["id"] == idea_id), None)
        assert match is not None
        assert "extra_data" in match
        assert match["extra_data"] is None
