use crate::ai::gemma::{
    benchmark_local_gemma_models,
    discover_local_gemma_models,
    generate_candidates_with_gemma4,
    prewarm_local_gemma4,
    DEFAULT_GEMMA_MODEL,
};
use crate::ai::heuristics::{evaluate_chunk, PreRouterResult};
use crate::ai::state::AiState;
use crate::storage;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatusPayload {
    state: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSetupSnapshot {
    pub selected_model: Option<String>,
    pub ollama_url: String,
    pub onboarding_complete: bool,
    pub available_models: Vec<crate::ai::gemma::LocalGemmaModel>,
    pub current_model: Option<String>,
    pub recommended_model: Option<String>,
    pub connection_status: String,
    pub connection_error: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiBenchmarkSummary {
    pub results: Vec<crate::ai::gemma::ModelBenchmarkResult>,
    pub recommended_model: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAiSettingsInput {
    pub selected_model: Option<String>,
    pub ollama_url: Option<String>,
    pub onboarding_complete: Option<bool>,
    pub warm_model: Option<bool>,
}

async fn current_ai_snapshot(app: &tauri::AppHandle, ai_state: &State<'_, Arc<Mutex<AiState>>>) -> Result<AiSetupSnapshot, String> {
    let settings = storage::ai::load_ai_settings(app).map_err(|e| e.to_string())?;
    let (available_models, connection_status, connection_error) = match discover_local_gemma_models().await {
        Ok(models) => (
            models,
            if settings.selected_model.is_some() { "ready".to_string() } else { "available".to_string() },
            None,
        ),
        Err(error) => (Vec::new(), "offline".to_string(), Some(error)),
    };
    let current_model = {
        let state = ai_state.lock().await;
        state.generator_model.clone().or_else(|| state.selected_model.clone())
    };

    Ok(AiSetupSnapshot {
        selected_model: settings.selected_model.clone(),
        ollama_url: settings.ollama_url.clone(),
        onboarding_complete: settings.onboarding_complete,
        recommended_model: settings.selected_model.clone().or_else(|| Some(DEFAULT_GEMMA_MODEL.to_string())),
        available_models,
        current_model,
        connection_status,
        connection_error,
    })
}

#[tauri::command]
pub async fn get_ai_setup_state(
    app: tauri::AppHandle,
    ai_state: State<'_, Arc<Mutex<AiState>>>,
) -> Result<AiSetupSnapshot, String> {
    current_ai_snapshot(&app, &ai_state).await
}

#[tauri::command]
pub async fn save_ai_settings(
    app: tauri::AppHandle,
    ai_state: State<'_, Arc<Mutex<AiState>>>,
    input: SaveAiSettingsInput,
) -> Result<AiSetupSnapshot, String> {
    let mut settings = storage::ai::load_ai_settings(&app).map_err(|e| e.to_string())?;

    if let Some(selected_model) = input.selected_model {
        settings.selected_model = if selected_model.trim().is_empty() { None } else { Some(selected_model) };
    }

    if let Some(ollama_url) = input.ollama_url {
        if !ollama_url.trim().is_empty() {
            settings.ollama_url = ollama_url;
        }
    }

    if let Some(onboarding_complete) = input.onboarding_complete {
        settings.onboarding_complete = onboarding_complete;
    }

    storage::ai::save_ai_settings(&app, &settings).map_err(|e| e.to_string())?;

    {
        let mut state = ai_state.lock().await;
        state.selected_model = settings.selected_model.clone();
        state.ollama_url = Some(settings.ollama_url.clone());
    }

    if input.warm_model.unwrap_or(true) {
        if let Ok(model_name) = prewarm_local_gemma4(settings.selected_model.as_deref()).await {
            let mut state = ai_state.lock().await;
            state.generator_model = Some(model_name);
        }
    }

    current_ai_snapshot(&app, &ai_state).await
}

#[tauri::command]
pub async fn benchmark_ai_models(
    app: tauri::AppHandle,
    ai_state: State<'_, Arc<Mutex<AiState>>>,
) -> Result<AiBenchmarkSummary, String> {
    let selected_model = {
        let state = ai_state.lock().await;
        state.selected_model.clone()
    };

    let results = benchmark_local_gemma_models(selected_model.as_deref()).await?;
    let recommended_model = results
        .iter()
        .find(|result| result.success)
        .map(|result| result.model.clone());

    if let Some(model) = recommended_model.clone() {
        let mut settings = storage::ai::load_ai_settings(&app).map_err(|e| e.to_string())?;
        settings.selected_model = Some(model.clone());
        settings.onboarding_complete = true;
        storage::ai::save_ai_settings(&app, &settings).map_err(|e| e.to_string())?;

        let mut state = ai_state.lock().await;
        state.selected_model = Some(model);
    }

    Ok(AiBenchmarkSummary {
        results,
        recommended_model,
    })
}

#[tauri::command]
pub async fn process_idle_chunk(
    app: tauri::AppHandle,
    chunk: String,
    note_id: Option<i64>,
    ai_state: State<'_, Arc<Mutex<AiState>>>,
) -> Result<String, String> {
    let conn = storage::db::get_conn(&app).map_err(|e| e.to_string())?;

    match evaluate_chunk(&chunk) {
        PreRouterResult::Pass => {}
        other => {
            let reason = format!("{:?}", other);
            conn.execute(
                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![
                    "AI_SKIPPED_HEURISTICS",
                    note_id,
                    serde_json::json!({ "reason": reason }).to_string(),
                ],
            )
            .map_err(|e| e.to_string())?;
            return Ok("SKIPPED_HEURISTICS".to_string());
        }
    }

    let mut needs_warmup = false;
    let blocked_reason = {
        let mut state = ai_state.lock().await;
        if let Err(reason) = state.is_system_healthy() {
            Some(reason.to_string())
        } else {
            if state.generator_model.is_none() {
                needs_warmup = true;
            }
            state.last_accessed = Instant::now();
            None
        }
    };

    if let Some(reason) = blocked_reason {
        let event_type = match reason.as_str() {
            "CPU_THROTTLED" => "AI_CPU_THROTTLED",
            "THERMAL_THROTTLED" => "AI_THERMAL_THROTTLED",
            "RATE_LIMITED" => "AI_RATE_LIMITED",
            "BATTERY_SAVER" => "AI_BATTERY_SAVER",
            _ => "AI_BLOCKED",
        };

        conn.execute(
            "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
             VALUES (?1, ?2, ?3, datetime('now'))",
            params![
                event_type,
                note_id,
                serde_json::json!({ "reason": reason }).to_string(),
            ],
        )
        .map_err(|e| e.to_string())?;

        let status = if reason == "CPU_THROTTLED" || reason == "THERMAL_THROTTLED" {
            "THROTTLED"
        } else if reason == "BATTERY_SAVER" {
            "BATTERY_SAVER"
        } else {
            "RATE_LIMITED"
        };
        app.emit(
            "kura:engine-status",
            EngineStatusPayload { state: status },
        )
        .map_err(|e| e.to_string())?;

        return Ok(reason);
    }

    if needs_warmup {
        app.emit(
            "kura:engine-status",
            EngineStatusPayload { state: "WARMING" },
        )
        .map_err(|e| e.to_string())?;

        let selected_model = {
            let state = ai_state.lock().await;
            state.selected_model.clone()
        };

        let warmed_model = match prewarm_local_gemma4(selected_model.as_deref()).await {
            Ok(model_name) => model_name,
            Err(error) => {
            conn.execute(
                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![
                    "AI_MODEL_UNAVAILABLE",
                    note_id,
                    serde_json::json!({ "reason": error, "model": selected_model.unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                ],
            )
            .map_err(|e| e.to_string())?;

            app.emit(
                "kura:engine-status",
                EngineStatusPayload {
                    state: "MODEL_UNAVAILABLE",
                },
            )
            .map_err(|e| e.to_string())?;

            return Ok("MODEL_UNAVAILABLE".to_string());
            }
        };

        let mut state = ai_state.lock().await;
        state.generator_model = Some(warmed_model);
        state.last_accessed = Instant::now();
    }

    let threshold = storage::db::calculate_dynamic_threshold(&conn).map_err(|e| e.to_string())?;

    let chunk_for_generation = chunk.clone();
    let selected_model = {
        let state = ai_state.lock().await;
        state.selected_model.clone()
    };
    let selected_model_for_generation = selected_model.clone();
    let generation_task = tokio::spawn(async move {
        generate_candidates_with_gemma4(&chunk_for_generation, threshold, selected_model_for_generation.as_deref()).await
    });

    let generation_result = timeout(Duration::from_secs(15), generation_task).await;

    let generated_cards = match generation_result {
        Ok(Ok(Ok(cards))) => cards,
        Ok(Ok(Err(model_error))) => {
            {
                let mut state = ai_state.lock().await;
                state.generator_model = None;
            }
            conn.execute(
                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![
                    "AI_MODEL_ERROR",
                    note_id,
                    serde_json::json!({ "reason": model_error, "model": selected_model.clone().unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                ],
            )
            .map_err(|e| e.to_string())?;
            app.emit(
                "kura:engine-status",
                EngineStatusPayload {
                    state: "MODEL_UNAVAILABLE",
                },
            )
            .map_err(|e| e.to_string())?;
            return Ok("MODEL_ERROR".to_string());
        }
        Ok(Err(join_error)) if join_error.is_panic() => {
            {
                let mut state = ai_state.lock().await;
                state.generator_model = None;
            }
            conn.execute(
                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![
                    "AI_PANIC",
                    note_id,
                    serde_json::json!({ "stage": "gemma_generation", "model": selected_model.clone().unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                ],
            )
            .map_err(|e| e.to_string())?;
            app.emit(
                "kura:engine-status",
                EngineStatusPayload {
                    state: "MODEL_UNAVAILABLE",
                },
            )
            .map_err(|e| e.to_string())?;
            return Ok("PANIC".to_string());
        }
        Ok(Err(join_error)) => {
            {
                let mut state = ai_state.lock().await;
                state.generator_model = None;
            }
            conn.execute(
                "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
                 VALUES (?1, ?2, ?3, datetime('now'))",
                params![
                    "AI_MODEL_ERROR",
                    note_id,
                    serde_json::json!({ "reason": join_error.to_string(), "model": selected_model.clone().unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()) }).to_string(),
                ],
            )
            .map_err(|e| e.to_string())?;
            app.emit(
                "kura:engine-status",
                EngineStatusPayload {
                    state: "MODEL_UNAVAILABLE",
                },
            )
            .map_err(|e| e.to_string())?;
            return Ok("MODEL_ERROR".to_string());
        }
        Err(_timeout) => {
        conn.execute(
            "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
             VALUES (?1, ?2, ?3, datetime('now'))",
            params![
                "AI_TIMEOUT",
                note_id,
                serde_json::json!({ "timeout_secs": 15 }).to_string(),
            ],
        )
        .map_err(|e| e.to_string())?;

        app.emit(
            "kura:engine-status",
            EngineStatusPayload { state: "RATE_LIMITED" },
        )
        .map_err(|e| e.to_string())?;
        return Ok("TIMEOUT".to_string());
        }
    };

    {
        let mut state = ai_state.lock().await;
        state.last_accessed = Instant::now();
        state.last_generation_time = Some(Instant::now());
    }

    app.emit(
        "kura:engine-status",
        EngineStatusPayload { state: "IDLE" },
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO telemetry_events (event_type, note_id, metadata_json, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))",
        params![
            "AI_PIPELINE_READY",
            note_id,
            serde_json::json!({
                "dynamic_threshold": threshold,
                "candidate_count": generated_cards.len(),
                "model": selected_model.unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string()),
                "candidates": generated_cards,
            })
            .to_string(),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("GENERATED:{}:{threshold:.2}", generated_cards.len()))
}
