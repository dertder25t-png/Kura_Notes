use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;

fn has_column(conn: &Connection, table: &str, column: &str) -> anyhow::Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;

    for row in rows {
        if row? == column {
            return Ok(true);
        }
    }

    Ok(false)
}

fn column_is_not_null(conn: &Connection, table: &str, column: &str) -> anyhow::Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(1)?,
            row.get::<_, i64>(3)?,
        ))
    })?;

    for row in rows {
        let (name, not_null) = row?;
        if name == column {
            return Ok(not_null == 1);
        }
    }

    Ok(false)
}

fn migrate_nullable_class_references(conn: &Connection) -> anyhow::Result<()> {
    if column_is_not_null(conn, "notes", "class_id")? {
        conn.execute_batch(
            "CREATE TABLE notes_new (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id         INTEGER REFERENCES classes(id) ON DELETE SET NULL,
                folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
                title            TEXT,
                raw_content      TEXT DEFAULT '',
                study_content    TEXT DEFAULT '',
                audio_transcript TEXT DEFAULT '',
                file_path        TEXT,
                created_at       TEXT DEFAULT (datetime('now')),
                updated_at       TEXT DEFAULT (datetime('now'))
            );

            INSERT INTO notes_new (id, class_id, folder_id, title, raw_content, study_content, audio_transcript, file_path, created_at, updated_at)
            SELECT id, class_id, folder_id, title, raw_content, study_content, audio_transcript, file_path, created_at, updated_at
            FROM notes;

            DROP TABLE notes;
            ALTER TABLE notes_new RENAME TO notes;",
        )?;
    }

    if column_is_not_null(conn, "folders", "class_id")? {
        conn.execute_batch(
            "CREATE TABLE folders_new (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
                name        TEXT NOT NULL,
                created_at  TEXT DEFAULT (datetime('now'))
            );

            INSERT INTO folders_new (id, class_id, name, created_at)
            SELECT id, class_id, name, created_at
            FROM folders;

            DROP TABLE folders;
            ALTER TABLE folders_new RENAME TO folders;",
        )?;
    }

    Ok(())
}

fn migrate_folders(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS folders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
            name        TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );",
    )?;

    if !has_column(conn, "notes", "folder_id")? {
        conn.execute("ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL", [])?;
    }

    Ok(())
}

fn migrate_flashcards(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS flashcards (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id           INTEGER REFERENCES notes(id) ON DELETE CASCADE,
            class_id          INTEGER REFERENCES classes(id) ON DELETE SET NULL,
            source_line_index  INTEGER DEFAULT 0,
            context_type      TEXT NOT NULL,
            context_label     TEXT NOT NULL,
            front             TEXT NOT NULL,
            back              TEXT NOT NULL,
            source_line       TEXT DEFAULT '',
            metadata_json     TEXT DEFAULT '{}',
            created_at        TEXT DEFAULT (datetime('now')),
            updated_at        TEXT DEFAULT (datetime('now'))
        );",
    )?;

    Ok(())
}

pub fn db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .expect("no app data dir")
        .join("scholr.db")
}

pub fn init(app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    if let Some(parent) = db_path(app_handle).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let path = db_path(app_handle);
    let conn = Connection::open(path)?;
    conn.execute_batch(include_str!("../../../schema.sql"))?;
    migrate_nullable_class_references(&conn)?;
    migrate_folders(&conn)?;
    migrate_flashcards(&conn)?;
    Ok(())
}

pub fn get_conn(app_handle: &tauri::AppHandle) -> anyhow::Result<Connection> {
    Ok(Connection::open(db_path(app_handle))?)
}
