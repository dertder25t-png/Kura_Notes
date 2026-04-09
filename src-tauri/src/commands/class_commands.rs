use crate::storage;
use crate::storage::classes::ClassItem;

#[tauri::command]
pub fn list_classes(app_handle: tauri::AppHandle) -> Result<Vec<ClassItem>, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::classes::list_classes(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_class(
    app_handle: tauri::AppHandle,
    name: String,
    color: Option<String>,
) -> Result<ClassItem, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::classes::create_class(&conn, name, color).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_class(
    app_handle: tauri::AppHandle,
    class_id: i64,
    name: String,
    color: Option<String>,
) -> Result<ClassItem, String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::classes::update_class(&conn, class_id, name, color).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_class(app_handle: tauri::AppHandle, class_id: i64) -> Result<(), String> {
    let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
    storage::classes::delete_class(&conn, class_id).map_err(|e| e.to_string())
}
