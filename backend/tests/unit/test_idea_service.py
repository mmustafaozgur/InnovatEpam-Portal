import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from tests.conftest import create_test_user
from app.services import idea_service
from app.schemas.ideas import IdeaDetailResponse


# ---------------------------------------------------------------------------
# create_idea — existing tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_idea_missing_title_raises(test_db):
    user = await create_test_user(test_db, role="submitter")
    with pytest.raises(ValueError, match="title"):
        await idea_service.create_idea(test_db, user, "", "desc", "technology")


@pytest.mark.asyncio
async def test_create_idea_missing_description_raises(test_db):
    user = await create_test_user(test_db, role="submitter")
    with pytest.raises(ValueError, match="description"):
        await idea_service.create_idea(test_db, user, "title", "", "technology")


@pytest.mark.asyncio
async def test_create_idea_missing_category_raises(test_db):
    user = await create_test_user(test_db, role="submitter")
    with pytest.raises(ValueError, match="category"):
        await idea_service.create_idea(test_db, user, "title", "desc", "")


@pytest.mark.asyncio
async def test_create_idea_invalid_category_raises(test_db):
    user = await create_test_user(test_db, role="submitter")
    with pytest.raises(ValueError, match="category"):
        await idea_service.create_idea(test_db, user, "title", "desc", "invalid_cat")


@pytest.mark.asyncio
async def test_create_idea_assigns_submitter_id(test_db):
    user = await create_test_user(test_db, role="submitter")
    result = await idea_service.create_idea(test_db, user, "My Idea", "A description", "technology")
    assert result.submitter_id == user.id


@pytest.mark.asyncio
async def test_create_idea_returns_detail_response(test_db):
    user = await create_test_user(test_db, role="submitter")
    result = await idea_service.create_idea(test_db, user, "My Idea", "A description", "technology")
    assert isinstance(result, IdeaDetailResponse)
    assert result.title == "My Idea"
    assert result.description == "A description"
    assert result.category == "technology"
    assert result.submitter_name == user.full_name
    assert result.attachments == []
    assert result.evaluation.status == "submitted"


# ---------------------------------------------------------------------------
# list_ideas and get_idea — existing tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_returns_newest_first(test_db):
    user = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user, "First Idea", "desc", "technology")
    await idea_service.create_idea(test_db, user, "Second Idea", "desc", "other")
    result = await idea_service.list_ideas(test_db, page=1, limit=10)
    assert len(result.ideas) == 2
    assert result.ideas[0].title == "Second Idea"


@pytest.mark.asyncio
async def test_list_ideas_pagination_offset(test_db):
    user = await create_test_user(test_db, role="submitter")
    for i in range(5):
        await idea_service.create_idea(test_db, user, f"Idea {i}", "desc", "technology")
    result = await idea_service.list_ideas(test_db, page=2, limit=2)
    assert len(result.ideas) == 2
    assert result.total == 5
    assert result.page == 2
    assert result.limit == 2


@pytest.mark.asyncio
async def test_list_ideas_submitter_name_in_response(test_db):
    user = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user, "Idea", "desc", "technology")
    result = await idea_service.list_ideas(test_db, page=1, limit=10)
    assert result.ideas[0].submitter_name == user.full_name


@pytest.mark.asyncio
async def test_get_idea_returns_detail(test_db):
    user = await create_test_user(test_db, role="submitter")
    created = await idea_service.create_idea(test_db, user, "Detail Idea", "A long desc", "other")
    result = await idea_service.get_idea(test_db, created.id)
    assert result.id == created.id
    assert result.title == "Detail Idea"
    assert result.submitter_name == user.full_name


@pytest.mark.asyncio
async def test_get_idea_raises_404_on_miss(test_db):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await idea_service.get_idea(test_db, "nonexistent-id")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# File validation — legacy single-file tests removed (renamed to validate_files /
# save_files_atomic in feature 006); equivalent coverage is in the T008 block below.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# mine filter unit tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_submitter_id_filter_returns_only_own_ideas(test_db):
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user1, "User1 Idea", "desc", "technology")
    await idea_service.create_idea(test_db, user2, "User2 Idea", "desc", "other")
    result = await idea_service.list_ideas(test_db, page=1, limit=10, submitter_id_filter=user1.id)
    assert len(result.ideas) == 1
    assert result.ideas[0].submitter_name == user1.full_name


@pytest.mark.asyncio
async def test_list_ideas_submitter_id_filter_total_reflects_only_own(test_db):
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user1, "U1 A", "desc", "technology")
    await idea_service.create_idea(test_db, user1, "U1 B", "desc", "other")
    await idea_service.create_idea(test_db, user2, "U2 A", "desc", "cost_saving")
    result = await idea_service.list_ideas(test_db, page=1, limit=10, submitter_id_filter=user1.id)
    assert result.total == 2


@pytest.mark.asyncio
async def test_list_ideas_submitter_id_filter_none_returns_all(test_db):
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user1, "U1 Idea", "desc", "technology")
    await idea_service.create_idea(test_db, user2, "U2 Idea", "desc", "other")
    result = await idea_service.list_ideas(test_db, page=1, limit=10, submitter_id_filter=None)
    assert result.total == 2
    assert len(result.ideas) == 2


# ---------------------------------------------------------------------------
# T008 — Unit tests U-01 to U-10: evaluate_idea() state machine
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_U01_evaluate_submitted_to_under_review(test_db):
    """U-01: submitted → under_review sets assigned_admin_id and evaluated_at."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    result = await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Looking good")

    assert result.evaluation.status == "under_review"
    assert result.evaluation.evaluated_at is not None
    assert result.evaluation.assigned_admin_id == admin.id


@pytest.mark.asyncio
async def test_U02_evaluate_submitted_to_accepted_invalid(test_db):
    """U-02: submitted → accepted is an invalid transition (must go via under_review)."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.evaluate_idea(test_db, idea.id, admin, "accepted", None)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_U03_evaluate_under_review_to_accepted(test_db):
    """U-03: under_review → accepted (assigned admin)."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)

    result = await idea_service.evaluate_idea(test_db, idea.id, admin, "accepted", "Great idea!")
    assert result.evaluation.status == "accepted"


@pytest.mark.asyncio
async def test_U04_evaluate_under_review_to_rejected(test_db):
    """U-04: under_review → rejected (assigned admin)."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)

    result = await idea_service.evaluate_idea(test_db, idea.id, admin, "rejected", "Not feasible")
    assert result.evaluation.status == "rejected"


@pytest.mark.asyncio
async def test_U05_evaluate_accepted_is_locked(test_db):
    """U-05: accepted → any is locked (409)."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    await idea_service.evaluate_idea(test_db, idea.id, admin, "accepted", None)

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_U06_evaluate_rejected_is_locked(test_db):
    """U-06: rejected → any is locked (409)."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    await idea_service.evaluate_idea(test_db, idea.id, admin, "rejected", None)

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_U07_evaluate_non_assigned_admin_blocked(test_db):
    """U-07: non-assigned admin cannot evaluate an idea in under_review."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin1 = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin1, "under_review", None)

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.evaluate_idea(test_db, idea.id, admin2, "accepted", None)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_U08_evaluate_non_admin_rejected(test_db):
    """U-08: non-admin user gets 403."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.evaluate_idea(test_db, idea.id, submitter, "under_review", None)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_U09_comment_only_update_under_review(test_db):
    """U-09: under_review → under_review updates comment and refreshes evaluated_at."""
    import time
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Initial comment")

    result = await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Updated comment")
    assert result.evaluation.status == "under_review"
    assert result.evaluation.comment == "Updated comment"
    assert result.evaluation.evaluated_at is not None


@pytest.mark.asyncio
async def test_U10_empty_comment_clears_previous(test_db):
    """U-10: passing None as comment clears previous comment."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Some comment")

    result = await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    assert result.evaluation.comment is None


# ---------------------------------------------------------------------------
# T012 — Unit tests U-11 to U-13: build_evaluation_info() visibility rules
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_U11_submitter_sees_under_review_no_comment(test_db):
    """U-11: submitter calling get_idea on under_review idea sees comment=None."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Secret comment")

    result = await idea_service.get_idea(test_db, idea.id, caller=submitter)
    assert result.evaluation.status == "under_review"
    assert result.evaluation.comment is None


@pytest.mark.asyncio
async def test_U12_admin_sees_under_review_with_comment(test_db):
    """U-12: admin calling get_idea on under_review idea sees the comment."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", "Visible to admin")

    result = await idea_service.get_idea(test_db, idea.id, caller=admin)
    assert result.evaluation.status == "under_review"
    assert result.evaluation.comment == "Visible to admin"


@pytest.mark.asyncio
async def test_U13_submitter_sees_accepted_with_comment(test_db):
    """U-13: submitter can see comment when idea is accepted."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    await idea_service.evaluate_idea(test_db, idea.id, admin, "accepted", "Congratulations!")

    result = await idea_service.get_idea(test_db, idea.id, caller=submitter)
    assert result.evaluation.status == "accepted"
    assert result.evaluation.comment == "Congratulations!"


# ---------------------------------------------------------------------------
# T020 — Unit tests U-14 to U-15: list_ideas status_filter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_U14_list_ideas_status_filter_submitted(test_db):
    """U-14: status_filter='submitted' returns only submitted ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea1 = await idea_service.create_idea(test_db, submitter, "Idea 1", "desc", "technology")
    idea2 = await idea_service.create_idea(test_db, submitter, "Idea 2", "desc", "other")
    await idea_service.evaluate_idea(test_db, idea2.id, admin, "under_review", None)

    result = await idea_service.list_ideas(test_db, status_filter="submitted")
    assert result.total == 1
    assert result.ideas[0].id == idea1.id
    assert result.ideas[0].evaluation_status == "submitted"


@pytest.mark.asyncio
async def test_U16_build_evaluation_info_includes_assigned_admin_name(test_db):
    """U-16: build_evaluation_info populates assigned_admin_name for both admin and submitter callers."""
    from sqlalchemy import select as sa_select
    from app.models.idea import Idea as IdeaModel

    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)

    result = await test_db.execute(sa_select(IdeaModel).where(IdeaModel.id == idea.id))
    idea_model = result.scalar_one()

    eval_admin = idea_service.build_evaluation_info(idea_model, admin, admin_name=admin.full_name)
    assert eval_admin.assigned_admin_name == admin.full_name

    eval_sub = idea_service.build_evaluation_info(idea_model, submitter, admin_name=admin.full_name)
    assert eval_sub.assigned_admin_name == admin.full_name


@pytest.mark.asyncio
async def test_U17_get_idea_includes_assigned_admin_name(test_db):
    """U-17: get_idea populates assigned_admin_name after evaluate."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)

    result = await idea_service.get_idea(test_db, idea.id, caller=submitter)
    assert result.evaluation.assigned_admin_name == admin.full_name


@pytest.mark.asyncio
async def test_U18_list_ideas_includes_reviewer_name_for_under_review(test_db):
    """U-18: list_ideas populates reviewer_name for under_review ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)

    result = await idea_service.list_ideas(test_db, page=1, limit=10)
    assert result.ideas[0].reviewer_name == admin.full_name


@pytest.mark.asyncio
async def test_U19_list_ideas_reviewer_name_null_for_submitted(test_db):
    """U-19: list_ideas has reviewer_name=None for submitted ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    result = await idea_service.list_ideas(test_db, page=1, limit=10)
    assert result.ideas[0].reviewer_name is None


@pytest.mark.asyncio
async def test_U13b_non_owner_submitter_cannot_see_comment_on_accepted(test_db):
    owner    = await create_test_user(test_db, role="submitter")
    stranger = await create_test_user(test_db, role="submitter")
    admin    = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, owner, "Idea", "desc", "technology")
    await idea_service.evaluate_idea(test_db, idea.id, admin, "under_review", None)
    await idea_service.evaluate_idea(test_db, idea.id, admin, "accepted", "Congrats!")

    result = await idea_service.get_idea(test_db, idea.id, caller=stranger)
    assert result.evaluation.comment is None


@pytest.mark.asyncio
async def test_U15_list_ideas_status_filter_and_mine(test_db):
    """U-15: status_filter AND submitter_id_filter are ANDed together."""
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    idea_u1_sub = await idea_service.create_idea(test_db, user1, "U1 Submitted", "d", "technology")
    idea_u1_rev = await idea_service.create_idea(test_db, user1, "U1 Review", "d", "other")
    idea_u2_sub = await idea_service.create_idea(test_db, user2, "U2 Submitted", "d", "technology")

    await idea_service.evaluate_idea(test_db, idea_u1_rev.id, admin, "under_review", None)

    result = await idea_service.list_ideas(
        test_db, submitter_id_filter=user1.id, status_filter="submitted"
    )
    assert result.total == 1
    assert result.ideas[0].id == idea_u1_sub.id


# ---------------------------------------------------------------------------
# T008 — Unit tests for validate_files() and save_files_atomic()
# ---------------------------------------------------------------------------

def _make_upload_file(mime: str, filename: str, size: int = 1024) -> MagicMock:
    f = MagicMock()
    f.content_type = mime
    f.filename = filename
    f.size = size
    return f


# validate_files — supported MIME types pass

def test_validate_files_pdf_passes():
    idea_service.validate_files([_make_upload_file("application/pdf", "doc.pdf")])


def test_validate_files_png_passes():
    idea_service.validate_files([_make_upload_file("image/png", "img.png")])


def test_validate_files_gif_passes():
    idea_service.validate_files([_make_upload_file("image/gif", "anim.gif")])


def test_validate_files_mp4_passes():
    idea_service.validate_files([_make_upload_file("video/mp4", "clip.mp4")])


def test_validate_files_mov_passes():
    idea_service.validate_files([_make_upload_file("video/quicktime", "clip.mov")])


def test_validate_files_pptx_passes():
    idea_service.validate_files([_make_upload_file(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", "deck.pptx"
    )])


def test_validate_files_ppt_passes():
    idea_service.validate_files([_make_upload_file("application/vnd.ms-powerpoint", "deck.ppt")])


def test_validate_files_doc_passes():
    idea_service.validate_files([_make_upload_file("application/msword", "letter.doc")])


# validate_files — rejection cases

def test_validate_files_unsupported_mime_raises_400():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_files([_make_upload_file("text/plain", "bad.txt")])
    assert exc_info.value.status_code == 400


def test_validate_files_unsupported_extension_raises_400():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_files([_make_upload_file("image/png", "bad.exe")])
    assert exc_info.value.status_code == 400


def test_validate_files_more_than_5_raises_400():
    from fastapi import HTTPException
    files = [_make_upload_file("application/pdf", f"f{i}.pdf") for i in range(6)]
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_files(files)
    assert exc_info.value.status_code == 400


def test_validate_files_exactly_5_passes():
    files = [_make_upload_file("application/pdf", f"f{i}.pdf") for i in range(5)]
    idea_service.validate_files(files)  # must not raise


def test_validate_files_total_size_exceeded_raises_400():
    from fastapi import HTTPException
    # 3 files × 20 MB each = 60 MB total (> 50 MB limit)
    twenty_mb = 20 * 1024 * 1024
    files = [_make_upload_file("application/pdf", f"f{i}.pdf", size=twenty_mb) for i in range(3)]
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_files(files)
    assert exc_info.value.status_code == 400


def test_validate_files_empty_list_passes():
    idea_service.validate_files([])  # no files is valid (attachments are optional)


# save_files_atomic — happy path

@pytest.mark.asyncio
async def test_save_files_atomic_writes_all_files(tmp_path):
    idea_id = "test-atomic-idea"
    pairs = [
        (tmp_path / idea_id / "file1.pdf", b"pdf content"),
        (tmp_path / idea_id / "file2.png", b"png content"),
    ]
    await idea_service.save_files_atomic(idea_id, pairs)
    for dest, data in pairs:
        assert dest.exists()
        assert dest.read_bytes() == data


# save_files_atomic — rollback on OSError

@pytest.mark.asyncio
async def test_save_files_atomic_rolls_back_on_error(tmp_path, monkeypatch):
    from fastapi import HTTPException

    idea_id = "test-rollback-idea"
    dest1 = tmp_path / idea_id / "file1.pdf"
    dest2 = tmp_path / idea_id / "file2.pdf"

    call_count = {"n": 0}
    original_write = idea_service._write_bytes

    def failing_write(dest, data):
        call_count["n"] += 1
        if call_count["n"] == 2:
            raise OSError("Simulated disk error")
        original_write(dest, data)

    monkeypatch.setattr(idea_service, "_write_bytes", failing_write)

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.save_files_atomic(idea_id, [(dest1, b"data1"), (dest2, b"data2")])

    assert exc_info.value.status_code == 500
    # First file must be cleaned up (rolled back)
    assert not dest1.exists()
