import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from tests.conftest import create_test_user
from app.services import idea_service
from app.schemas.ideas import IdeaDetailResponse


# ---------------------------------------------------------------------------
# create_idea — US1
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
    assert result.file is None


# ---------------------------------------------------------------------------
# list_ideas and get_idea — US3 (written here per tasks.md)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_ideas_returns_newest_first(test_db):
    user = await create_test_user(test_db, role="submitter")
    await idea_service.create_idea(test_db, user, "First Idea", "desc", "technology")
    await idea_service.create_idea(test_db, user, "Second Idea", "desc", "other")
    result = await idea_service.list_ideas(test_db, page=1, limit=10)
    assert len(result.ideas) == 2
    # newest first — submitted_at is time-ordered so Second >= First
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
# File validation — US2 (T022)
# ---------------------------------------------------------------------------

def test_validate_file_accepted_pdf():
    mock_file = MagicMock()
    mock_file.content_type = "application/pdf"
    mock_file.filename = "test.pdf"
    mock_file.size = 1024
    idea_service.validate_file(mock_file)  # should not raise


def test_validate_file_accepted_docx():
    mock_file = MagicMock()
    mock_file.content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    mock_file.filename = "test.docx"
    mock_file.size = 1024
    idea_service.validate_file(mock_file)


def test_validate_file_accepted_png():
    mock_file = MagicMock()
    mock_file.content_type = "image/png"
    mock_file.filename = "test.png"
    mock_file.size = 1024
    idea_service.validate_file(mock_file)


def test_validate_file_accepted_jpg():
    mock_file = MagicMock()
    mock_file.content_type = "image/jpeg"
    mock_file.filename = "test.jpg"
    mock_file.size = 1024
    idea_service.validate_file(mock_file)


def test_validate_file_disallowed_type_raises():
    from fastapi import HTTPException
    mock_file = MagicMock()
    mock_file.content_type = "text/plain"
    mock_file.filename = "test.txt"
    mock_file.size = 1024
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_file(mock_file)
    assert exc_info.value.status_code == 400


def test_validate_file_oversized_raises():
    from fastapi import HTTPException
    mock_file = MagicMock()
    mock_file.content_type = "application/pdf"
    mock_file.filename = "big.pdf"
    mock_file.size = 11 * 1024 * 1024  # 11 MB
    with pytest.raises(HTTPException) as exc_info:
        idea_service.validate_file(mock_file)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_save_file_writes_to_correct_path(tmp_path):
    idea_id = "test-idea-123"
    stored_name = "abc123.pdf"
    data = b"fake pdf content"
    dest = tmp_path / idea_id / stored_name
    await idea_service.save_file(idea_id, dest, data)
    assert dest.exists()
    assert dest.read_bytes() == data


# ---------------------------------------------------------------------------
# T007 — mine filter unit tests (submitter_id_filter)
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
