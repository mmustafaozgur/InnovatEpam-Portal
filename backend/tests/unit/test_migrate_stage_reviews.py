"""Unit tests for the migrate_stage_reviews migration script (T031).

The migration function accepts a sqlite3.Connection so we can test it
against an in-memory database without touching any file on disk.
"""
import sqlite3
import uuid
import pytest

# The module to import once it exists — will fail with ImportError until T032 is done.
from scripts.migrate_stage_reviews import migrate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _create_schema(conn: sqlite3.Connection) -> None:
    """Create the tables as they exist BEFORE migration (legacy + new columns)."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'submitter',
            privacy_policy_accepted INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS ideas (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'Test',
            description TEXT NOT NULL DEFAULT 'Desc',
            category TEXT NOT NULL DEFAULT 'technology',
            submitter_id TEXT NOT NULL,
            submitted_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z',
            current_stage TEXT NOT NULL DEFAULT 'new_idea',
            assigned_admin_id TEXT,
            evaluation_status TEXT NOT NULL DEFAULT 'submitted',
            evaluation_comment TEXT,
            evaluated_at TEXT,
            extra_data TEXT
        );

        CREATE TABLE IF NOT EXISTS stage_reviews (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            outcome TEXT,
            comment TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT NOT NULL
        );
    """)
    conn.commit()


def _insert_idea(
    conn: sqlite3.Connection,
    *,
    evaluation_status: str,
    evaluation_comment: str | None = None,
    evaluated_at: str | None = None,
    assigned_admin_id: str | None = None,
    current_stage: str = "new_idea",
) -> str:
    idea_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO ideas
           (id, submitter_id, evaluation_status, evaluation_comment,
            evaluated_at, assigned_admin_id, current_stage)
           VALUES (?,?,?,?,?,?,?)""",
        (idea_id, "user-1", evaluation_status, evaluation_comment,
         evaluated_at, assigned_admin_id, current_stage),
    )
    conn.commit()
    return idea_id


@pytest.fixture
def conn() -> sqlite3.Connection:
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    _create_schema(c)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# Mapping tests — all four evaluation_status values
# ---------------------------------------------------------------------------

def test_submitted_maps_to_new_idea(conn):
    idea_id = _insert_idea(conn, evaluation_status="submitted")
    migrate(conn)
    row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
    assert row["current_stage"] == "new_idea"


def test_submitted_creates_no_stage_review(conn):
    idea_id = _insert_idea(conn, evaluation_status="submitted")
    migrate(conn)
    count = conn.execute(
        "SELECT COUNT(*) FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()[0]
    assert count == 0


def test_under_review_maps_to_initial_screening(conn):
    idea_id = _insert_idea(conn, evaluation_status="under_review")
    migrate(conn)
    row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
    assert row["current_stage"] == "initial_screening"


def test_under_review_creates_stage_review(conn):
    idea_id = _insert_idea(
        conn,
        evaluation_status="under_review",
        evaluation_comment="Needs work",
        evaluated_at="2026-03-01T12:00:00Z",
        assigned_admin_id="admin-1",
    )
    migrate(conn)
    row = conn.execute(
        "SELECT * FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()
    assert row is not None
    assert row["stage"] == "initial_screening"
    assert row["outcome"] is None
    assert row["comment"] == "Needs work"
    assert row["reviewed_by"] == "admin-1"
    assert row["reviewed_at"] == "2026-03-01T12:00:00Z"


def test_under_review_null_reviewed_by_when_no_assigned_admin(conn):
    idea_id = _insert_idea(conn, evaluation_status="under_review", assigned_admin_id=None)
    migrate(conn)
    row = conn.execute(
        "SELECT reviewed_by FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()
    assert row is not None
    assert row["reviewed_by"] is None


def test_accepted_maps_to_final_selection(conn):
    idea_id = _insert_idea(conn, evaluation_status="accepted")
    migrate(conn)
    row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
    assert row["current_stage"] == "final_selection"


def test_accepted_creates_stage_review_with_accepted_outcome(conn):
    idea_id = _insert_idea(
        conn,
        evaluation_status="accepted",
        evaluation_comment="Great idea!",
        evaluated_at="2026-04-01T08:00:00Z",
        assigned_admin_id="admin-1",
    )
    migrate(conn)
    row = conn.execute(
        "SELECT * FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()
    assert row is not None
    assert row["stage"] == "final_selection"
    assert row["outcome"] == "accepted"
    assert row["comment"] == "Great idea!"


def test_rejected_maps_to_final_selection(conn):
    idea_id = _insert_idea(conn, evaluation_status="rejected")
    migrate(conn)
    row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
    assert row["current_stage"] == "final_selection"


def test_rejected_creates_stage_review_with_rejected_outcome(conn):
    idea_id = _insert_idea(conn, evaluation_status="rejected")
    migrate(conn)
    row = conn.execute(
        "SELECT * FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()
    assert row is not None
    assert row["outcome"] == "rejected"


# ---------------------------------------------------------------------------
# Idempotency tests
# ---------------------------------------------------------------------------

def test_idempotency_no_duplicate_stage_reviews(conn):
    idea_id = _insert_idea(conn, evaluation_status="accepted")
    migrate(conn)
    migrate(conn)  # run a second time
    count = conn.execute(
        "SELECT COUNT(*) FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()[0]
    assert count == 1


def test_idempotency_under_review_no_duplicate(conn):
    idea_id = _insert_idea(conn, evaluation_status="under_review")
    migrate(conn)
    migrate(conn)
    count = conn.execute(
        "SELECT COUNT(*) FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()[0]
    assert count == 1


def test_idempotency_submitted_still_zero_reviews_after_second_run(conn):
    idea_id = _insert_idea(conn, evaluation_status="submitted")
    migrate(conn)
    migrate(conn)
    count = conn.execute(
        "SELECT COUNT(*) FROM stage_reviews WHERE idea_id=?", (idea_id,)
    ).fetchone()[0]
    assert count == 0


def test_idempotency_stage_not_changed_on_second_run(conn):
    idea_id = _insert_idea(conn, evaluation_status="under_review")
    migrate(conn)
    migrate(conn)
    row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
    assert row["current_stage"] == "initial_screening"


# ---------------------------------------------------------------------------
# Multiple ideas in one pass
# ---------------------------------------------------------------------------

def test_migrates_all_ideas_in_one_pass(conn):
    ids = {
        "submitted": _insert_idea(conn, evaluation_status="submitted"),
        "under_review": _insert_idea(conn, evaluation_status="under_review"),
        "accepted": _insert_idea(conn, evaluation_status="accepted"),
        "rejected": _insert_idea(conn, evaluation_status="rejected"),
    }
    migrate(conn)

    expected_stages = {
        ids["submitted"]: "new_idea",
        ids["under_review"]: "initial_screening",
        ids["accepted"]: "final_selection",
        ids["rejected"]: "final_selection",
    }
    for idea_id, expected_stage in expected_stages.items():
        row = conn.execute("SELECT current_stage FROM ideas WHERE id=?", (idea_id,)).fetchone()
        assert row["current_stage"] == expected_stage, f"id={idea_id}"
