use crate::storage;
use crate::storage::notes::Note;
use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use tauri::Emitter;

fn project_root() -> Result<PathBuf, String> {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Failed to resolve project root".to_string())
        .map(|path| path.to_path_buf())
}

fn ensure_default_workspace(conn: &Connection) -> Result<(i64, i64), String> {
    let class_id = match conn
        .query_row("SELECT id FROM classes ORDER BY id LIMIT 1", [], |row| row.get::<_, i64>(0))
        .optional()
        .map_err(|err| err.to_string())?
    {
        Some(id) => id,
        None => {
            conn.execute("INSERT INTO classes (name, color) VALUES ('My Notes', '#6f7ea8')", [])
                .map_err(|err| err.to_string())?;
            conn.last_insert_rowid()
        }
    };

    let folder_id = match conn
        .query_row(
            "SELECT id FROM folders WHERE class_id = ?1 AND name = 'Inbox' ORDER BY id LIMIT 1",
            [class_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
    {
        Some(id) => id,
        None => {
            conn.execute(
                "INSERT INTO folders (class_id, name) VALUES (?1, 'Inbox')",
                params![class_id],
            )
            .map_err(|err| err.to_string())?;
            conn.last_insert_rowid()
        }
    };

    Ok((class_id, folder_id))
}

fn capture_note_title() -> String {
    format!("Inbox {}", Local::now().format("%Y-%m-%d"))
}

fn normalize_capture_content(content: &str, tag: Option<&str>) -> String {
    let cleaned = content.trim().replace("\r\n", "\n");
    if cleaned.is_empty() {
        return String::new();
    }

    let tag_prefix = tag
        .map(|value| value.trim().trim_start_matches('#').to_string())
        .filter(|value| !value.is_empty())
        .map(|value| format!("#{}", value));

    let mut lines = cleaned.lines();
    let first_line = lines.next().unwrap_or_default().trim();
    let mut output = String::new();

    match tag_prefix {
        Some(prefix) => {
            output.push_str("- ");
            output.push_str(&prefix);
            output.push(' ');
            output.push_str(first_line);
        }
        None => {
            output.push_str("- ");
            output.push_str(first_line);
        }
    }

    for line in lines {
        output.push('\n');
        output.push_str("  ");
        output.push_str(line.trim());
    }

    output
}

fn upsert_capture_note(
    conn: &Connection,
    project_root: &Path,
    class_id: i64,
    folder_id: i64,
    title: String,
    entry: String,
) -> Result<Note, String> {
    let existing = conn
        .query_row(
            "SELECT id, raw_content FROM notes WHERE class_id = ?1 AND folder_id = ?2 AND title = ?3 ORDER BY id LIMIT 1",
            params![class_id, folder_id, title],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?.unwrap_or_default())),
        )
        .optional()
        .map_err(|err| err.to_string())?;

    if let Some((note_id, current_raw_content)) = existing {
        let next_raw_content = if current_raw_content.trim().is_empty() {
            entry
        } else {
            format!("{}\n{}", current_raw_content.trim_end(), entry)
        };

        return storage::notes::save_note(
            conn,
            project_root,
            Some(note_id),
            Some(class_id),
            Some(folder_id),
            title,
            next_raw_content,
        )
        .map_err(|err| err.to_string());
    }

    storage::notes::save_note(
        conn,
        project_root,
        None,
        Some(class_id),
        Some(folder_id),
        title,
        entry,
    )
    .map_err(|err| err.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardRow {
    pub id: i64,
    pub note_id: Option<i64>,
    pub class_id: Option<i64>,
    pub source_line_index: i64,
    pub context_type: String,
    pub context_label: String,
    pub front: String,
    pub back: String,
    pub source_line: String,
    pub metadata: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn save_note(
    app_handle: tauri::AppHandle,
    note_id: Option<i64>,
    class_id: Option<i64>,
    folder_id: Option<i64>,
    title: String,
    raw_content: String,
) -> Result<Note, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    let project_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Failed to resolve project root".to_string())?
        .to_path_buf();

    storage::notes::save_note(
        &conn,
        &project_root,
        note_id,
        class_id,
        folder_id,
        title,
        raw_content,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_note(app_handle: tauri::AppHandle, note_id: i64) -> Result<Note, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::notes::load_note(&conn, note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_flashcard(
    app_handle: tauri::AppHandle,
    note_id: Option<i64>,
    class_id: Option<i64>,
    source_line_index: Option<i64>,
    context_type: String,
    context_label: String,
    front: String,
    back: String,
    source_line: Option<String>,
    metadata_json: Option<String>,
) -> Result<FlashcardRow, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    let metadata = metadata_json
        .as_deref()
        .and_then(|value| serde_json::from_str::<Value>(value).ok())
        .unwrap_or_else(|| serde_json::json!({}));
    let source_line = source_line.unwrap_or_default();

    conn.execute(
        "INSERT INTO flashcards (
            note_id, class_id, source_line_index, context_type, context_label,
            front, back, source_line, metadata_json, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
        params![
            note_id,
            class_id,
            source_line_index.unwrap_or(0),
            context_type,
            context_label,
            front,
            back,
            source_line,
            metadata.to_string()
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let row = conn
        .query_row(
            "SELECT id, note_id, class_id, source_line_index, context_type, context_label, front, back, source_line, metadata_json, created_at, updated_at
             FROM flashcards WHERE id = ?1",
            [id],
            |row| {
                let metadata_json = row.get::<_, Option<String>>(9)?.unwrap_or_else(|| "{}".to_string());
                Ok(FlashcardRow {
                    id: row.get(0)?,
                    note_id: row.get(1)?,
                    class_id: row.get(2)?,
                    source_line_index: row.get(3)?,
                    context_type: row.get(4)?,
                    context_label: row.get(5)?,
                    front: row.get(6)?,
                    back: row.get(7)?,
                    source_line: row.get(8)?,
                    metadata: serde_json::from_str(&metadata_json).unwrap_or_else(|_| serde_json::json!({})),
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(row)
}

#[tauri::command]
pub fn list_flashcards(
    app_handle: tauri::AppHandle,
    note_id: Option<i64>,
    class_id: Option<i64>,
) -> Result<Vec<FlashcardRow>, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, note_id, class_id, source_line_index, context_type, context_label, front, back, source_line, metadata_json, created_at, updated_at
             FROM flashcards
             WHERE (?1 IS NULL OR note_id = ?1)
               AND (?2 IS NULL OR class_id = ?2)
             ORDER BY updated_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![note_id, class_id], |row| {
            let metadata_json = row.get::<_, Option<String>>(9)?.unwrap_or_else(|| "{}".to_string());
            Ok(FlashcardRow {
                id: row.get(0)?,
                note_id: row.get(1)?,
                class_id: row.get(2)?,
                source_line_index: row.get(3)?,
                context_type: row.get(4)?,
                context_label: row.get(5)?,
                front: row.get(6)?,
                back: row.get(7)?,
                source_line: row.get(8)?,
                metadata: serde_json::from_str(&metadata_json).unwrap_or_else(|_| serde_json::json!({})),
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut cards = Vec::new();
    for row in rows {
        cards.push(row.map_err(|e| e.to_string())?);
    }
    Ok(cards)
}

#[tauri::command]
pub fn delete_flashcard(app_handle: tauri::AppHandle, card_id: i64) -> Result<(), String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM flashcards WHERE id = ?1", params![card_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn log_telemetry_event(
    app_handle: tauri::AppHandle,
    event_type: String,
    note_id: Option<i64>,
    metadata_json: Option<String>,
) -> Result<(), String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    let metadata = metadata_json.unwrap_or_else(|| "{}".to_string());

    conn.execute(
        "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))",
        params![event_type, note_id, metadata],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn list_notes(app_handle: tauri::AppHandle, class_id: Option<i64>) -> Result<Vec<Note>, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::notes::list_notes(&conn, class_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_notes_by_folder(
    app_handle: tauri::AppHandle,
    class_id: Option<i64>,
    folder_id: i64,
) -> Result<Vec<Note>, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::notes::list_notes_by_folder(&conn, class_id, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_note_to_folder(
    app_handle: tauri::AppHandle,
    note_id: i64,
    class_id: Option<i64>,
    folder_id: i64,
) -> Result<Note, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    if !storage::folders::folder_exists(&conn, folder_id).map_err(|e| e.to_string())? {
        return Err("Target folder does not exist".to_string());
    }
    storage::notes::move_note_to_folder(&conn, note_id, class_id, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(app_handle: tauri::AppHandle, note_id: i64) -> Result<(), String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::notes::delete_note(&conn, note_id).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapResult {
    pub already_done: bool,
    pub note_id: Option<i64>,
}

#[tauri::command]
pub async fn bootstrap_first_launch(app: tauri::AppHandle) -> Result<BootstrapResult, String> {
    let conn = storage::db::get_conn(&app).map_err(|e| e.to_string())?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM classes", [], |r| r.get(0))
        .unwrap_or(0);

    if count > 0 {
        // App already initialized
        return Ok(BootstrapResult { already_done: true, note_id: None });
    }

    let (class_id, folder_id) = ensure_default_workspace(&conn)?;
    let note = storage::notes::save_note(
        &conn,
        &project_root()?,
        None,
        Some(class_id),
        Some(folder_id),
        "Welcome to Scholr".to_string(),
        WELCOME_NOTE.to_string(),
    )
    .map_err(|e| e.to_string())?;

    Ok(BootstrapResult { already_done: false, note_id: Some(note.id) })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCaptureResult {
    pub note_id: i64,
    pub title: String,
}

#[tauri::command]
pub fn quick_capture(
    app: tauri::AppHandle,
    content: String,
    tag: Option<String>,
) -> Result<QuickCaptureResult, String> {
    let conn = storage::db::get_conn(&app).map_err(|e| e.to_string())?;
    let (class_id, folder_id) = ensure_default_workspace(&conn)?;
    let title = capture_note_title();
    let entry = normalize_capture_content(&content, tag.as_deref());

    if entry.is_empty() {
        return Err("Capture content cannot be empty".to_string());
    }

    let note = upsert_capture_note(&conn, &project_root()?, class_id, folder_id, title.clone(), entry)?;

    app.emit("kura:data-invalidated", ())
        .map_err(|err| err.to_string())?;
    app.emit("kura:close-capture-window", ())
        .map_err(|err| err.to_string())?;

    Ok(QuickCaptureResult { note_id: note.id, title })
}

const WELCOME_NOTE: &str = r#"## Welcome to Scholr

Start writing here — this is your note.

**Quick things to try:**

- Type `#` then Space → heading
- Type `-` then Space → bullet list
- Type `/` on a blank line → command menu
- Highlight any text → toolbar appears for flashcards

**The :: trick (works in any subject):**
What is apologetics? :: Knowing what we believe and why, and being able to communicate it effectively

That line just created a flashcard. Try it with dates, formulas, drug names, Bible verses — the app detects the type automatically.

**When your notes are ready:**
Click ✦ Synthesize to generate a clean study guide from this note.

---
*Delete this note whenever you're ready.*
"#;
