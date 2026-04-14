use crate::storage;
use crate::storage::notes::Note;

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

    conn.execute("INSERT INTO classes (name, color) VALUES ('My Notes', '#6f7ea8')", [])
        .map_err(|e| e.to_string())?;
    let class_id = conn.last_insert_rowid();

    conn.execute("INSERT INTO folders (class_id, name) VALUES (?1, 'Inbox')",
        rusqlite::params![class_id]).map_err(|e| e.to_string())?;
    let folder_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO notes (class_id, folder_id, title, raw_content) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![class_id, folder_id, "Welcome to Scholr", WELCOME_NOTE],
    ).map_err(|e| e.to_string())?;
    let note_id = conn.last_insert_rowid();

    Ok(BootstrapResult { already_done: false, note_id: Some(note_id) })
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
