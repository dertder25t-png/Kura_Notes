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

fn migrate_folders(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS folders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );",
    )?;

    if !has_column(conn, "notes", "folder_id")? {
        conn.execute("ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL", [])?;
    }

    conn.execute_batch(
        "INSERT INTO folders (class_id, name, created_at)
         SELECT c.id, 'Inbox', datetime('now')
         FROM classes c
         WHERE NOT EXISTS (
           SELECT 1 FROM folders f WHERE f.class_id = c.id
         );",
    )?;

    conn.execute_batch(
        "UPDATE notes
         SET folder_id = (
           SELECT f.id
           FROM folders f
           WHERE f.class_id = notes.class_id
           ORDER BY f.id ASC
           LIMIT 1
         )
         WHERE folder_id IS NULL;",
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
    migrate_folders(&conn)?;
    Ok(())
}

pub fn get_conn(app_handle: &tauri::AppHandle) -> anyhow::Result<Connection> {
    Ok(Connection::open(db_path(app_handle))?)
}
