use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedCard {
    pub front: String,
    pub back: String,
    pub confidence: f32,
}
