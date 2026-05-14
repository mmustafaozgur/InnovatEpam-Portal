"""Idempotent migration: introduce attachments table and remove inline attachment_* columns."""
import argparse
import sqlite3
import pathlib
import uuid

DB_PATH = pathlib.Path(__file__).parent.parent / "innovatepam.db"

_CREATE_ATTACHMENTS = """
CREATE TABLE IF NOT EXISTS attachments (
    id          TEXT PRIMARY KEY,
    idea_id     TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size        INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
)
"""

_CREATE_IDEAS_NEW = """
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
    evaluation_status TEXT NOT NULL DEFAULT 'submitted',
    evaluation_comment TEXT,
    evaluated_at TEXT,
    assigned_admin_id TEXT,
    extra_data TEXT,
    CHECK(length(title) <= 150),
    CHECK(length(description) <= 3000),
    CHECK(evaluation_status IN ('submitted','under_review','accepted','rejected'))
)
"""

_CREATE_IDEAS_ROLLBACK = """
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

_REBUILD_INDICES = [
    "CREATE INDEX IF NOT EXISTS idx_ideas_submitted_at ON ideas (submitted_at)",
    "CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas (submitter_id)",
    "CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status)",
]


def _current_columns(cur: sqlite3.Cursor, table: str = "ideas") -> set[str]:
    return {row[1] for row in cur.execute(f"PRAGMA table_info({table})")}


def _table_exists(cur: sqlite3.Cursor, name: str) -> bool:
    row = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def _index_exists(cur: sqlite3.Cursor, name: str) -> bool:
    row = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,)
    ).fetchone()
    return row is not None


def forward(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=OFF")

    # Step 1: Create attachments table
    if not _table_exists(cur, "attachments"):
        cur.executescript(_CREATE_ATTACHMENTS)
        print("  Created: attachments table")
    else:
        print("  Skipped (exists): attachments table")

    # Step 2: Create index on attachments.idea_id
    if not _index_exists(cur, "idx_attachments_idea_id"):
        cur.execute("CREATE INDEX idx_attachments_idea_id ON attachments (idea_id)")
        print("  Created: idx_attachments_idea_id index")
    else:
        print("  Skipped (exists): idx_attachments_idea_id index")

    # Step 3: Migrate existing single-file rows from ideas → attachments
    cols = _current_columns(cur)
    if "attachment_stored_name" in cols:
        migrated = cur.execute(
            """
            INSERT INTO attachments (id, idea_id, filename, stored_name, mime_type, size, uploaded_at)
            SELECT
                lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
                    substr(lower(hex(randomblob(2))),2) || '-' ||
                    substr('89ab',abs(random()) % 4 + 1, 1) ||
                    substr(lower(hex(randomblob(2))),2) || '-' ||
                    lower(hex(randomblob(6))),
                id,
                attachment_filename,
                attachment_stored_name,
                attachment_mime_type,
                COALESCE(attachment_size, 0),
                COALESCE(submitted_at, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            FROM ideas
            WHERE attachment_stored_name IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM attachments WHERE idea_id = ideas.id)
            """
        )
        print(f"  Migrated: {migrated.rowcount} existing attachment(s) from ideas table")

        # Step 4: Recreate ideas table without attachment_* columns
        idea_cols = [
            "id", "title", "description", "category", "submitter_id", "submitted_at",
            "evaluation_status", "evaluation_comment", "evaluated_at",
            "assigned_admin_id", "extra_data",
        ]
        cur.executescript(_CREATE_IDEAS_NEW)
        cur.execute(f"INSERT INTO ideas_new SELECT {', '.join(idea_cols)} FROM ideas")
        cur.execute("DROP TABLE ideas")
        cur.execute("ALTER TABLE ideas_new RENAME TO ideas")
        for idx_sql in _REBUILD_INDICES:
            cur.execute(idx_sql)
        print("  Recreated: ideas table (attachment_* columns removed)")
    else:
        print("  Skipped (already done): ideas table already lacks attachment_* columns")

    conn.commit()
    cur.execute("PRAGMA foreign_keys=ON")
    print("Migration forward complete.")


def rollback(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=OFF")

    cols = _current_columns(cur)
    if "attachment_stored_name" not in cols:
        # Restore attachment_* columns by table recreation
        idea_cols = [
            "id", "title", "description", "category", "submitter_id", "submitted_at",
            "evaluation_status", "evaluation_comment", "evaluated_at",
            "assigned_admin_id", "extra_data",
        ]
        cur.executescript(_CREATE_IDEAS_ROLLBACK)
        # Copy non-attachment columns; NULL out attachment_* (will be filled from attachments table)
        cur.execute(
            f"""INSERT INTO ideas_new
                ({', '.join(idea_cols)},
                 attachment_filename, attachment_stored_name, attachment_mime_type, attachment_size)
                SELECT {', '.join(idea_cols)}, NULL, NULL, NULL, NULL FROM ideas"""
        )
        # Copy back one attachment per idea (oldest by rowid if multiple)
        cur.execute(
            """
            UPDATE ideas_new
            SET attachment_filename    = a.filename,
                attachment_stored_name = a.stored_name,
                attachment_mime_type   = a.mime_type,
                attachment_size        = a.size
            FROM (
                SELECT idea_id, filename, stored_name, mime_type, size,
                       ROW_NUMBER() OVER (PARTITION BY idea_id ORDER BY uploaded_at ASC) AS rn
                FROM attachments
            ) AS a
            WHERE a.idea_id = ideas_new.id AND a.rn = 1
            """
        )
        cur.execute("DROP TABLE ideas")
        cur.execute("ALTER TABLE ideas_new RENAME TO ideas")
        for idx_sql in _REBUILD_INDICES:
            cur.execute(idx_sql)
        print("  Restored: attachment_* columns to ideas table")
    else:
        print("  Skipped: attachment_* columns already present on ideas table")

    # Drop attachments table
    if _table_exists(cur, "attachments"):
        cur.execute("DROP TABLE attachments")
        print("  Dropped: attachments table")

    conn.commit()
    cur.execute("PRAGMA foreign_keys=ON")
    print("Rollback complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate from inline attachment_* columns to attachments table.")
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
