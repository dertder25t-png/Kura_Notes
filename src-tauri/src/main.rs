#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod storage;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            storage::db::init(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::class_commands::list_classes,
            commands::class_commands::create_class,
            commands::class_commands::update_class,
            commands::class_commands::delete_class,
            commands::folder_commands::list_folders,
            commands::folder_commands::create_folder,
            commands::folder_commands::rename_folder,
            commands::folder_commands::delete_folder,
            commands::note_commands::save_note,
            commands::note_commands::load_note,
            commands::note_commands::list_notes,
            commands::note_commands::list_notes_by_folder,
            commands::note_commands::move_note_to_folder,
            commands::note_commands::delete_note,
            commands::note_commands::bootstrap_first_launch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Scholr");
}
