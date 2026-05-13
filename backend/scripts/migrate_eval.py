"""One-time migration: add evaluation columns to ideas table."""
import sqlite3
import pathlib

DB_PATH = pathlib.Path(__file__).parent.parent / "innovatepam.db"

NEW_COLUMNS = [
    ("evaluation_status", "TEXT NOT NULL DEFAULT 'submitted'"),
    ("evaluation_comment", "TEXT"),
    ("evaluated_at", "TEXT"),
    ("assigned_admin_id", "TEXT"),
]


def run() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(ideas)")}
    for col_name, col_def in NEW_COLUMNS:
        if col_name not in existing:
            cur.execute(f"ALTER TABLE ideas ADD COLUMN {col_name} {col_def}")
            print(f"  Added: {col_name}")
        else:
            print(f"  Skipped (exists): {col_name}")
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_ideas_evaluation_status ON ideas (evaluation_status)"
    )
    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
