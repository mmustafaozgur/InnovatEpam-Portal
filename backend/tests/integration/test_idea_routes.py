import io
import pytest
import pytest_asyncio

from tests.conftest import create_test_user, authenticated_client


# ---------------------------------------------------------------------------
# POST /api/v1/ideas — existing tests
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
    assert body["evaluation"]["status"] == "submitted"


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
    # 3 files × 20 MB = 60 MB total (> 50 MB limit)
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
# T009 — Retired endpoint returns 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retired_single_attachment_endpoint_returns_404(async_client, test_db):
    """GET /ideas/{id}/attachment (retired) must return 404."""
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas/some-id/attachment")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T009 — GET /api/v1/ideas/{id}/attachments/{attachment_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_download_attachment_image_accessible_to_any_authed_user(async_client, test_db, tmp_path, monkeypatch):
    """Image attachments: any authenticated user can access inline."""
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
    """Non-image attachment: non-owner non-admin gets 403."""
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
    """Non-image attachment: submitter (owner) can download."""
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
    """Non-image attachment: admin can download."""
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
# T009 — Multi-file upload: 2 files, verify response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_idea_multi_file_two_files_201(async_client, test_db, tmp_path, monkeypatch):
    """Multi-file upload: 2 files → 2 attachment records."""
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
    """6 files → 400 (exceeds max 5 files)."""
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
# T009 — attachment_count in list response (replaces has_attachment)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_attachment_count_not_has_attachment(async_client, test_db, tmp_path, monkeypatch):
    """List response uses attachment_count (int), not has_attachment (bool)."""
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
    assert body["evaluation"]["status"] == "submitted"


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
# mine filter integration tests
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
# T009 — Integration tests I-01 to I-06, I-12: PATCH /ideas/{id}/evaluate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I01_evaluate_unauthenticated_401(async_client, test_db):
    """I-01: PATCH /ideas/{id}/evaluate — unauthenticated → 401."""
    resp = await async_client.patch(
        "/api/v1/ideas/some-id/evaluate",
        json={"status": "under_review"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_I02_evaluate_submitter_403(async_client, test_db):
    """I-02: PATCH /ideas/{id}/evaluate — submitter role → 403."""
    submitter = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    resp = await client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_I03_evaluate_admin_valid_transition_200(async_client, test_db):
    """I-03: PATCH /ideas/{id}/evaluate — admin, valid transition → 200."""
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
        json={"status": "under_review", "comment": "Reviewing now"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["evaluation"]["status"] == "under_review"
    assert body["evaluation"]["comment"] == "Reviewing now"
    assert body["evaluation"]["assigned_admin_id"] == admin.id


@pytest.mark.asyncio
async def test_I04_evaluate_invalid_transition_400(async_client, test_db):
    """I-04: PATCH /ideas/{id}/evaluate — invalid transition → 400."""
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
        json={"status": "accepted"},  # cannot skip under_review
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_I05_evaluate_locked_idea_409(async_client, test_db):
    """I-05: PATCH /ideas/{id}/evaluate — locked idea → 409."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})
    await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "accepted"})

    resp = await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_I06_evaluate_non_assigned_admin_403(async_client, test_db):
    """I-06: PATCH /ideas/{id}/evaluate — non-assigned admin → 403."""
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
    await admin1_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})

    admin2_client = await authenticated_client(async_client, test_db, admin2)
    resp = await admin2_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "accepted"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_I12_evaluate_comment_over_1000_chars_422(async_client, test_db):
    """I-12: PATCH /ideas/{id}/evaluate — comment > 1,000 chars → 422."""
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
        json={"status": "under_review", "comment": "x" * 1001},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# T013 — Integration tests I-10 to I-11: GET /ideas/{id} visibility
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I10_get_idea_submitter_under_review_comment_hidden(async_client, test_db):
    """I-10: GET /ideas/{id} as submitter when under_review → comment is null."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    # Create idea as submitter first
    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    # Admin evaluates (overwrites cookie)
    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(
        f"/api/v1/ideas/{idea_id}/evaluate",
        json={"status": "under_review", "comment": "Internal note"},
    )

    # Re-authenticate as submitter to restore cookie before GET
    sub_client = await authenticated_client(async_client, test_db, submitter)
    resp = await sub_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["evaluation"]["status"] == "under_review"
    assert body["evaluation"]["comment"] is None


@pytest.mark.asyncio
async def test_I11b_get_idea_non_owner_submitter_accepted_comment_hidden(async_client, test_db):
    owner    = await create_test_user(test_db, role="submitter")
    stranger = await create_test_user(test_db, role="submitter")
    admin    = await create_test_user(test_db, role="admin")

    owner_client = await authenticated_client(async_client, test_db, owner)
    idea_resp = await owner_client.post("/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"})
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})
    await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate",
        json={"status": "accepted", "comment": "Great!"})

    stranger_client = await authenticated_client(async_client, test_db, stranger)
    resp = await stranger_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    assert resp.json()["evaluation"]["comment"] is None


@pytest.mark.asyncio
async def test_I11_get_idea_admin_under_review_comment_visible(async_client, test_db):
    """I-11: GET /ideas/{id} as admin when under_review → comment is present."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(
        f"/api/v1/ideas/{idea_id}/evaluate",
        json={"status": "under_review", "comment": "Internal note"},
    )

    resp = await admin_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["evaluation"]["status"] == "under_review"
    assert body["evaluation"]["comment"] == "Internal note"


# ---------------------------------------------------------------------------
# T021 — Integration tests I-07 to I-09: GET /ideas?status=
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I07_list_ideas_status_filter_submitted(async_client, test_db):
    """I-07: GET /ideas?status=submitted — returns only submitted ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    r1 = await sub_client.post("/api/v1/ideas", data={"title": "Submitted", "description": "d", "category": "other"})
    r2 = await sub_client.post("/api/v1/ideas", data={"title": "Reviewed", "description": "d", "category": "other"})

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(f"/api/v1/ideas/{r2.json()['id']}/evaluate", json={"status": "under_review"})

    resp = await sub_client.get("/api/v1/ideas?status=submitted")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["ideas"][0]["evaluation_status"] == "submitted"


@pytest.mark.asyncio
async def test_I08_list_ideas_status_and_mine_and_semantics(async_client, test_db):
    """I-08: GET /ideas?status=accepted&mine=true — AND combination."""
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")

    # Submit user1's idea first, then immediately use it
    c1 = await authenticated_client(async_client, test_db, user1)
    r1 = await c1.post("/api/v1/ideas", data={"title": "U1 Sub", "description": "d", "category": "other"})
    idea1_id = r1.json()["id"]

    # Submit user2's idea
    c2 = await authenticated_client(async_client, test_db, user2)
    r2 = await c2.post("/api/v1/ideas", data={"title": "U2 Sub", "description": "d", "category": "other"})
    idea2_id = r2.json()["id"]

    # Admin moves user1's idea through the lifecycle
    cadmin = await authenticated_client(async_client, test_db, admin)
    await cadmin.patch(f"/api/v1/ideas/{idea1_id}/evaluate", json={"status": "under_review"})
    await cadmin.patch(f"/api/v1/ideas/{idea1_id}/evaluate", json={"status": "accepted"})

    # admin2 reviews user2's idea (keeps it in under_review)
    cadmin2 = await authenticated_client(async_client, test_db, admin2)
    await cadmin2.patch(f"/api/v1/ideas/{idea2_id}/evaluate", json={"status": "under_review"})

    # Re-authenticate as user1 for the final query
    c1 = await authenticated_client(async_client, test_db, user1)
    resp = await c1.get("/api/v1/ideas?status=accepted&mine=true")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["ideas"][0]["evaluation_status"] == "accepted"


@pytest.mark.asyncio
async def test_I09_list_ideas_invalid_status_422(async_client, test_db):
    """I-09: GET /ideas?status=invalid → 422 Unprocessable Entity."""
    user = await create_test_user(test_db, role="submitter")
    client = await authenticated_client(async_client, test_db, user)
    resp = await client.get("/api/v1/ideas?status=invalid_value")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Reviewer name — integration tests I-13 to I-14
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_I13_get_idea_includes_assigned_admin_name_after_evaluate(async_client, test_db):
    """I-13: GET /ideas/{id} returns assigned_admin_name after under_review transition."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    idea_resp = await sub_client.post(
        "/api/v1/ideas",
        data={"title": "Idea", "description": "d", "category": "other"},
    )
    idea_id = idea_resp.json()["id"]

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(f"/api/v1/ideas/{idea_id}/evaluate", json={"status": "under_review"})

    sub_client = await authenticated_client(async_client, test_db, submitter)
    resp = await sub_client.get(f"/api/v1/ideas/{idea_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["evaluation"]["assigned_admin_name"] == admin.full_name


@pytest.mark.asyncio
async def test_I14_list_ideas_includes_reviewer_name_for_under_review(async_client, test_db):
    """I-14: GET /ideas returns reviewer_name for under_review ideas, None for submitted."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    sub_client = await authenticated_client(async_client, test_db, submitter)
    r1 = await sub_client.post("/api/v1/ideas", data={"title": "Submitted", "description": "d", "category": "other"})
    r2 = await sub_client.post("/api/v1/ideas", data={"title": "Reviewed", "description": "d", "category": "other"})

    admin_client = await authenticated_client(async_client, test_db, admin)
    await admin_client.patch(f"/api/v1/ideas/{r2.json()['id']}/evaluate", json={"status": "under_review"})

    resp = await sub_client.get("/api/v1/ideas")
    assert resp.status_code == 200
    ideas_by_title = {i["title"]: i for i in resp.json()["ideas"]}
    assert ideas_by_title["Reviewed"]["reviewer_name"] == admin.full_name
    assert ideas_by_title["Submitted"]["reviewer_name"] is None
