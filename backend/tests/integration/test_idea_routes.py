import io
import pytest
import pytest_asyncio

from tests.conftest import create_test_user, authenticated_client


# ---------------------------------------------------------------------------
# POST /api/v1/ideas
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_submitter_201(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "My Idea", "description": "A great idea", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "My Idea"
    assert body["submitter_id"] == user.id
    assert "id" in body
    assert body["current_stage"] == "new_idea"
    assert body["stage_reviews"] == []
    assert body["assigned_admin_id"] is None


@pytest.mark.asyncio
async def test_submit_idea_missing_title_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"description": "A desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_submit_idea_missing_description_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "Title", "category": "other"}
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
    data = {"title": "My Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_submit_idea_unauthenticated_401(async_client, test_db):
    data = {"title": "My Idea", "description": "desc", "category": "other"}
    resp = await async_client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/ideas with file
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_with_pdf_201(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    pdf_bytes = b"%PDF-1.4 fake"
    files = [("files", ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf"))]
    data = {"title": "Idea with file", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["attachments"]) == 1
    assert body["attachments"][0]["name"] == "test.pdf"
    assert body["attachments"][0]["mime_type"] == "application/pdf"
    assert body["attachments"][0]["is_image"] is False


@pytest.mark.asyncio
async def test_submit_idea_wrong_mime_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = [("files", ("bad.txt", io.BytesIO(b"text"), "text/plain"))]
    data = {"title": "Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_submit_idea_total_size_exceeded_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    big_data = b"x" * (20 * 1024 * 1024)
    files = [
        ("files", (f"big{i}.pdf", io.BytesIO(big_data), "application/pdf"))
        for i in range(3)
    ]
    data = {"title": "Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_submit_idea_no_file_empty_attachments_in_response(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "No File Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data)
    assert resp.status_code == 201
    assert resp.json()["attachments"] == []


# ---------------------------------------------------------------------------
# Retired endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retired_single_attachment_endpoint_returns_404(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas/some-id/attachment")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/ideas/{id}/attachments/{attachment_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_download_attachment_image_accessible_to_any_authed_user(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter = await create_test_user(test_db, role="submitter")
    other_user = await create_test_user(test_db, role="submitter")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    files = [("files", ("photo.png", io.BytesIO(png_bytes), "image/png"))]
    data = {"title": "Idea with image", "description": "desc", "category": "other"}
    create_resp = await sub_client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    body = create_resp.json()
    idea_id = body["id"]
    attachment_id = body["attachments"][0]["id"]

    other_client = await authenticated_client(async_client, test_db, other_user)
    dl_resp = await other_client.get(f"/api/v1/ideas/{idea_id}/attachments/{attachment_id}")
    assert dl_resp.status_code == 200


@pytest.mark.asyncio
async def test_download_non_image_attachment_non_owner_403(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter = await create_test_user(test_db, role="submitter")
    other_user = await create_test_user(test_db, role="submitter")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    pdf_bytes = b"%PDF-1.4 fake"
    files = [("files", ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf"))]
    data = {"title": "Idea with PDF", "description": "desc", "category": "other"}
    create_resp = await sub_client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    body = create_resp.json()
    idea_id = body["id"]
    attachment_id = body["attachments"][0]["id"]

    other_client = await authenticated_client(async_client, test_db, other_user)
    dl_resp = await other_client.get(f"/api/v1/ideas/{idea_id}/attachments/{attachment_id}")
    assert dl_resp.status_code == 403


@pytest.mark.asyncio
async def test_download_non_image_attachment_submitter_200(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter = await create_test_user(test_db, role="submitter")
    sub_client = await authenticated_client(async_client, test_db, submitter)
    pdf_bytes = b"%PDF-1.4 fake"
    files = [("files", ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf"))]
    data = {"title": "Idea with PDF", "description": "desc", "category": "other"}
    create_resp = await sub_client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    body = create_resp.json()
    idea_id = body["id"]
    attachment_id = body["attachments"][0]["id"]

    dl_resp = await sub_client.get(f"/api/v1/ideas/{idea_id}/attachments/{attachment_id}")
    assert dl_resp.status_code == 200


@pytest.mark.asyncio
async def test_download_non_image_attachment_admin_200(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    pdf_bytes = b"%PDF-1.4 fake"
    files = [("files", ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf"))]
    data = {"title": "Idea", "description": "desc", "category": "other"}
    create_resp = await sub_client.post("/api/v1/ideas", data=data, files=files)
    assert create_resp.status_code == 201
    body = create_resp.json()
    idea_id = body["id"]
    attachment_id = body["attachments"][0]["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    dl_resp = await admin_client.get(f"/api/v1/ideas/{idea_id}/attachments/{attachment_id}")
    assert dl_resp.status_code == 200


@pytest.mark.asyncio
async def test_download_attachment_unauthenticated_401(async_client, test_db):
    resp = await async_client.get("/api/v1/ideas/some-id/attachments/some-attachment-id")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_download_attachment_unknown_attachment_404(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "No File", "description": "desc", "category": "other"}
    create_resp = await client.post("/api/v1/ideas", data=data)
    idea_id = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/ideas/{idea_id}/attachments/nonexistent-attachment-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Multi-file upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_multi_file_two_files_201(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = [
        ("files", ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")),
        ("files", ("photo.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50), "image/png")),
    ]
    data = {"title": "Multi File Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["attachments"]) == 2
    names = {a["name"] for a in body["attachments"]}
    assert names == {"doc.pdf", "photo.png"}
    pdf_att = next(a for a in body["attachments"] if a["name"] == "doc.pdf")
    png_att = next(a for a in body["attachments"] if a["name"] == "photo.png")
    assert pdf_att["is_image"] is False
    assert png_att["is_image"] is True


@pytest.mark.asyncio
async def test_submit_idea_six_files_400(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = [
        ("files", (f"doc{i}.pdf", io.BytesIO(b"%PDF"), "application/pdf"))
        for i in range(6)
    ]
    data = {"title": "Idea", "description": "desc", "category": "other"}
    resp = await client.post("/api/v1/ideas", data=data, files=files)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# attachment_count in list response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_attachment_count_not_has_attachment(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = [("files", ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf"))]
    data = {"title": "With Attachment", "description": "desc", "category": "other"}
    await client.post("/api/v1/ideas", data=data, files=files)
    await client.post("/api/v1/ideas", data={"title": "No Attach", "description": "d", "category": "other"})

    resp = await client.get("/api/v1/ideas")
    assert resp.status_code == 200
    ideas = resp.json()["ideas"]
    for idea in ideas:
        assert "attachment_count" in idea
        assert "has_attachment" not in idea
    with_attach = next(i for i in ideas if i["title"] == "With Attachment")
    no_attach = next(i for i in ideas if i["title"] == "No Attach")
    assert with_attach["attachment_count"] == 1
    assert no_attach["attachment_count"] == 0


# ---------------------------------------------------------------------------
# GET /api/v1/ideas
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
# GET /api/v1/ideas/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_idea_detail_200(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    data = {"title": "Detail Test", "description": "desc", "category": "other"}
    create_resp = await client.post("/api/v1/ideas", data=data)
    idea_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Detail Test"
    assert body["attachments"] == []
    assert body["current_stage"] == "new_idea"
    assert body["stage_reviews"] == []
    assert body["assigned_admin_id"] is None


@pytest.mark.asyncio
async def test_get_idea_detail_with_file(async_client, test_db, tmp_path, monkeypatch):
    import app.core.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "UPLOAD_DIR", str(tmp_path))

    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    files = [("files", ("a.pdf", io.BytesIO(b"%PDF"), "application/pdf"))]
    data = {"title": "With File", "description": "desc", "category": "other"}
    create_resp = await client.post("/api/v1/ideas", data=data, files=files)
    idea_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    assert len(resp.json()["attachments"]) == 1


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


# ---------------------------------------------------------------------------
# mine filter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mine_filter_returns_only_submitters_ideas(async_client, test_db):
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user1)
    await client.post("/api/v1/ideas", data={"title": "U1 Idea", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, user2)
    await client.post("/api/v1/ideas", data={"title": "U2 Idea", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, user1)
    resp = await client.get("/api/v1/ideas?mine=true")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["ideas"][0]["submitter_name"] == user1.full_name


@pytest.mark.asyncio
async def test_mine_filter_with_pagination(async_client, test_db):
    user = await create_test_user(test_db, role="submitter")
    other = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    for i in range(3):
        await client.post("/api/v1/ideas", data={"title": f"Mine {i}", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, other)
    await client.post("/api/v1/ideas", data={"title": "Other", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas?mine=true&page=1&limit=2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["ideas"]) == 2


@pytest.mark.asyncio
async def test_list_ideas_without_mine_returns_all(async_client, test_db):
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user1)
    await client.post("/api/v1/ideas", data={"title": "A", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, user2)
    await client.post("/api/v1/ideas", data={"title": "B", "description": "d", "category": "other"})
    client = await authenticated_client(async_client, test_db, user1)
    resp = await client.get("/api/v1/ideas")
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


@pytest.mark.asyncio
async def test_mine_filter_unauthenticated_returns_401(async_client, test_db):
    resp = await async_client.get("/api/v1/ideas?mine=true")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/ideas?stage= filter (replaces old ?status= tests)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I07_list_ideas_stage_filter_new_idea(async_client, test_db):
    """GET /ideas?stage=new_idea returns only new_idea ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    r1 = await sub_client.post("/api/v1/ideas", data={"title": "New", "description": "d", "category": "other"})
    r2 = await sub_client.post("/api/v1/ideas", data={"title": "Screening", "description": "d", "category": "other"})

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{r2.json()['id']}/reviews", json={})

    resp = await sub_client.get("/api/v1/ideas?stage=new_idea")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["ideas"][0]["current_stage"] == "new_idea"


@pytest.mark.asyncio
async def test_I08_list_ideas_stage_and_mine(async_client, test_db):
    """GET /ideas?stage=new_idea&mine=true — AND combination."""
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    c1 = await authenticated_client(async_client, test_db, user1)
    r1 = await c1.post("/api/v1/ideas", data={"title": "U1 New", "description": "d", "category": "other"})
    r2 = await c1.post("/api/v1/ideas", data={"title": "U1 Screening", "description": "d", "category": "other"})

    c2 = await authenticated_client(async_client, test_db, user2)
    await c2.post("/api/v1/ideas", data={"title": "U2 New", "description": "d", "category": "other"})

    cadmin = await authenticated_client(async_client, test_db, admin)
    await cadmin.post(f"/api/v1/ideas/{r2.json()['id']}/reviews", json={})

    c1 = await authenticated_client(async_client, test_db, user1)
    resp = await c1.get("/api/v1/ideas?stage=new_idea&mine=true")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["ideas"][0]["current_stage"] == "new_idea"


@pytest.mark.asyncio
async def test_I09_list_ideas_invalid_stage_422(async_client, test_db):
    """GET /ideas?stage=invalid → 422 Unprocessable Entity."""
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas?stage=invalid_value")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/ideas/{id} — stage_reviews visibility (FR-009)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I10_get_idea_other_submitter_sees_empty_stage_reviews(async_client, test_db):
    """GET /ideas/{id} as non-owner non-admin → stage_reviews is []."""
    owner = await create_test_user(test_db, role="submitter")
    stranger = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    owner_client = await authenticated_client(async_client, test_db, owner)
    idea_resp = await owner_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"comment": "Check"})

    stranger_client = await authenticated_client(async_client, test_db, stranger)
    resp = await stranger_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["current_stage"] == "initial_screening"
    assert body["stage_reviews"] == []


@pytest.mark.asyncio
async def test_I11_get_idea_admin_sees_full_stage_reviews(async_client, test_db):
    """GET /ideas/{id} as admin → stage_reviews is full."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"comment": "Reviewed"})

    resp = await admin_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["current_stage"] == "initial_screening"
    assert len(body["stage_reviews"]) == 1
    assert body["stage_reviews"][0]["comment"] == "Reviewed"


@pytest.mark.asyncio
async def test_I11b_get_idea_original_submitter_sees_stage_reviews(async_client, test_db):
    """GET /ideas/{id} as original submitter → stage_reviews is full (FR-009)."""
    owner = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    owner_client = await authenticated_client(async_client, test_db, owner)
    idea_resp = await owner_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"comment": "Checked"})

    owner_client = await authenticated_client(async_client, test_db, owner)
    resp = await owner_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["stage_reviews"]) == 1


# ---------------------------------------------------------------------------
# reviewer_name / assigned_admin_name
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I13_get_idea_includes_assigned_admin_name_after_advance(async_client, test_db):
    """GET /ideas/{id} returns assigned_admin_name after initial_screening transition."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})

    sub_client = await authenticated_client(async_client, test_db, submitter)
    resp = await sub_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["assigned_admin_name"] == admin.full_name


@pytest.mark.asyncio
async def test_I14_list_ideas_includes_reviewer_name_for_initial_screening(async_client, test_db):
    """GET /ideas returns reviewer_name for initial_screening ideas, None for new_idea."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    r1 = await sub_client.post("/api/v1/ideas", data={"title": "New", "description": "d", "category": "other"})
    r2 = await sub_client.post("/api/v1/ideas", data={"title": "Screening", "description": "d", "category": "other"})

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.post(f"/api/v1/ideas/{r2.json()['id']}/reviews", json={})

    resp = await sub_client.get("/api/v1/ideas")
    assert resp.status_code == 200
    ideas_by_title = {i["title"]: i for i in resp.json()["ideas"]}
    assert ideas_by_title["Screening"]["reviewer_name"] == admin.full_name
    assert ideas_by_title["New"]["reviewer_name"] is None


# ---------------------------------------------------------------------------
# T002 — POST /api/v1/ideas/{id}/reviews [TDD Gate tests]
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_IR01_post_reviews_unauthenticated_401(async_client, test_db):
    """IR-01: POST /reviews unauthenticated → 401."""
    resp = await async_client.post("/api/v1/ideas/some-id/reviews", json={})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_IR02_post_reviews_201_happy_path(async_client, test_db):
    """IR-02: POST /reviews happy path → 201 with full IdeaDetailResponse."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "desc", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    resp = await admin_client.post(
        f"/api/v1/ideas/{idea_id}/reviews",
        json={"comment": "Looks good"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["current_stage"] == "initial_screening"
    assert body["assigned_admin_id"] == admin.id
    assert len(body["stage_reviews"]) == 1
    assert body["stage_reviews"][0]["stage"] == "initial_screening"


@pytest.mark.asyncio
async def test_IR03_post_reviews_non_assigned_admin_403(async_client, test_db):
    """IR-03: POST /reviews non-assigned admin → 403."""
    submitter = await create_test_user(test_db, role="submitter")
    admin1 = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin1_client = await authenticated_client(async_client, test_db, admin1)
    await admin1_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})

    admin2_client = await authenticated_client(async_client, test_db, admin2)
    resp = await admin2_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_IR04_post_reviews_comment_over_1000_chars_422(async_client, test_db):
    """IR-04: POST /reviews comment > 1000 chars → 422."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    resp = await admin_client.post(
        f"/api/v1/ideas/{idea_id}/reviews",
        json={"comment": "x" * 1001},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_IR05_patch_evaluate_removed_returns_404_or_405(async_client, test_db):
    """IR-05: PATCH /ideas/{id}/evaluate is removed — must return 404 or 405."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    resp = await admin_client.patch(
        f"/api/v1/ideas/{idea_id}/evaluate",
        json={"status": "under_review"},
    )
    assert resp.status_code in (404, 405)


# ---------------------------------------------------------------------------
# T018+T019 — final_selection (US2) [TDD Gate tests — will fail until T020]
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_IR06_post_reviews_final_selection_without_outcome_422(async_client, test_db):
    """IR-06: Advancing to final_selection without outcome → 422."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    # Advance through all non-terminal stages
    for _ in range(3):
        r = await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})
        assert r.status_code == 201

    # Try final_selection without outcome
    resp = await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_IR07_post_reviews_final_selection_with_outcome_201(async_client, test_db):
    """IR-07: Advancing to final_selection with outcome → 201, idea is locked."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    for _ in range(3):
        await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})

    resp = await admin_client.post(
        f"/api/v1/ideas/{idea_id}/reviews",
        json={"outcome": "accepted"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["current_stage"] == "final_selection"
    assert body["stage_reviews"][-1]["outcome"] == "accepted"


@pytest.mark.asyncio
async def test_IR08_post_reviews_locked_idea_422(async_client, test_db):
    """IR-08: Any advance after final_selection → 422 (locked)."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    for _ in range(3):
        await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})
    await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"outcome": "rejected"})

    resp = await admin_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"outcome": "accepted"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# T024+T025 — stage_reviews visibility (US3) [additional visibility scenarios]
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_IR09_other_admin_sees_full_stage_reviews_readonly(async_client, test_db):
    """Other admin sees full stage_reviews but cannot advance (not assigned admin)."""
    submitter = await create_test_user(test_db, role="submitter")
    admin1 = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin1_client = await authenticated_client(async_client, test_db, admin1)
    await admin1_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={"comment": "From admin1"})

    admin2_client = await authenticated_client(async_client, test_db, admin2)
    resp = await admin2_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["stage_reviews"]) == 1
    assert body["stage_reviews"][0]["comment"] == "From admin1"

    # Admin2 cannot advance (not assigned)
    advance_resp = await admin2_client.post(f"/api/v1/ideas/{idea_id}/reviews", json={})
    assert advance_resp.status_code == 403
