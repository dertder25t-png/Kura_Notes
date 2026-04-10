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
