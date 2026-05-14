import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from tests.conftest import create_test_user
from app.services import idea_service
from app.schemas.ideas import IdeaDetailResponse


# ---------------------------------------------------------------------------
# create_idea — existing tests (updated for new schema: current_stage replaces evaluation)
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
    assert result.current_stage == "new_idea"
    assert result.stage_reviews == []


# ---------------------------------------------------------------------------
# list_ideas and get_idea — existing tests (updated for new schema)
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
# list_ideas stage_filter unit tests (replaces old status_filter tests)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_U14_list_ideas_stage_filter_new_idea(test_db):
    """U-14: stage_filter='new_idea' returns only new ideas."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea1 = await idea_service.create_idea(test_db, submitter, "Idea 1", "desc", "technology")
    idea2 = await idea_service.create_idea(test_db, submitter, "Idea 2", "desc", "other")
    await idea_service.advance_stage(test_db, idea2.id, admin.id, comment=None, outcome=None)

    result = await idea_service.list_ideas(test_db, stage_filter="new_idea")
    assert result.total == 1
    assert result.ideas[0].id == idea1.id
    assert result.ideas[0].current_stage == "new_idea"


@pytest.mark.asyncio
async def test_U15_list_ideas_stage_filter_and_mine(test_db):
    """U-15: stage_filter AND submitter_id_filter are ANDed together."""
    user1 = await create_test_user(test_db, role="submitter")
    user2 = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")

    idea_u1_new = await idea_service.create_idea(test_db, user1, "U1 New", "d", "technology")
    idea_u1_adv = await idea_service.create_idea(test_db, user1, "U1 Screening", "d", "other")
    await idea_service.create_idea(test_db, user2, "U2 New", "d", "technology")

    await idea_service.advance_stage(test_db, idea_u1_adv.id, admin.id, comment=None, outcome=None)

    result = await idea_service.list_ideas(
        test_db, submitter_id_filter=user1.id, stage_filter="new_idea"
    )
    assert result.total == 1
    assert result.ideas[0].id == idea_u1_new.id


# ---------------------------------------------------------------------------
# T008 — Unit tests for validate_files() and save_files_atomic()
# ---------------------------------------------------------------------------

def _make_upload_file(mime: str, filename: str, size: int = 1024) -> MagicMock:
    f = MagicMock()
    f.content_type = mime
    f.filename = filename
    f.size = size
    return f


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
    idea_service.validate_files(files)


def test_validate_files_total_size_exceeded_raises_400():
    from fastapi import HTTPException
    twenty_mb = 20 * 1024 * 1024
    files = [_make_upload_file("application/pdf", f"f{i}.pdf", size=twenty_mb) for i in range(3)]
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_files(files)
    assert exc_info.value.status_code == 400


def test_validate_files_empty_list_passes():
    idea_service.validate_files([])


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
    assert not dest1.exists()


# ---------------------------------------------------------------------------
# T001 — Failing unit tests for advance_stage() [TDD Gate — RED STATE]
# advance_stage() does not exist yet; all tests below fail with AttributeError.
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_AS01_advance_stage_new_idea_to_initial_screening(test_db):
    """AS-01: new_idea → initial_screening assigns acting admin and creates stage_review."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    result = await idea_service.advance_stage(test_db, idea.id, admin.id, comment="Initial check", outcome=None)

    assert result.current_stage == "initial_screening"
    assert result.assigned_admin_id == admin.id
    assert len(result.stage_reviews) == 1
    assert result.stage_reviews[0].stage == "initial_screening"
    assert result.stage_reviews[0].outcome is None


@pytest.mark.asyncio
async def test_AS02_advance_stage_sequential_three_steps(test_db):
    """AS-02: Sequential advances through new_idea → initial_screening → technical_review."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    r1 = await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    assert r1.current_stage == "initial_screening"

    r2 = await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    assert r2.current_stage == "technical_review"
    assert len(r2.stage_reviews) == 2


@pytest.mark.asyncio
async def test_AS03_advance_stage_non_assigned_admin_403(test_db):
    """AS-03: Non-assigned admin rejected after initial claim."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin1 = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.advance_stage(test_db, idea.id, admin1.id, comment=None, outcome=None)

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.advance_stage(test_db, idea.id, admin2.id, comment=None, outcome=None)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_AS04_advance_stage_comment_over_1000_chars_422(test_db):
    """AS-04: Comment exceeding 1000 chars rejected with 422 (SC-007)."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.advance_stage(test_db, idea.id, admin.id, comment="x" * 1001, outcome=None)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_AS05_advance_stage_locked_idea_422(test_db):
    """AS-05: Advancing a final_selection (locked) idea is rejected with 422."""
    from fastapi import HTTPException
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")
    await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome="accepted")

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.advance_stage(test_db, idea.id, admin.id, comment=None, outcome=None)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_AS06_advance_stage_race_condition_409(test_db):
    """AS-06: First-admin race condition — 409 when idea already claimed by another admin."""
    from fastapi import HTTPException
    from sqlalchemy import update
    from app.models.idea import Idea as IdeaModel

    submitter = await create_test_user(test_db, role="submitter")
    admin1 = await create_test_user(test_db, role="admin")
    admin2 = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    # Simulate race: idea is still new_idea but assigned_admin_id is already set by admin1
    await test_db.execute(
        update(IdeaModel)
        .where(IdeaModel.id == idea.id)
        .values(assigned_admin_id=admin1.id)
    )
    await test_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await idea_service.advance_stage(test_db, idea.id, admin2.id, comment=None, outcome=None)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_AS07_advance_stage_creates_immutable_stage_review_record(test_db):
    """AS-07: Each advance creates exactly one stage_review record (immutable audit trail)."""
    submitter = await create_test_user(test_db, role="submitter")
    admin = await create_test_user(test_db, role="admin")
    idea = await idea_service.create_idea(test_db, submitter, "Idea", "desc", "technology")

    await idea_service.advance_stage(test_db, idea.id, admin.id, comment="Step one", outcome=None)
    result = await idea_service.advance_stage(test_db, idea.id, admin.id, comment="Step two", outcome=None)

    assert len(result.stage_reviews) == 2
    stages = [r.stage for r in result.stage_reviews]
    assert stages == ["initial_screening", "technical_review"]
