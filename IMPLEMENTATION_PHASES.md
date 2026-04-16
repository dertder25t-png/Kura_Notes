# Kura V1 Implementation Phases

This file tracks the V1 execution plan for all developers.

## Phase 0 - Privacy Guard (Urgent)
- Add notes and local database artifacts to git ignore rules.
- Ensure personal note content is local-only.
- If notes were already committed, run:
  - `git rm -r --cached notes`
  - `git commit -m "stop tracking local notes"`

Status:
- [x] `.gitignore` updated with `notes/`, `.env.local`, and db journal artifacts.
- [ ] Repository cleanup run in git history by maintainers.

## Phase 1 - Telemetry Foundation
- Add telemetry table and indexes.
- Add command to log telemetry events.
- Add threshold query helper for adaptive generation strictness.

Status:
- [x] `telemetry_events` table created in schema and migration.
- [x] `log_telemetry_event` Tauri command added.
- [x] `calculate_dynamic_threshold` backend helper added.

## Phase 2 - Zero-ML Heuristic Gateway
- Add backend pre-router to skip low-quality chunks before model work.
- Reasons tracked in telemetry (`AI_SKIPPED_HEURISTICS`).

Status:
- [x] `ai/heuristics.rs` implemented and wired through `process_idle_chunk`.

## Phase 3 - Resource Governor and Warm State
- Add AI runtime state for CPU checks and generation budget.
- Enforce one generation batch per 60 seconds.
- Add idle sweeper to unload warm model after 5 minutes.

Status:
- [x] `AiState` added and managed globally.
- [x] Rate limiting and CPU checks added.
- [x] Background sweeper task added.
- [x] Battery saver gating added.

## Phase 4 - Dynamic Threshold Integration
- Compute strictness from 7-day undo-to-generation ratio.
- Feed threshold into generation pipeline.

Status:
- [x] Threshold query implemented.
- [x] `process_idle_chunk` now computes and returns active threshold.
- [x] Timeout-guarded generation stage added (15s hard cap).
- [x] Functional local generator path returns candidate cards for the chunk.

## Phase 5 - UX Disclosure
- Show engine status in the editor during throttling/cooldown.
- Keep manual `::` flow usable regardless of auto engine constraints.

Status:
- [x] `EngineStatus` UI component added and mounted.
- [x] Backend emits `kura:engine-status` when blocked.
- [x] Backend now emits `WARMING` and `IDLE` states.
- [x] Battery saver status is emitted and shown in the editor.

## Phase 6 - Quality Validation
- Automated quality checks for generated flashcard prompts and answers.
- Batch-card extraction coherence checks.

Status:
- [x] Vitest-based quality suite added and runnable via `npm run test:quality`.
- [x] Flashcard templates revised to remove low-quality placeholders.

## Current V1 Scope Notes
- This implementation lays the production foundation and command contracts.
- Idle editor text now actively triggers backend pre-routing via `process_idle_chunk`.
- Model loading/inference is still stubbed; timeout + warm-state behavior is now active.
- Manual flashcard creation remains fully operational and unaffected.
