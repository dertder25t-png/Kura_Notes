use crate::storage::db;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

pub const AI_SETTINGS_SELECTED_MODEL_KEY: &str = "ai.selected_model";
pub const AI_SETTINGS_OLLAMA_URL_KEY: &str = "ai.ollama_url";
pub const AI_SETTINGS_ONBOARDING_COMPLETE_KEY: &str = "ai.onboarding_complete";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub selected_model: Option<String>,
    pub ollama_url: String,
    pub onboarding_complete: bool,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            selected_model: None,
            ollama_url: "http://127.0.0.1:11434".to_string(),
            onboarding_complete: false,
        }
    }
}

pub fn load_ai_settings(app_handle: &tauri::AppHandle) -> anyhow::Result<AiSettings> {
    let conn = db::get_conn(app_handle)?;
    let mut settings = AiSettings::default();

    if let Some(value) = read_setting(&conn, AI_SETTINGS_SELECTED_MODEL_KEY)? {
        if !value.trim().is_empty() {
            settings.selected_model = Some(value);
        }
    }

    if let Some(value) = read_setting(&conn, AI_SETTINGS_OLLAMA_URL_KEY)? {
        if !value.trim().is_empty() {
            settings.ollama_url = value;
        }
    }

    if let Some(value) = read_setting(&conn, AI_SETTINGS_ONBOARDING_COMPLETE_KEY)? {
        settings.onboarding_complete = value == "1" || value.eq_ignore_ascii_case("true");
    }

    Ok(settings)
}

pub fn save_ai_settings(app_handle: &tauri::AppHandle, settings: &AiSettings) -> anyhow::Result<()> {
    let conn = db::get_conn(app_handle)?;
    write_setting(&conn, AI_SETTINGS_SELECTED_MODEL_KEY, settings.selected_model.as_deref().unwrap_or(""))?;
    write_setting(&conn, AI_SETTINGS_OLLAMA_URL_KEY, &settings.ollama_url)?;
    write_setting(
        &conn,
        AI_SETTINGS_ONBOARDING_COMPLETE_KEY,
        if settings.onboarding_complete { "1" } else { "0" },
    )?;
    Ok(())
}

fn read_setting(conn: &rusqlite::Connection, key: &str) -> anyhow::Result<Option<String>> {
    let value = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()?;

    Ok(value)
}

fn write_setting(conn: &rusqlite::Connection, key: &str, value: &str) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at)
         VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value],
    )?;
    Ok(())
}