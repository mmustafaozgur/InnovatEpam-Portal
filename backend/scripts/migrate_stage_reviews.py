"""
Idempotent migration: evaluation_status columns → multi-stage review pipeline.

Mapping:
  submitted    → current_stage = 'new_idea'           (no stage_review record)
  under_review → current_stage = 'initial_screening'  (one stage_review record, outcome=NULL)
  accepted     → current_stage = 'final_selection'    (one stage_review record, outcome='accepted')
  rejected     → current_stage = 'final_selection'    (one stage_review record, outcome='rejected')

Idempotency: ideas that already have the expected current_stage AND already have a
stage_review record are skipped.  'submitted' ideas are always safe to re-run since
they produce no records.
"""
from __future__ import annotations

import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_schema(conn: sqlite3.Connection) -> None:
    """Add new columns / tables when running against a pre-migration database."""
    # Add current_stage if missing
    cols = {row[1] for row in conn.execute("PRAGMA table_info(ideas)")}
    if "current_stage" not in cols:
        conn.execute(
            "ALTER TABLE ideas ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'new_idea'"
        )
    if "assigned_admin_id" not in cols:
        conn.execute("ALTER TABLE ideas ADD COLUMN assigned_admin_id TEXT")

    # Create stage_reviews if missing
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stage_reviews (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            outcome TEXT,
            comment TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT NOT NULL
        )
    """)
    conn.commit()


def migrate(conn: sqlite3.Connection) -> None:
    """Migrate all ideas from legacy evaluation_status to current_stage."""
    cursor = conn.cursor()
    ideas = cursor.execute(
        "SELECT id, evaluation_status, evaluation_comment, evaluated_at, assigned_admin_id "
        "FROM ideas"
    ).fetchall()

    for row in ideas:
        if hasattr(row, "keys"):
            # sqlite3.Row object
            idea_id = row["id"]
            status = row["evaluation_status"]
            comment = row["evaluation_comment"]
            evaluated_at = row["evaluated_at"]
            assigned_admin_id = row["assigned_admin_id"]
        else:
            idea_id, status, comment, evaluated_at, assigned_admin_id = row

        if status == "submitted":
            conn.execute(
                "UPDATE ideas SET current_stage = 'new_idea' WHERE id = ?",
                (idea_id,),
            )

        elif status == "under_review":
            conn.execute(
                "UPDATE ideas SET current_stage = 'initial_screening' WHERE id = ?",
                (idea_id,),
            )
            # Idempotency: skip if a stage_review for initial_screening already exists
            existing = conn.execute(
                "SELECT id FROM stage_reviews WHERE idea_id = ? AND stage = 'initial_screening'",
                (idea_id,),
            ).fetchone()
            if existing is None:
                conn.execute(
                    """INSERT INTO stage_reviews
                       (id, idea_id, stage, outcome, comment, reviewed_by, reviewed_at)
                       VALUES (?, ?, 'initial_screening', NULL, ?, ?, ?)""",
                    (
                        str(uuid.uuid4()),
                        idea_id,
                        comment,
                        assigned_admin_id,
                        evaluated_at or _utc_now(),
                    ),
                )

        elif status in ("accepted", "rejected"):
            conn.execute(
                "UPDATE ideas SET current_stage = 'final_selection' WHERE id = ?",
                (idea_id,),
            )
            existing = conn.execute(
                "SELECT id FROM stage_reviews WHERE idea_id = ? AND stage = 'final_selection'",
                (idea_id,),
            ).fetchone()
            if existing is None:
                conn.execute(
                    """INSERT INTO stage_reviews
                       (id, idea_id, stage, outcome, comment, reviewed_by, reviewed_at)
                       VALUES (?, ?, 'final_selection', ?, ?, ?, ?)""",
                    (
                        str(uuid.uuid4()),
                        idea_id,
                        status,
                        comment,
                        assigned_admin_id,
                        evaluated_at or _utc_now(),
                    ),
                )

    conn.commit()


def main() -> None:
    db_path = Path(__file__).parent.parent / "innovatepam.db"
    if not db_path.exists():
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        ensure_schema(conn)
        migrate(conn)
        print("Migration complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
