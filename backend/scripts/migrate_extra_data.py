"""Idempotent migration: add extra_data column and expand category CHECK to 7 values."""
import argparse
import sqlite3
import pathlib

DB_PATH = pathlib.Path(__file__).parent.parent / "innovatepam.db"

CATEGORIES_7 = (
    "process_improvement",
    "technology",
    "cost_saving",
    "talent_development",
    "client_delivery",
    "workplace_culture",
    "other",
)
CATEGORIES_4 = (
    "process_improvement",
    "technology",
    "cost_saving",
    "other",
)

_CREATE_IDEAS_7 = """
CREATE TABLE ideas_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN (
        'process_improvement','technology','cost_saving',
        'talent_development','client_delivery','workplace_culture','other'
    )),
    submitter_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    attachment_filename TEXT,
    attachment_stored_name TEXT,
    attachment_mime_type TEXT,
    attachment_size INTEGER,
    evaluation_status TEXT NOT NULL DEFAULT 'submitted',
    evaluation_comment TEXT,
    evaluated_at TEXT,
    assigned_admin_id TEXT,
    extra_data TEXT,
    CHECK(length(title) <= 150),
    CHECK(length(description) <= 3000),
    CHECK((attachment_filename IS NULL) = (attachment_stored_name IS NULL)),
    CHECK(evaluation_status IN ('submitted','under_review','accepted','rejected'))
)
"""

_CREATE_IDEAS_4 = """
CREATE TABLE ideas_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN (
        'process_improvement','technology','cost_saving','other'
    )),
    submitter_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    attachment_filename TEXT,
    attachment_stored_name TEXT,
    attachment_mime_type TEXT,
    attachment_size INTEGER,
    evaluation_status TEXT NOT NULL DEFAULT 'submitted',
    evaluation_comment TEXT,
    evaluated_at TEXT,
    assigned_admin_id TEXT,
    CHECK(length(title) <= 150),
    CHECK(length(description) <= 3000),
    CHECK((attachment_filename IS NULL) = (attachment_stored_name IS NULL)),
    CHECK(evaluation_status IN ('submitted','under_review','accepted','rejected'))
)
"""


def _current_columns(cur: sqlite3.Cursor) -> set[str]:
    return {row[1] for row in cur.execute("PRAGMA table_info(ideas)")}


def _category_constraint_has_all_7(cur: sqlite3.Cursor) -> bool:
    row = cur.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='ideas'"
    ).fetchone()
    if not row:
        return False
    ddl: str = row[0]
    return all(cat in ddl for cat in CATEGORIES_7)


def _recreate_table(cur: sqlite3.Cursor, create_sql: str, copy_columns: list[str]) -> None:
    cols = ", ".join(copy_columns)
    cur.executescript(create_sql)
    cur.execute(f"INSERT INTO ideas_new SELECT {cols} FROM ideas")
    cur.execute("DROP TABLE ideas")
    cur.execute("ALTER TABLE ideas_new RENAME TO ideas")
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_submitted_at ON ideas (submitted_at)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas (submitter_id)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status)"
    )


def _base_columns() -> list[str]:
    return [
        "id", "title", "description", "category", "submitter_id", "submitted_at",
        "attachment_filename", "attachment_stored_name", "attachment_mime_type",
        "attachment_size", "evaluation_status", "evaluation_comment",
        "evaluated_at", "assigned_admin_id",
    ]


def forward(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=OFF")

    # Step 1: Add extra_data column
    existing = _current_columns(cur)
    if "extra_data" not in existing:
        cur.execute("ALTER TABLE ideas ADD COLUMN extra_data TEXT")
        print("  Added: extra_data column")
    else:
        print("  Skipped (exists): extra_data column")

    # Step 2: Expand category CHECK to 7 values
    if not _category_constraint_has_all_7(cur):
        base_cols = _base_columns()
        if "extra_data" in _current_columns(cur):
            base_cols.append("extra_data")
        copy_cols_sql = ", ".join(
            f"COALESCE(extra_data, NULL) AS extra_data" if c == "extra_data" else c
            for c in base_cols
        )
        # Use plain list for INSERT SELECT
        all_cols = _base_columns() + ["extra_data"]
        cur.executescript(_CREATE_IDEAS_7)
        cur.execute(
            f"INSERT INTO ideas_new SELECT {', '.join(all_cols)} FROM ideas"
        )
        cur.execute("DROP TABLE ideas")
        cur.execute("ALTER TABLE ideas_new RENAME TO ideas")
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_ideas_submitted_at ON ideas (submitted_at)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas (submitter_id)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status)"
        )
        print("  Expanded: category CHECK constraint to 7 values")
    else:
        print("  Skipped (complete): category CHECK already has all 7 values")

    conn.commit()
    cur.execute("PRAGMA foreign_keys=ON")
    print("Migration forward complete.")


def rollback(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=OFF")

    # Remove extra_data by table recreation (SQLite cannot DROP COLUMN in older versions)
    base_cols = _base_columns()
    cur.executescript(_CREATE_IDEAS_4)
    cur.execute(
        f"INSERT INTO ideas_new SELECT {', '.join(base_cols)} FROM ideas"
    )
    cur.execute("DROP TABLE ideas")
    cur.execute("ALTER TABLE ideas_new RENAME TO ideas")
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_submitted_at ON ideas (submitted_at)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas (submitter_id)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status)"
    )
    conn.commit()
    cur.execute("PRAGMA foreign_keys=ON")
    print("Rollback complete: extra_data column removed, category CHECK reverted to 4 values.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate extra_data column and category constraint.")
    parser.add_argument("--rollback", action="store_true", help="Reverse the migration")
    parser.add_argument("--db", default=str(DB_PATH), help="Path to SQLite database file")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    try:
        if args.rollback:
            rollback(conn)
        else:
            forward(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
