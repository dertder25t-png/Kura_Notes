use crate::ai::generator::GeneratedCard;
use serde::{Deserialize, Serialize};
use std::time::Instant;

pub const DEFAULT_GEMMA_MODEL: &str = "gemma3:latest";

#[derive(Deserialize)]
struct OllamaTagsResponse {
    #[serde(default)]
    models: Vec<OllamaModel>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: Option<String>,
    model: Option<String>,
    size: Option<u64>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalGemmaModel {
    pub name: String,
    pub size_bytes: Option<u64>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelBenchmarkResult {
    pub model: String,
    pub latency_ms: u64,
    pub score: f32,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
    format: Option<String>,
    keep_alive: Option<String>,
    options: OllamaOptions,
}

#[derive(Serialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: Option<i32>,
}

#[derive(Deserialize)]
struct OllamaGenerateResponse {
    response: Option<String>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct GemmaCardEnvelope {
    #[serde(default)]
    cards: Vec<GemmaCard>,
}

#[derive(Deserialize)]
struct GemmaCard {
    front: String,
    back: String,
    confidence: Option<f32>,
}

fn local_ollama_base_url() -> String {
    std::env::var("KURA_OLLAMA_URL").unwrap_or_else(|_| "http://127.0.0.1:11434".to_string())
}

fn preferred_model_name(selected_model: Option<&str>) -> Result<Option<String>, String> {
    if let Some(model) = selected_model.map(str::trim).filter(|model| !model.is_empty()) {
        if is_gemma_model_name(model) {
            return Ok(Some(model.to_string()));
        }

        return Err(format!(
            "INVALID_MODEL: '{model}' is not a Gemma model. Choose a model whose name starts with 'gemma'."
        ));
    }

    if let Ok(configured) = std::env::var("KURA_GEMMA_MODEL") {
        if !configured.trim().is_empty() {
            if !is_gemma_model_name(&configured) {
                return Err(format!(
                    "INVALID_MODEL: '{configured}' is not a Gemma model. Choose a model whose name starts with 'gemma'."
                ));
            }

            return Ok(Some(configured));
        }
    }

    if let Ok(configured) = std::env::var("KURA_GEMMA4_MODEL") {
        if !configured.trim().is_empty() {
            if !is_gemma_model_name(&configured) {
                return Err(format!(
                    "INVALID_MODEL: '{configured}' is not a Gemma model. Choose a model whose name starts with 'gemma'."
                ));
            }

            return Ok(Some(configured));
        }
    }

    Ok(Some(DEFAULT_GEMMA_MODEL.to_string()))
}

fn is_gemma_model_name(model: &str) -> bool {
    model.to_ascii_lowercase().starts_with("gemma")
}

fn model_family(model: &str) -> String {
    model.split(':').next().unwrap_or(model).to_ascii_lowercase()
}

fn ensure_local_ollama_url(base_url: &str) -> Result<(), String> {
    let normalized = base_url.to_ascii_lowercase();
    if normalized.starts_with("http://127.0.0.1") || normalized.starts_with("http://localhost") {
        return Ok(());
    }

    Err(format!(
        "NON_LOCAL_OLLAMA_URL: '{base_url}' is not local. Use http://127.0.0.1:11434"
    ))
}

async fn resolve_local_model_name(base_url: &str, selected_model: Option<&str>) -> Result<String, String> {
    let preferred_model = preferred_model_name(selected_model)?;
    let preferred_model_label = preferred_model
        .clone()
        .unwrap_or_else(|| DEFAULT_GEMMA_MODEL.to_string());
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{base_url}/api/tags"))
        .send()
        .await
        .map_err(|e| format!("OLLAMA_UNREACHABLE:{e}"))?;

    if !response.status().is_success() {
        return Err(format!("OLLAMA_TAGS_FAILED:{}", response.status()));
    }

    let tags: OllamaTagsResponse = response
        .json()
        .await
        .map_err(|e| format!("OLLAMA_TAGS_PARSE_FAILED:{e}"))?;

    let mut local_models: Vec<String> = tags
        .models
        .into_iter()
        .filter_map(|model| model.name.or(model.model))
        .collect();

    local_models.sort();
    local_models.dedup();

    if let Some(preferred_model) = preferred_model {
        if local_models.iter().any(|model| model == &preferred_model) {
            return Ok(preferred_model);
        }

        let family = model_family(&preferred_model);
        if let Some(match_by_family) = local_models.iter().find(|model| model.to_ascii_lowercase().starts_with(&family)) {
            return Ok(match_by_family.clone());
        }
    }

    if let Some(gemma_variant) = local_models.iter().find(|model| is_gemma_model_name(model)) {
        return Ok(gemma_variant.clone());
    }

    Err(format!(
        "GEMMA_NOT_AVAILABLE: Missing local Gemma model. Run `ollama pull {}` or pick a local Gemma model in settings.",
        preferred_model_label
    ))
}

fn map_models(tags: OllamaTagsResponse) -> Vec<LocalGemmaModel> {
    let mut local_models: Vec<LocalGemmaModel> = tags
        .models
        .into_iter()
        .filter_map(|model| {
            let name = model.name.or(model.model)?;
            if !is_gemma_model_name(&name) {
                return None;
            }

            Some(LocalGemmaModel {
                name,
                size_bytes: model.size,
            })
        })
        .collect();

    local_models.sort_by(|left, right| left.name.cmp(&right.name));
    local_models.dedup_by(|left, right| left.name == right.name);
    local_models
}

pub async fn discover_local_gemma_models() -> Result<Vec<LocalGemmaModel>, String> {
    let base_url = local_ollama_base_url();
    ensure_local_ollama_url(&base_url)?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{base_url}/api/tags"))
        .send()
        .await
        .map_err(|e| format!("OLLAMA_UNREACHABLE:{e}"))?;

    if !response.status().is_success() {
        return Err(format!("OLLAMA_TAGS_FAILED:{}", response.status()));
    }

    let tags: OllamaTagsResponse = response
        .json()
        .await
        .map_err(|e| format!("OLLAMA_TAGS_PARSE_FAILED:{e}"))?;

    Ok(map_models(tags))
}

fn cards_cap_from_threshold(threshold: f32) -> usize {
    if threshold >= 0.90 {
        1
    } else if threshold >= 0.84 {
        2
    } else {
        3
    }
}

fn normalize_json_payload(raw: &str) -> &str {
    let trimmed = raw.trim();
    if let Some(stripped) = trimmed.strip_prefix("```") {
        return stripped
            .trim()
            .trim_start_matches("json")
            .trim()
            .trim_end_matches("```")
            .trim();
    }
    trimmed
}

async fn probe_local_gemma_model(
    base_url: &str,
    model_name: &str,
    keep_alive: &str,
) -> Result<u64, String> {
    let payload = OllamaGenerateRequest {
        model: model_name.to_string(),
        prompt: "Respond with JSON: {\"ok\":true}".to_string(),
        stream: false,
        format: Some("json".to_string()),
        keep_alive: Some(keep_alive.to_string()),
        options: OllamaOptions {
            temperature: 0.0,
            num_predict: Some(8),
        },
    };

    let client = reqwest::Client::new();
    let started = Instant::now();
    let response = client
        .post(format!("{base_url}/api/generate"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("OLLAMA_PREWARM_FAILED:{e}"))?;

    if !response.status().is_success() {
        return Err(format!("OLLAMA_PREWARM_STATUS:{}", response.status()));
    }

    let _ = response
        .text()
        .await
        .map_err(|e| format!("OLLAMA_PREWARM_PARSE_FAILED:{e}"))?;

    Ok(started.elapsed().as_millis() as u64)
}

pub async fn prewarm_local_gemma4(selected_model: Option<&str>) -> Result<String, String> {
    let base_url = local_ollama_base_url();
    ensure_local_ollama_url(&base_url)?;
    let model_name = resolve_local_model_name(&base_url, selected_model).await?;
    let _ = probe_local_gemma_model(&base_url, &model_name, "5m").await?;

    Ok(model_name)
}

pub async fn keepalive_local_gemma4(selected_model: Option<&str>) -> Result<(), String> {
    prewarm_local_gemma4(selected_model).await.map(|_| ())
}

pub async fn unload_local_gemma4(selected_model: Option<&str>) -> Result<(), String> {
    let base_url = local_ollama_base_url();
    ensure_local_ollama_url(&base_url)?;
    let model_name = resolve_local_model_name(&base_url, selected_model).await?;
    let _ = probe_local_gemma_model(&base_url, &model_name, "0s").await?;

    Ok(())
}

pub async fn generate_candidates_with_gemma4(
    chunk: &str,
    threshold: f32,
    selected_model: Option<&str>,
) -> Result<Vec<GeneratedCard>, String> {
    let base_url = local_ollama_base_url();
    ensure_local_ollama_url(&base_url)?;
    let model_name = resolve_local_model_name(&base_url, selected_model).await?;
    let max_cards = cards_cap_from_threshold(threshold);

    let prompt = format!(
        "You are generating flashcards from study notes. Return only strict JSON with this schema: {{\"cards\":[{{\"front\":string,\"back\":string,\"confidence\":number}}]}}.\nRules:\n1) Output at most {max_cards} cards.\n2) Keep front concise and testable.\n3) Keep back factual and short.\n4) confidence must be between 0.0 and 1.0.\n5) No markdown, no explanations, JSON only.\n\nStudy chunk:\n{chunk}"
    );

    let payload = OllamaGenerateRequest {
        model: model_name.clone(),
        prompt,
        stream: false,
        format: Some("json".to_string()),
        keep_alive: Some("5m".to_string()),
        options: OllamaOptions {
            temperature: 0.2,
            num_predict: None,
        },
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{base_url}/api/generate"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("OLLAMA_GENERATE_FAILED:{e}"))?;

    if !response.status().is_success() {
        return Err(format!("OLLAMA_GENERATE_STATUS:{}", response.status()));
    }

    let model_response: OllamaGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("OLLAMA_GENERATE_PARSE_FAILED:{e}"))?;

    if let Some(error) = model_response.error {
        return Err(format!("OLLAMA_MODEL_ERROR:{error}"));
    }

    let raw_json = model_response
        .response
        .ok_or_else(|| "OLLAMA_EMPTY_RESPONSE".to_string())?;

    let normalized = normalize_json_payload(&raw_json);
    let parsed: GemmaCardEnvelope = serde_json::from_str(normalized)
        .map_err(|e| format!("GEMMA_JSON_PARSE_FAILED:{e}"))?;

    let cards = parsed
        .cards
        .into_iter()
        .filter_map(|card| {
            let front = card.front.trim().to_string();
            let back = card.back.trim().to_string();
            if front.is_empty() || back.is_empty() {
                return None;
            }

            Some(GeneratedCard {
                front,
                back,
                confidence: card.confidence.unwrap_or(0.86).clamp(0.0, 1.0),
            })
        })
        .take(max_cards)
        .collect();

    Ok(cards)
}

pub async fn benchmark_local_gemma_models(
    selected_model: Option<&str>,
) -> Result<Vec<ModelBenchmarkResult>, String> {
    let base_url = local_ollama_base_url();
    ensure_local_ollama_url(&base_url)?;

    let models = discover_local_gemma_models().await?;
    if models.is_empty() {
        return Err("GEMMA_NOT_AVAILABLE: No local Gemma models were found.".to_string());
    }

    let preferred = preferred_model_name(selected_model)?;
    let mut ordered_models = models;

    if let Some(preferred_model) = preferred {
        if let Some(index) = ordered_models.iter().position(|model| model.name == preferred_model) {
            let model = ordered_models.remove(index);
            ordered_models.insert(0, model);
        }
    }

    let mut results = Vec::new();
    for model in ordered_models.into_iter().take(5) {
        let started = Instant::now();
        let benchmark = probe_local_gemma_model(&base_url, &model.name, "0s").await;
        let latency_ms = started.elapsed().as_millis() as u64;

        let result = match benchmark {
            Ok(_) => ModelBenchmarkResult {
                score: score_model(latency_ms, model.size_bytes),
                model: model.name,
                latency_ms,
                success: true,
                error: None,
            },
            Err(error) => ModelBenchmarkResult {
                score: 0.0,
                model: model.name,
                latency_ms,
                success: false,
                error: Some(error),
            },
        };

        results.push(result);
    }

    results.sort_by(|left, right| right.score.partial_cmp(&left.score).unwrap_or(std::cmp::Ordering::Equal));
    Ok(results)
}

fn score_model(latency_ms: u64, size_bytes: Option<u64>) -> f32 {
    let latency_score = if latency_ms == 0 { 1_000.0 } else { 120_000.0 / latency_ms as f32 };
    let size_score = size_bytes.map(|size| 8_000_000_000.0 / size as f32).unwrap_or(1.0);
    latency_score + size_score
}
