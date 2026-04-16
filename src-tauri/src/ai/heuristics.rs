#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PreRouterResult {
    Pass,
    SkipMathDensity,
    SkipCodeBlock,
    SkipInsufficientLength,
    SkipLowEntropy,
}

pub fn evaluate_chunk(chunk: &str) -> PreRouterResult {
    let trimmed = chunk.trim();
    if trimmed.len() < 150 {
        return PreRouterResult::SkipInsufficientLength;
    }

    let math_chars = trimmed.matches('$').count() + trimmed.matches('=').count();
    let math_density = math_chars as f32 / trimmed.len() as f32;
    if math_density > 0.05 {
        return PreRouterResult::SkipMathDensity;
    }

    if trimmed.contains("```") {
        return PreRouterResult::SkipCodeBlock;
    }

    let alnum_count = trimmed.chars().filter(|c| c.is_alphanumeric()).count();
    let unique_count = trimmed
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<std::collections::HashSet<_>>()
        .len();
    if alnum_count > 0 {
        let unique_ratio = unique_count as f32 / alnum_count as f32;
        if unique_ratio < 0.10 {
            return PreRouterResult::SkipLowEntropy;
        }
    }

    PreRouterResult::Pass
}
