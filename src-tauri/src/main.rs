#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod commands;
mod omni_capture;
mod storage;

use ai::gemma::{keepalive_local_gemma4, prewarm_local_gemma4, unload_local_gemma4, DEFAULT_GEMMA_MODEL};
use ai::state::AiState;
use rusqlite::params;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::Emitter;
use tokio::sync::Mutex;

fn main() {
    let ai_state = Arc::new(Mutex::new(AiState::new()));

    tauri::Builder::default()
        .manage(ai_state.clone())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(move |app| {
            storage::db::init(app.handle())?;
            omni_capture::install_global_shortcuts(app.handle())?;

            let ai_settings = storage::ai::load_ai_settings(app.handle()).unwrap_or_default();
            let selected_model = ai_settings.selected_model.clone();
            let ollama_url = ai_settings.ollama_url.clone();
            {
                let ai_state = ai_state.clone();
                let selected_model = selected_model.clone();
                let ollama_url = ollama_url.clone();
                tauri::async_runtime::spawn(async move {
                    let mut state = ai_state.lock().await;
                    state.selected_model = selected_model;
                    state.ollama_url = Some(ollama_url);
                });
            }

            let app_handle = app.handle().clone();
            let state_for_startup = ai_state.clone();
            let startup_model = selected_model;
            tauri::async_runtime::spawn(async move {
                let _ = app_handle.emit(
                    "kura:engine-status",
                    serde_json::json!({ "state": "WARMING" }),
                );

                let mut startup_error: Option<String> = None;
                let mut warmed_model: Option<String> = None;

                for attempt in 0..6 {
                    match prewarm_local_gemma4(startup_model.as_deref()).await {
                        Ok(model_name) => {
                            warmed_model = Some(model_name);
                            startup_error = None;
                            break;
                        }
                        Err(error) => {
                            startup_error = Some(error);
                            if attempt < 5 {
                                tokio::time::sleep(Duration::from_secs(5)).await;
                            }
                        }
                    }
                }

                if let Some(model_name) = warmed_model {
                        {
                            let mut state = state_for_startup.lock().await;
                            state.generator_model = Some(model_name.clone());
                            state.selected_model = startup_model.clone();
                            state.last_accessed = Instant::now();
                        }

                        if let Ok(conn) = storage::db::get_conn(&app_handle) {
                            let _ = conn.execute(
                                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                                 VALUES (?1, NULL, ?2, datetime('now'))",
                                params![
                                    "AI_STARTUP_WARMED",
                                    serde_json::json!({ "model": model_name }).to_string(),
                                ],
                            );
                        }

                        let _ = app_handle.emit(
                            "kura:engine-status",
                            serde_json::json!({ "state": "IDLE" }),
                        );
                } else if let Some(error) = startup_error {
                        if let Ok(conn) = storage::db::get_conn(&app_handle) {
                            let _ = conn.execute(
                                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                                 VALUES (?1, NULL, ?2, datetime('now'))",
                                params![
                                    "AI_STARTUP_WARMUP_FAILED",
                                    serde_json::json!({ "reason": error, "model": startup_model.clone().unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                                ],
                            );
                        }

                        let _ = app_handle.emit(
                            "kura:engine-status",
                            serde_json::json!({ "state": "MODEL_UNAVAILABLE" }),
                        );
                }
            });

            let state_for_sweeper = ai_state.clone();
            let app_for_sweeper = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(60)).await;

                    let mut should_keepalive = false;
                    let mut should_drop = false;
                    {
                        let state = state_for_sweeper.lock().await;
                        if state.generator_model.is_some() {
                            if state.last_accessed.elapsed() > Duration::from_secs(300) {
                                should_drop = true;
                            } else {
                                should_keepalive = true;
                            }
                        }
                    }

                    let selected_model = {
                        let state = state_for_sweeper.lock().await;
                        state.selected_model.clone()
                    };

                    if should_keepalive && keepalive_local_gemma4(selected_model.as_deref()).await.is_err() {
                        let mut state = state_for_sweeper.lock().await;
                        state.generator_model = None;
                        if let Ok(conn) = storage::db::get_conn(&app_for_sweeper) {
                            let _ = conn.execute(
                                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                                 VALUES (?1, NULL, ?2, datetime('now'))",
                                params![
                                    "AI_KEEPALIVE_FAILED",
                                    serde_json::json!({ "model": selected_model.unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                                ],
                            );
                        }
                        let _ = app_for_sweeper.emit(
                            "kura:engine-status",
                            serde_json::json!({ "state": "MODEL_UNAVAILABLE" }),
                        );
                        continue;
                    }

                    if should_drop {
                        let _ = unload_local_gemma4(selected_model.as_deref()).await;
                        let mut state = state_for_sweeper.lock().await;
                        state.generator_model = None;
                        if let Ok(conn) = storage::db::get_conn(&app_for_sweeper) {
                            let _ = conn.execute(
                                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                                 VALUES (?1, NULL, ?2, datetime('now'))",
                                params![
                                    "AI_MODEL_UNLOADED_IDLE",
                                    serde_json::json!({ "idle_seconds": 300, "model": selected_model.unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                                ],
                            );
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ai_commands::benchmark_ai_models,
            commands::ai_commands::get_ai_setup_state,
            commands::ai_commands::process_idle_chunk,
            commands::ai_commands::save_ai_settings,
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
            commands::note_commands::quick_capture,
            commands::note_commands::create_flashcard,
            commands::note_commands::list_flashcards,
            commands::note_commands::delete_flashcard,
            commands::note_commands::log_telemetry_event,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Scholr");
}
