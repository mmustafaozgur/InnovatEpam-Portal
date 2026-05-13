import io
import pytest
import pytest_asyncio

from tests.conftest import create_test_user, authenticated_client


# ---------------------------------------------------------------------------
# POST /api/v1/ideas — US1
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_submitter_201(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "My Idea", "description": "A great idea", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "My Idea"
    assert body["submitter_id"] == user.id
    assert "id" in body


@pytest.mark.asyncio
async def test_submit_idea_missing_title_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"description": "A desc", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_submit_idea_missing_description_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "Title", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_submit_idea_missing_category_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "Title", "description": "desc"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_submit_idea_evaluator_403(async_client, test_db):
    user = await create_test_user(test_db, role="admin")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "My Idea", "description": "desc", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_submit_idea_unauthenticated_401(async_client, test_db):
    data = {"title": "My Idea", "description": "desc", "category": "technology"}
    resp = await async_client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/ideas with file — US2 (T023)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_with_pdf_201(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    pdf_bytes = b"%PDF-1.4 fake"
    files = {"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Idea with file", "description": "desc", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 201
    body = resp.json()
    assert body["file"] is not None
    assert body["file"]["name"] == "test.pdf"


@pytest.mark.asyncio
async def test_submit_idea_wrong_mime_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = {"file": ("bad.txt", io.BytesIO(b"text"), "text/plain")}
    data = {"title": "Idea", "description": "desc", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_submit_idea_oversized_file_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    big_data = b"x" * (11 * 1024 * 1024)
    files = {"file": ("big.pdf", io.BytesIO(big_data), "application/pdf")}
    data = {"title": "Idea", "description": "desc", "category": "technology"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_submit_idea_no_file_null_in_response(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "No File Idea", "description": "desc", "category": "cost_saving"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 201
    assert resp.json()["file"] is None


# ---------------------------------------------------------------------------
# GET /api/v1/ideas/{id}/attachment — US2 (T024)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_download_attachment_submitter_200(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    pdf_bytes = b"%PDF-1.4 fake"
    files = {"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Idea", "description": "desc", "category": "technology"}
    create_resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    idea_id = create_resp.json()["id"]

    dl_resp = await client.get(f"/api/v1/ideas/{idea_id}/attachment")
    assert dl_resp.status_code == 200


@pytest.mark.asyncio
async def test_download_attachment_evaluator_200(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter = await create_test_user(test_db, role="submitter")
    evaluator = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    pdf_bytes = b"%PDF-1.4 fake"
    files = {"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "Idea", "description": "desc", "category": "technology"}
    create_resp = await sub_client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    idea_id = create_resp.json()["id"]

    eval_client = await authenticated_client(async_client, test_db, evaluator)
    dl_resp = await eval_client.get(f"/api/v1/ideas/{idea_id}/attachment")
    assert dl_resp.status_code == 200


@pytest.mark.asyncio
async def test_download_attachment_other_submitter_403(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter_a = await create_test_user(test_db, role="submitter")
    submitter_b = await create_test_user(test_db, role="submitter")

    client_a = await authenticated_client(async_client, test_db, submitter_a)
    pdf_bytes = b"%PDF-1.4 fake"
    files = {"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "A's idea", "description": "desc", "category": "technology"}
    create_resp = await client_a.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    idea_id = create_resp.json()["id"]

    client_b = await authenticated_client(async_client, test_db, submitter_b)
    dl_resp = await client_b.get(f"/api/v1/ideas/{idea_id}/attachment")
    assert dl_resp.status_code == 403


@pytest.mark.asyncio
async def test_download_attachment_no_file_404(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "No File", "description": "desc", "category": "other"}
    create_resp = await client.post("/api/v1/ideas", data=data)
    assert create_resp.status_code == 201
    idea_id = create_resp.json()["id"]

    dl_resp = await client.get(f"/api/v1/ideas/{idea_id}/attachment")
    assert dl_resp.status_code == 404


@pytest.mark.asyncio
async def test_download_attachment_unknown_idea_404(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas/nonexistent-id/attachment")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_download_attachment_unauthenticated_401(async_client, test_db):
    resp = await async_client.get("/api/v1/ideas/some-id/attachment")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/ideas — US3 (T032)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_200(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "A", "description": "desc", "category": "other"}
    await client.post("/api/v1/ideas", data=data)
    resp = await client.get("/api/v1/ideas")
    assert resp.status_code == 200
    body = resp.json()
    assert "ideas" in body
    assert "total" in body
    assert "page" in body
    assert "limit" in body


@pytest.mark.asyncio
async def test_list_ideas_empty_array(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas")
    assert resp.status_code == 200
    assert resp.json()["ideas"] == []


@pytest.mark.asyncio
async def test_list_ideas_unauthenticated_401(async_client, test_db):
    resp = await async_client.get("/api/v1/ideas")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/ideas/{id} — US3 (T033)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_idea_detail_200(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "Detail Test", "description": "desc", "category": "technology"}
    create_resp = await client.post("/api/v1/ideas", data=data)
    idea_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Detail Test"
    assert body["file"] is None


@pytest.mark.asyncio
async def test_get_idea_detail_with_file(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = {"file": ("a.pdf", io.BytesIO(b"%PDF"), "application/pdf")}
    data = {"title": "With File", "description": "desc", "category": "cost_saving"}
    create_resp = await client.post("/api/v1/ideas", data=data, files=files)
    idea_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    assert resp.json()["file"] is not None


@pytest.mark.asyncio
async def test_get_idea_detail_404(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_idea_detail_unauthenticated_401(async_client, test_db):
    resp = await async_client.get("/api/v1/ideas/some-id")
    assert resp.status_code == 401
