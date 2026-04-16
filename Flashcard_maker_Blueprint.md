**Philosophy: The Thermodynamics of Thought (Aggressive Efficiency)**

Your proposed upgrades represent the exact pivot from a "cool prototype" to a production-grade, enterprise-ready application. You have correctly identified that local AI is not a software problem; it is a *thermodynamic* problem. Every floating-point operation drains a battery, heats a chassis, and risks interrupting the user’s primary objective: capturing knowledge. 

By layering a Zero-ML heuristic gate, hardware-aware scheduling, and warm-pooling the models, we transform the AI from a brute-force script into a surgical, background daemon. Furthermore, moving from static thresholds to a dynamic, telemetry-driven feedback loop ensures the system continuously molds itself to the specific user's tolerance for noise.

Here is the blueprint for integrating this ultra-efficient, five-pillar upgrade into the Dual-Engine Architecture.

---

### Table of Contents
1. Phase-by-Phase Roadmap
2. File-by-File Change Map
3. Implementation Checklist

---

### Phase-by-Phase Roadmap

#### Phase 1: The Heuristic Vanguard & Resource Governor (Zero-ML & Sysinfo)
Before loading a single tensor into RAM, we implement a highly optimized Rust pipeline to evaluate the text chunk using pure string heuristics (math density, markdown depth, character delta). Simultaneously, we query the OS using the `sysinfo` crate to check battery state, thermal throttling, and background CPU utilization. If the environment is hostile or the text is garbage, the pipeline terminates in under 2 milliseconds.

#### Phase 2: The Stateful ML Pool & Generation Budgets (Tokio Mutex)
We move away from loading the Gemma models on a per-call basis. We will wrap the Candle models in an `Arc<Mutex<Option<Model>>>` governed by a Tokio async task. The model loads on the first valid trigger and stays "warm" in RAM. A background watcher sweeps every 60 seconds; if the model hasn't been queried in 5 minutes, it is gracefully dropped from memory. We also introduce a global rate-limit struct to strictly enforce a maximum of 1 generation batch per 60 seconds.

#### Phase 3: The Telemetry Auto-Tuner & Resource UX (React/SQLite)
We update the Rust backend to calculate a dynamic confidence threshold by querying the recent Undo-to-Generation ratio from the SQLite telemetry table. On the frontend, we introduce Progressive Disclosure for the system state: a 4px-aligned visual indicator in the editor that quietly informs the user if the AI is paused due to "Battery Saver" or "High CPU" conditions.

---

### File-by-File Change Map

#### 1. `src-tauri/Cargo.toml`
**Purpose:** Add system monitoring and async runtime capabilities.
**Logic:** `sysinfo` provides cross-platform access to CPU/Battery states. `tokio` handles the background memory-sweeping daemon and timeout enforcement.

```toml
[dependencies]
# Existing dependencies...
candle-core = "0.4.1"
rusqlite = "0.29.0"

# New Efficiency Dependencies
sysinfo = "0.30.5"
tokio = { version = "1", features = ["full"] }
chrono = "0.4"
```

#### 2. `src-tauri/src/ai/heuristics.rs` (NEW)
**Purpose:** The Zero-ML pre-router.
**Logic:** A pure Rust string analysis module. It counts specific characters and evaluates burst rates. If a student is dumping raw math equations (`$`) or deeply nested code blocks, we skip ML evaluation entirely.

```rust
pub enum PreRouterResult {
    Pass,
    SkipMathDensity,
    SkipCodeBlock,
    SkipInsufficientLength,
}

pub fn evaluate_chunk(chunk: &str) -> PreRouterResult {
    if chunk.len() < 150 {
        return PreRouterResult::SkipInsufficientLength;
    }

    // Heuristic 1: Math Density (If > 5% of chars are math symbols, it's likely formulas)
    let math_chars = chunk.matches('$').count() + chunk.matches('=').count();
    if (math_chars as f32 / chunk.len() as f32) > 0.05 {
        return PreRouterResult::SkipMathDensity;
    }

    // Heuristic 2: Code Blocks
    if chunk.contains("```") {
        return PreRouterResult::SkipCodeBlock;
    }

    PreRouterResult::Pass
}
```

#### 3. `src-tauri/src/ai/state.rs` (NEW)
**Purpose:** Manage the warm-pool, resource governance, and generation budgets.
**Logic:** Initializes the system info struct, manages the loaded model, checks battery, and enforces the 60-second budget. 

```rust
use std::sync::{Arc, Mutex};
use sysinfo::{System, SystemExt, CpuExt};
use std::time::{Instant, Duration};

pub struct AiState {
    pub generator_model: Option<String>, // Placeholder for actual Candle Model
    pub last_accessed: Instant,
    pub last_generation_time: Option<Instant>,
    pub sys: System,
}

impl AiState {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            generator_model: None,
            last_accessed: Instant::now(),
            last_generation_time: None,
            sys,
        }
    }

    pub fn is_system_healthy(&mut self) -> Result<(), &'static str> {
        self.sys.refresh_cpu();
        let cpu_usage = self.sys.global_cpu_info().cpu_usage();
        
        if cpu_usage > 75.0 {
            return Err("CPU_THROTTLED");
        }
        
        // (Assume battery check logic here via sysinfo/battery crates)
        
        // Budget Check: Enforce max 1 gen per 60 seconds
        if let Some(last_gen) = self.last_generation_time {
            if last_gen.elapsed() < Duration::from_secs(60) {
                return Err("RATE_LIMITED");
            }
        }

        Ok(())
    }
}
```

#### 4. `src-tauri/src/commands/ai_commands.rs` (UPDATED)
**Purpose:** Tie the heuristics, dynamic thresholds, and hardware checks together.
**Logic:** Evaluates the pre-router. Checks system health. Computes the dynamic threshold via SQLite. Loads/Uses the warm model. Records the timestamp.

```rust
use tauri::State;
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use crate::ai::heuristics::{evaluate_chunk, PreRouterResult};
use crate::ai::state::AiState;

#[tauri::command]
pub async fn process_idle_chunk(
    chunk: String, 
    note_id: String, 
    db_state: State<'_, Arc<Mutex<Connection>>>,
    ai_state: State<'_, Arc<Mutex<AiState>>>
) -> Result<String, String> {
    
    // 1. Zero-ML Pre-Router (0.1ms)
    match evaluate_chunk(&chunk) {
        PreRouterResult::Pass => {},
        _ => return Ok("SKIPPED_HEURISTICS".to_string()),
    }

    // 2. Hardware & Budget Governor (1ms)
    let mut state = ai_state.lock().unwrap();
    if let Err(reason) = state.is_system_healthy() {
        return Ok(reason.to_string());
    }

    // 3. Dynamic Threshold Calculation (SQLite)
    let db = db_state.lock().unwrap();
    let mut dynamic_threshold = 0.85; // Base fallback
    if let Ok(mut stmt) = db.prepare("SELECT 
        CAST(SUM(CASE WHEN event_type = 'UNDO_TRIGGERED' THEN 1 ELSE 0 END) AS FLOAT) / 
        COUNT(*) FROM telemetry_events WHERE event_type IN ('CARDS_GENERATED', 'UNDO_TRIGGERED')") {
        
        if let Ok(undo_rate) = stmt.query_row([], |row| row.get::<_, f64>(0)) {
            // If user undoes > 15% of the time, raise the strictness.
            if undo_rate > 0.15 { dynamic_threshold = 0.92; }
            // If user rarely undoes (< 5%), lower the strictness to generate more cards.
            else if undo_rate < 0.05 { dynamic_threshold = 0.78; }
        }
    }

    // 4. ML Pipeline (Nano-Router -> Warm Generator)
    // -> Ensure generation is wrapped in tokio::time::timeout(Duration::from_secs(15), ...)
    
    // Update State
    state.last_accessed = std::time::Instant::now();
    state.last_generation_time = Some(std::time::Instant::now());

    Ok("GENERATED".to_string())
}
```

#### 5. `src/components/ui/EngineStatus.tsx` (NEW)
**Purpose:** Progressively disclose the AI's internal state to the user based on the new governance rules.
**Visual Polish:** Placed in the bottom-right corner of the `NoteEditor.tsx`, aligned to the 4px grid (`right-4 bottom-4`). It uses a smooth 150ms `opacity` transition. If the engine is paused due to CPU load, it shows an amber warning icon.

```tsx
import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export const EngineStatus: React.FC = () => {
  const [engineState, setEngineState] = useState<'IDLE' | 'WARMING' | 'THROTTLED' | 'RATE_LIMITED'>('IDLE');

  useEffect(() => {
    // Listen for backend IPC events broadcasted during the sysinfo checks
    const unlisten = listen('kura:engine-status', (event: any) => {
      setEngineState(event.payload.state);
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  if (engineState === 'IDLE') return null;

  return (
    <div 
      className="absolute bottom-4 right-4 flex items-center gap-2 px-2 h-6 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{ fontFamily: 'Geist, sans-serif' }}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${
        engineState === 'WARMING' ? 'bg-purple-500 animate-pulse' : 
        engineState === 'THROTTLED' ? 'bg-amber-500' : 'bg-neutral-400'
      }`} />
      <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
        {engineState === 'THROTTLED' ? 'Paused: High CPU' : 
         engineState === 'WARMING' ? 'Engine Booting...' : 'Cooldown Active'}
      </span>
    </div>
  );
};
```

---

### Implementation Checklist

**Core Architecture (Rust/Tauri)**
- [ ] Add `sysinfo` and `tokio` to `Cargo.toml`.
- [ ] Create the `AiState` struct wrapped in `Arc<Mutex<>>` and register it using `tauri::Builder::default().manage(...)`.
- [ ] Write a `tokio::spawn` loop in your `main.rs` setup phase that wakes up every 60 seconds, locks `AiState`, checks `last_accessed`, and explicitly drops the Candle model variable if the delta exceeds 300 seconds (5 minutes).
- [ ] Implement the `evaluate_chunk` zero-ML heuristic in `heuristics.rs`. Fine-tune the `matches` logic for your specific note-taking markdown flavor (e.g., ignoring LaTeX code blocks entirely).
- [ ] Wrap the actual LLM generation call in `tokio::time::timeout` with a strict 15-second hard cap. If it panics/times out, catch the error, return a `TIMEOUT` string, and log it to telemetry.

**Telemetry & Data Flow**
- [ ] Update the `generate_weekly_refresh` SQLite query to include the dynamic threshold math. Ensure you use an exponential moving average (EMA) or limit the query to the last 7 days of telemetry (`updated_at >= date('now', '-7 days')`) so ancient data doesn't skew current generation thresholds.
- [ ] Emit a Tauri window event (`app_handle.emit_all("kura:engine-status", ...)`) whenever the `is_system_healthy()` check fails, so the React frontend can update the UI.

**UI/UX (React)**
- [ ] Implement `EngineStatus.tsx` and place it over the `NoteEditor.tsx` textarea.
- [ ] Ensure that when `engineState === 'THROTTLED'`, the manual `::` flashcard command palette is still fully functional, as it acts as the zero-latency bypass for power users who know exactly what they want to capture despite high background CPU loads.

could