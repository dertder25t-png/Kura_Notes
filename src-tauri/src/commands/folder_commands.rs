use crate::storage;
use crate::storage::folders::Folder;

#[tauri::command]
pub fn list_folders(app_handle: tauri::AppHandle, class_id: i64) -> Result<Vec<Folder>, String> {
	let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
	storage::folders::list_folders(&conn, class_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(
	app_handle: tauri::AppHandle,
	class_id: i64,
	name: String,
) -> Result<Folder, String> {
	let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
	storage::folders::create_folder(&conn, class_id, name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_folder(
	app_handle: tauri::AppHandle,
	folder_id: i64,
	name: String,
) -> Result<Folder, String> {
	let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
	storage::folders::rename_folder(&conn, folder_id, name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_folder(
	app_handle: tauri::AppHandle,
	class_id: i64,
	folder_id: i64,
) -> Result<(), String> {
	let conn = storage::db::get_conn(&app_handle).map_err(|e| e.to_string())?;
	storage::folders::delete_folder(&conn, class_id, folder_id).map_err(|e| e.to_string())
}
