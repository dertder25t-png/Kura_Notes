# SCHOLR — Project Outline & Build Reference

> Tauri 2 · React · TypeScript · Rust · LiteRT · Gemma 4 · SQLite  
> Desktop-first (Windows → macOS → Linux) · Mobile = read-only companion (future)

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [SQLite Schema](#2-sqlite-schema)
3. [Tauri Config](#3-tauri-config)
4. [Rust Backend — File Stubs](#4-rust-backend--file-stubs)
5. [React Frontend — File Stubs](#5-react-frontend--file-stubs)
6. [AI Prompts Reference](#6-ai-prompts-reference)
7. [Feature Flags](#7-feature-flags)
8. [Build & Run](#8-build--run)
9. [Build Order / Milestones](#9-build-order--milestones)
10. [Key Libraries](#10-key-libraries)

---

## 1. Folder Structure

```
scholr/
├── src/                              # React + TypeScript frontend
│   ├── main.tsx                      # Tauri entry point
│   ├── App.tsx                       # Root layout, routing
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Class / deck / date navigator
│   │   │   └── TitleBar.tsx          # Custom Tauri title bar
│   │   │
│   │   ├── notes/
│   │   │   ├── NoteEditor.tsx        # Raw Mode — plain markdown editor
│   │   │   ├── StudyPanel.tsx        # Study Mode — AI-synthesized read-only doc
│   │   │   ├── DualPane.tsx          # Splits NoteEditor + StudyPanel side-by-side
│   │   │   └── HighlightLayer.tsx    # Underline heatmap over NoteEditor text
│   │   │
│   │   ├── audio/
│   │   │   ├── VoiceBar.tsx          # Record button, VAD indicator, live status
│   │   │   └── TranscriptFeed.tsx    # Scrolling raw transcript (background)
│   │   │
│   │   ├── flashcards/
│   │   │   ├── FlashcardBuilder.tsx  # Right-pane: manual + AI card creation
│   │   │   ├── CardList.tsx          # Deck card list with confidence dots
│   │   │   ├── CardReview.tsx        # Flip card — Easy / Hard / Forgot buttons
│   │   │   ├── DeckSelector.tsx      # Per-test and combined-deck picker
│   │   │   └── AICardPreview.tsx     # Accept / Edit / Skip for AI-gen cards
│   │   │
│   │   ├── scheduler/
│   │   │   ├── ExamCalendar.tsx      # Add exam dates linked to decks
│   │   │   ├── StudyPlan.tsx         # Daily quota + on-track indicator
│   │   │   └── HeatmapSidebar.tsx    # Mini-map of note mastery
│   │   │
│   │   └── ai/
│   │       ├── SynthesizeButton.tsx  # Triggers Load-Infer-Purge for Study Mode
│   │       ├── GenerateCardsButton.tsx
│   │       └── AIStatusBadge.tsx     # "Loading model…" / "Done" / "Idle"
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts            # 3s typing pause → triggers Tauri command
│   │   ├── useAudio.ts               # VAD state, recording toggle
│   │   ├── useFlashcards.ts          # CRUD operations via invoke
│   │   ├── useScheduler.ts           # Daily quota + SM-2 next-review logic
│   │   └── useAIStatus.ts            # Model lifecycle state (idle/loading/running)
│   │
│   ├── store/
│   │   ├── noteStore.ts              # Zustand — current note, raw text, ranges
│   │   ├── deckStore.ts              # Zustand — cards, decks, tests
│   │   └── schedulerStore.ts         # Zustand — exam dates, quotas, review queue
│   │
│   ├── types/
│   │   └── index.ts                  # All shared TypeScript types
│   │
│   └── styles/
│       └── global.css                # Minimal resets + CSS variables
│
├── src-tauri/
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri app config
│   │
│   ├── src/
│   │   ├── main.rs                   # Tauri builder + command registration
│   │   ├── lib.rs                    # Re-exports all modules
│   │   │
│   │   ├── audio/
│   │   │   ├── mod.rs                # AudioBackend trait definition
│   │   │   ├── vad.rs                # Voice Activity Detection (energy threshold)
│   │   │   └── capture.rs            # cpal cross-platform mic capture
│   │   │
│   │   ├── ai/
│   │   │   ├── mod.rs                # AI module entry
│   │   │   ├── lifecycle.rs          # Load-Infer-Purge state machine
│   │   │   ├── litert.rs             # LiteRT model loading + inference
│   │   │   ├── transcribe.rs         # Audio chunk → text via Gemma 4 audio
│   │   │   ├── synthesize.rs         # Notes + transcript → Study Mode markdown
│   │   │   ├── flashcard_gen.rs      # Targeted card generation w/ dedup
│   │   │   └── prompts.rs            # All LLM prompt strings in one place
│   │   │
│   │   ├── storage/
│   │   │   ├── mod.rs
│   │   │   ├── db.rs                 # SQLite init, migrations, connection pool
│   │   │   ├── notes.rs              # Note CRUD + source range storage
│   │   │   ├── cards.rs              # Flashcard CRUD + SM-2 fields
│   │   │   ├── decks.rs              # Deck + test + class management
│   │   │   └── scheduler.rs          # Exam dates, review queue, quotas
│   │   │
│   │   └── commands/
│   │       ├── mod.rs                # All #[tauri::command] functions
│   │       ├── note_commands.rs      # save_note, load_note, list_notes
│   │       ├── audio_commands.rs     # start_recording, stop_recording
│   │       ├── ai_commands.rs        # synthesize_note, generate_cards
│   │       ├── card_commands.rs      # create_card, review_card, get_deck
│   │       └── scheduler_commands.rs # add_exam, get_daily_plan, get_queue
│   │
│   └── models/                       # LiteRT .tflite model files (gitignored)
│       ├── gemma4-e2b-q8.tflite      # ~1.2 GB — battery saver
│       └── gemma4-e4b-q8.tflite      # ~2.5 GB — full quality
│
├── notes/                            # User's actual notes (on disk, user-owned)
│   └── {class_name}/
│       └── YYYY-MM-DD.md
│
├── scholr.db                         # SQLite database (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 2. SQLite Schema

```sql
-- Run on first launch via db.rs migration

CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#5DCAA5',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- e.g. "Midterm 1", "Final"
  exam_date   TEXT,                       -- ISO 8601 date string
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  test_id         INTEGER REFERENCES tests(id),
  title           TEXT,
  raw_content     TEXT DEFAULT '',        -- Raw Mode (user's typing)
  study_content   TEXT DEFAULT '',        -- Study Mode (AI-synthesized)
  audio_transcript TEXT DEFAULT '',       -- Background transcript
  file_path       TEXT,                   -- Absolute path to .md on disk
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Many-to-many: a deck can cover multiple tests (for midterms/finals)
CREATE TABLE IF NOT EXISTS deck_tests (
  deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  test_id     INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  PRIMARY KEY (deck_id, test_id)
);

CREATE TABLE IF NOT EXISTS cards (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id         INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  topic_tag       TEXT,                   -- e.g. "atp-chemiosmosis"
  source_note_id  INTEGER REFERENCES notes(id),
  source_start    INTEGER,                -- char offset in raw_content
  source_end      INTEGER,                -- char offset in raw_content
  -- SM-2 fields
  ease_factor     REAL DEFAULT 2.5,       -- min 1.3
  interval        INTEGER DEFAULT 1,      -- days until next review
  repetitions     INTEGER DEFAULT 0,
  next_review     TEXT DEFAULT (date('now')),
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS card_reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  result      TEXT NOT NULL,              -- 'easy' | 'hard' | 'forgot'
  reviewed_at TEXT DEFAULT (datetime('now')),
  new_interval INTEGER,
  new_ease    REAL
);

-- FTS5 full-text search index over notes
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  raw_content,
  study_content,
  content=notes,
  content_rowid=id
);
```

---

## 3. Tauri Config

```json
// src-tauri/tauri.conf.json
{
  "tauri": {
    "bundle": {
      "identifier": "com.scholr.app",
      "icon": ["icons/icon.png"],
      "resources": ["models/*"],
      "externalBin": []
    },
    "windows": [
      {
        "title": "Scholr",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": false,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'"
    }
  },
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```

```toml
# src-tauri/Cargo.toml
[package]
name = "scholr"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri            = { version = "2", features = ["devtools"] }
tauri-plugin-fs  = "2"
tauri-plugin-dialog = "2"
serde            = { version = "1", features = ["derive"] }
serde_json       = "1"
rusqlite         = { version = "0.31", features = ["bundled"] }
cpal             = "0.15"
tokio            = { version = "1", features = ["full"] }
anyhow           = "1"
log              = "0.4"

# LiteRT (TensorFlow Lite Rust bindings — swap for official crate when stable)
# tflite         = "0.4"   # uncomment when integrating models

[features]
audio_capture = []   # desktop only — never compiled for mobile targets

[profile.release]
opt-level = 3
lto = true
```

---

## 4. Rust Backend — File Stubs

### `src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod ai;
mod storage;
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize SQLite on first launch
            storage::db::init(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Note commands
            commands::note_commands::save_note,
            commands::note_commands::load_note,
            commands::note_commands::list_notes,
            // Audio commands
            #[cfg(feature = "audio_capture")]
            commands::audio_commands::start_recording,
            #[cfg(feature = "audio_capture")]
            commands::audio_commands::stop_recording,
            // AI commands
            commands::ai_commands::synthesize_note,
            commands::ai_commands::generate_cards,
            // Card commands
            commands::card_commands::create_card,
            commands::card_commands::review_card,
            commands::card_commands::get_deck,
            commands::card_commands::delete_card,
            // Scheduler commands
            commands::scheduler_commands::add_exam,
            commands::scheduler_commands::get_daily_plan,
            commands::scheduler_commands::get_review_queue,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Scholr");
}
```

### `src-tauri/src/audio/mod.rs`

```rust
// AudioBackend trait — platform implementations swap in via cfg
pub trait AudioBackend: Send + Sync {
    fn start_capture(&self) -> anyhow::Result<()>;
    fn stop_capture(&self) -> anyhow::Result<Vec<f32>>;  // returns raw PCM samples
    fn is_capturing(&self) -> bool;
}

// Platform selection at compile time
#[cfg(feature = "audio_capture")]
pub use capture::CpalBackend as DefaultBackend;

pub mod capture;
pub mod vad;
```

### `src-tauri/src/audio/vad.rs`

```rust
// Voice Activity Detection — energy-threshold approach
// Runs on a low-priority thread, discards silent frames before they reach
// the AI pipeline. Prevents wasting inference on empty audio chunks.

const SILENCE_THRESHOLD: f32 = 0.01;   // RMS energy cutoff
const CHUNK_DURATION_MS: u64 = 45_000; // 45-second batch window

pub struct VadFilter {
    threshold: f32,
}

impl VadFilter {
    pub fn new() -> Self {
        Self { threshold: SILENCE_THRESHOLD }
    }

    /// Returns true if this audio chunk contains speech
    pub fn contains_speech(&self, samples: &[f32]) -> bool {
        let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
        rms > self.threshold
    }
}
```

### `src-tauri/src/ai/lifecycle.rs`

```rust
// Load-Infer-Purge state machine
// The model is NEVER in RAM unless a button was explicitly clicked.
// After inference completes the model is dropped immediately.

use std::sync::atomic::{AtomicBool, Ordering};

static MODEL_LOADED: AtomicBool = AtomicBool::new(false);

pub enum AIState {
    Idle,
    Loading,
    Inferring,
    Done,
}

pub struct ModelSession {
    // tflite::Interpreter placeholder — replace with real LiteRT binding
    _handle: (),
}

impl ModelSession {
    /// Load model into RAM — called only on explicit user action
    pub fn load(model_path: &str) -> anyhow::Result<Self> {
        MODEL_LOADED.store(true, Ordering::SeqCst);
        // TODO: tflite::Interpreter::new(model_path)
        Ok(Self { _handle: () })
    }

    /// Run inference, return output string
    pub fn infer(&self, input: &str) -> anyhow::Result<String> {
        // TODO: call LiteRT interpreter with tokenized input
        todo!("LiteRT inference")
    }
}

impl Drop for ModelSession {
    fn drop(&mut self) {
        // Model is purged from RAM the moment this struct is dropped
        MODEL_LOADED.store(false, Ordering::SeqCst);
    }
}
```

### `src-tauri/src/ai/prompts.rs`

```rust
// All LLM prompts live here — single source of truth.
// Tweak these to improve output quality without touching inference code.

/// Prompt for converting raw notes + transcript into Study Mode markdown
pub fn synthesize_prompt(raw_notes: &str, transcript: &str) -> String {
    format!(
        "You are a precise academic note formatter. \
         Convert the following raw notes and voice transcript into a clean, \
         textbook-quality Markdown study guide. \
         Use ONLY: ## headers, bullet points, and **bold** for key terms. \
         Do not add information not present in the source material. \
         Do not use tables, code blocks, or horizontal rules.\n\n\
         RAW NOTES:\n{raw_notes}\n\n\
         VOICE TRANSCRIPT:\n{transcript}"
    )
}

/// Prompt for generating flashcards — zero creative freedom, strict JSON only
pub fn flashcard_gen_prompt(
    subject_context: &str,
    covered_topics: &[String],
    source_text: &str,
) -> String {
    let skip_list = covered_topics.join(", ");
    format!(
        "You are a flashcard generator for the subject: {subject_context}.\n\
         SKIP any concept already covered by these topic tags: [{skip_list}].\n\
         From the source text below, extract ONLY atomic, testable facts \
         not already in the skip list.\n\
         Output a JSON array ONLY — no preamble, no markdown fences.\n\
         Schema: [{{\"front\": string, \"back\": string, \"topic_tag\": string}}]\n\
         If you are uncertain about a fact, set \"back\" to null — do not guess.\n\
         topic_tag must be a 2-5 word kebab-case slug.\n\n\
         SOURCE TEXT:\n{source_text}"
    )
}

/// Prompt for adding cards to an existing deck — incrementally
pub fn incremental_cards_prompt(
    subject_context: &str,
    covered_topics: &[String],
    new_notes: &str,
) -> String {
    let skip_list = covered_topics.join(", ");
    format!(
        "You are expanding an existing flashcard deck for: {subject_context}.\n\
         The deck already contains cards for these topics: [{skip_list}].\n\
         Generate NEW cards only for concepts NOT in that list.\n\
         Output JSON array only. Schema: [{{\"front\": string, \"back\": string, \"topic_tag\": string}}]\n\n\
         NEW NOTES TO PROCESS:\n{new_notes}"
    )
}
```

### `src-tauri/src/storage/db.rs`

```rust
use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .expect("no app data dir")
        .join("scholr.db")
}

pub fn init(app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let path = db_path(app_handle);
    let conn = Connection::open(&path)?;
    conn.execute_batch(include_str!("../../../schema.sql"))?;
    Ok(())
}

pub fn get_conn(app_handle: &tauri::AppHandle) -> anyhow::Result<Connection> {
    Ok(Connection::open(db_path(app_handle))?)
}
```

### `src-tauri/src/storage/cards.rs` (SM-2 algorithm)

```rust
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    pub id: i64,
    pub deck_id: i64,
    pub front: String,
    pub back: String,
    pub topic_tag: Option<String>,
    pub source_note_id: Option<i64>,
    pub source_start: Option<i64>,
    pub source_end: Option<i64>,
    pub ease_factor: f64,
    pub interval: i64,
    pub repetitions: i64,
    pub next_review: String,
}

#[derive(Debug, Deserialize)]
pub enum ReviewResult { Easy, Hard, Forgot }

/// SM-2 algorithm with exam-date interval compression
pub fn update_sm2(
    conn: &Connection,
    card_id: i64,
    result: ReviewResult,
    days_until_exam: Option<i64>,
) -> anyhow::Result<()> {
    let (mut ease, mut interval, mut reps): (f64, i64, i64) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        [card_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;

    match result {
        ReviewResult::Easy => {
            ease = (ease + 0.1).min(3.0);
            interval = ((interval as f64 * ease).round() as i64).max(1);
            reps += 1;
        }
        ReviewResult::Hard => {
            ease = (ease - 0.15).max(1.3);
            interval = ((interval as f64 * 0.8).round() as i64).max(1);
            reps += 1;
        }
        ReviewResult::Forgot => {
            ease = (ease - 0.2).max(1.3);
            interval = 1;
            reps = 0;
        }
    }

    // Exam compression: never schedule beyond (days_until_exam / 3)
    // This guarantees at least 3 reviews before the test
    if let Some(days) = days_until_exam {
        let cap = (days / 3).max(1);
        interval = interval.min(cap);
    }

    let next_review = chrono_next_review(interval);

    conn.execute(
        "UPDATE cards SET ease_factor=?1, interval=?2, repetitions=?3, next_review=?4 WHERE id=?5",
        rusqlite::params![ease, interval, reps, next_review, card_id],
    )?;

    Ok(())
}

fn chrono_next_review(interval_days: i64) -> String {
    // Returns ISO date string `interval_days` from today
    // TODO: use chrono crate: Local::now() + Duration::days(interval_days)
    format!("TODO+{}days", interval_days)
}

/// Get all topic_tags already in a deck (for AI deduplication)
pub fn get_covered_topics(conn: &Connection, deck_id: i64) -> anyhow::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT topic_tag FROM cards WHERE deck_id = ?1 AND topic_tag IS NOT NULL"
    )?;
    let topics = stmt.query_map([deck_id], |r| r.get(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(topics)
}
```

---

## 5. React Frontend — File Stubs

### `src/types/index.ts`

```typescript
export interface Note {
  id: number;
  classId: number;
  testId?: number;
  title: string;
  rawContent: string;         // Raw Mode — user's text, never touched by AI
  studyContent: string;       // Study Mode — AI-synthesized, read-only by default
  audioTranscript: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: number;
  deckId: number;
  front: string;
  back: string;
  topicTag?: string;
  sourceNoteId?: number;
  sourceStart?: number;       // char offset in rawContent for highlight
  sourceEnd?: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

// Confidence tier derived from easeFactor
export type Confidence = 'learning' | 'shaky' | 'known';
export function getConfidence(easeFactor: number): Confidence {
  if (easeFactor < 1.8) return 'learning';
  if (easeFactor < 2.3) return 'shaky';
  return 'known';
}

export interface Deck {
  id: number;
  classId: number;
  name: string;
  testIds: number[];         // which tests this deck covers
}

export interface Test {
  id: number;
  classId: number;
  name: string;
  examDate?: string;
}

export interface Class {
  id: number;
  name: string;
  color: string;
}

export interface ReviewResult {
  cardId: number;
  result: 'easy' | 'hard' | 'forgot';
}

export interface DailyPlan {
  cardsdue: number;
  dailyQuota: number;
  daysUntilExam: number;
  onTrack: boolean;           // true if cardsdue <= dailyQuota * 1.2
}

export type AIStatus = 'idle' | 'loading' | 'inferring' | 'done' | 'error';

export interface HighlightRange {
  start: number;
  end: number;
  cardId: number;
  confidence: Confidence;
}
```

### `src/App.tsx`

```typescript
import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import DualPane from './components/notes/DualPane';
import CardReview from './components/flashcards/CardReview';
import ExamCalendar from './components/scheduler/ExamCalendar';

type View = 'notes' | 'review' | 'calendar';

export default function App() {
  const [view, setView] = useState<View>('notes');
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeClassId={activeClassId}
        onSelectClass={setActiveClassId}
        onSelectNote={setActiveNoteId}
        onNavigate={setView}
      />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'notes'    && <DualPane noteId={activeNoteId} />}
        {view === 'review'   && <CardReview classId={activeClassId} />}
        {view === 'calendar' && <ExamCalendar classId={activeClassId} />}
      </main>
    </div>
  );
}
```

### `src/components/notes/DualPane.tsx`

```typescript
import { useState } from 'react';
import NoteEditor from './NoteEditor';
import StudyPanel from './StudyPanel';
import FlashcardBuilder from '../flashcards/FlashcardBuilder';
import VoiceBar from '../audio/VoiceBar';
import SynthesizeButton from '../ai/SynthesizeButton';
import { useAIStatus } from '../../hooks/useAIStatus';

interface Props { noteId: number | null; }

type RightPanel = 'study' | 'flashcards';

export default function DualPane({ noteId }: Props) {
  const [rightPanel, setRightPanel] = useState<RightPanel>('study');
  const [selection, setSelection] = useState<string>('');
  const { status } = useAIStatus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <VoiceBar />
        <div style={{ flex: 1 }} />
        <button onClick={() => setRightPanel('study')}>Study mode</button>
        <button onClick={() => setRightPanel('flashcards')}>Flashcards</button>
        <SynthesizeButton noteId={noteId} status={status} />
      </div>

      {/* Main split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — Raw Mode (always present) */}
        <div style={{ flex: 1.6, overflow: 'hidden', borderRight: '0.5px solid var(--color-border-tertiary)' }}>
          <NoteEditor
            noteId={noteId}
            onSelectionChange={setSelection}
          />
        </div>

        {/* RIGHT — Study Mode or Flashcard Builder */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {rightPanel === 'study'
            ? <StudyPanel noteId={noteId} aiStatus={status} />
            : <FlashcardBuilder noteId={noteId} selectedText={selection} />
          }
        </div>

      </div>
    </div>
  );
}
```

### `src/hooks/useAIStatus.ts`

```typescript
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AIStatus } from '../types';

export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus>('idle');

  // Load-Infer-Purge wrapper — call any Tauri AI command through this
  const runAI = useCallback(async <T>(
    command: string,
    args: Record<string, unknown>
  ): Promise<T | null> => {
    try {
      setStatus('loading');
      // Model is loaded inside the Rust command
      setStatus('inferring');
      const result = await invoke<T>(command, args);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000); // reset badge after 2s
      return result;
    } catch (err) {
      console.error(err);
      setStatus('error');
      return null;
    }
    // Model is dropped (purged) inside Rust as soon as command returns
  }, []);

  return { status, runAI };
}
```

### `src/hooks/useScheduler.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { DailyPlan, ReviewResult } from '../types';

export function useScheduler(classId: number | null) {

  async function getDailyPlan(): Promise<DailyPlan | null> {
    if (!classId) return null;
    return invoke<DailyPlan>('get_daily_plan', { classId });
  }

  async function getReviewQueue() {
    if (!classId) return [];
    return invoke<number[]>('get_review_queue', { classId });
  }

  async function submitReview(review: ReviewResult) {
    return invoke('review_card', { cardId: review.cardId, result: review.result });
  }

  return { getDailyPlan, getReviewQueue, submitReview };
}
```

### `src/components/flashcards/CardReview.tsx`

```typescript
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, ReviewResult } from '../../types';

interface Props { classId: number | null; }

export default function CardReview({ classId }: Props) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = queue[index];

  useEffect(() => {
    if (!classId) return;
    invoke<Card[]>('get_review_queue', { classId }).then(setQueue);
  }, [classId]);

  async function handleReview(result: ReviewResult['result']) {
    if (!current) return;
    await invoke('review_card', { cardId: current.id, result });
    setFlipped(false);
    setIndex(i => i + 1);
  }

  if (!current) return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>No cards due today.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 24 }}>

      {/* Progress */}
      <div style={{ alignSelf: 'stretch', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        {index} / {queue.length} reviewed
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%', maxWidth: 520, minHeight: 220,
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '32px 36px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        {flipped ? current.back : current.front}
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        {flipped ? '' : 'Click card to reveal answer'}
      </div>

      {/* Rating buttons — only show after flip */}
      {flipped && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => handleReview('forgot')} style={{ color: 'var(--color-text-danger)' }}>Forgot</button>
          <button onClick={() => handleReview('hard')}>Hard</button>
          <button onClick={() => handleReview('easy')} style={{ color: 'var(--color-text-success)' }}>Easy</button>
        </div>
      )}
    </div>
  );
}
```

---

## 6. AI Prompts Reference

All prompts live in `src-tauri/src/ai/prompts.rs`. Key parameters to tune:

| Prompt | Key levers | Notes |
|---|---|---|
| `synthesize_prompt` | Formatting rules, forbidden elements | Keep headers/bullets only — no tables |
| `flashcard_gen_prompt` | JSON schema, null-on-uncertainty rule | `temperature = 0` in LiteRT call |
| `incremental_cards_prompt` | Skip-list injection | Re-query covered topics before every call |

Model settings for all inference calls:
```rust
temperature: 0.0      // deterministic — same input = same output
max_tokens: 1024      // enough for ~8-12 cards or a full study doc section
top_p: 1.0
```

---

## 7. Feature Flags

```
audio_capture   — mic capture via cpal (desktop only)
                  NOT compiled for iOS / Android targets
```

When building for mobile in the future, the flag is simply absent from the target's build profile. No `#[cfg]` blocks needed outside of `main.rs` and `audio/`.

---

## 8. Build & Run

```bash
# Install Tauri CLI
cargo install tauri-cli

# Install JS dependencies
npm install

# Dev server (hot-reload frontend + Rust recompile on save)
cargo tauri dev

# Production build (Windows)
cargo tauri build --target x86_64-pc-windows-msvc

# Production build (macOS Apple Silicon)
cargo tauri build --target aarch64-apple-darwin

# Production build (macOS Intel)
cargo tauri build --target x86_64-apple-darwin

# Production build (Linux)
cargo tauri build --target x86_64-unknown-linux-gnu
```

**First-run model setup** (until auto-download is implemented):
1. Download `gemma4-e2b-q8.tflite` from Kaggle / Google AI Edge
2. Place in `src-tauri/models/`
3. Path is bundled automatically via `tauri.conf.json` resources field

---

## 9. Build Order / Milestones

Work through these in order — every milestone is independently usable.

### Milestone 1 — Bare bones text editor (no AI)
- [ ] Tauri project scaffolded and running
- [x] Sidebar with class/note list
- [x] `NoteEditor.tsx` — plain `<textarea>` that saves to disk as `.md`
- [x] SQLite init + `notes` table created on launch
- [x] `save_note` and `load_note` Tauri commands wired up

### Milestone 2 — Dual pane + Study Mode shell
- [x] `DualPane.tsx` split layout
- [x] `StudyPanel.tsx` — read-only markdown renderer (no AI yet, just renders raw_content)
- [x] Toggle between Study Mode and Flashcard Builder in right pane
- [x] `SynthesizeButton` component (shows "AI not ready yet" placeholder)

### Milestone 3 — Manual flashcards
- [ ] `FlashcardBuilder.tsx` right pane
- [ ] Text selection → auto-fill card front
- [ ] Deck + test picker dropdown
- [ ] `create_card` command + SQLite insert
- [ ] `CardList.tsx` with confidence dots
- [ ] `CardReview.tsx` flip + Easy/Hard/Forgot

### Milestone 4 — SM-2 scheduler
- [ ] `update_sm2` in `cards.rs` fully implemented
- [ ] `get_daily_plan` command
- [ ] `ExamCalendar.tsx` — add exam date linked to deck
- [ ] `StudyPlan.tsx` — quota + on-track indicator
- [ ] `HighlightLayer.tsx` — underline heatmap over note text using source ranges

### Milestone 5 — LiteRT + AI Study Mode
- [ ] LiteRT Rust bindings integrated
- [ ] `lifecycle.rs` Load-Infer-Purge working end-to-end
- [ ] `synthesize_note` command producing real Study Mode output
- [ ] `AIStatusBadge.tsx` showing loading/done state
- [ ] `StudyPanel.tsx` rendering AI output

### Milestone 6 — AI flashcard generation
- [ ] `flashcard_gen` command with dedup filter
- [ ] `AICardPreview.tsx` — accept / edit / skip flow
- [ ] Incremental "add more cards" without duplicating covered topics
- [ ] Subject context input in FlashcardBuilder

### Milestone 7 — Voice + VAD (desktop only)
- [ ] `cpal` mic capture running
- [ ] `VadFilter` discarding silent frames
- [ ] 45-second batch → transcript stored in note
- [ ] `VoiceBar.tsx` + `TranscriptFeed.tsx`
- [ ] Transcript piped into synthesis prompt

### Milestone 8 — Cross-platform polish
- [ ] macOS and Linux audio backend tested via `cpal`
- [ ] macOS `.app` bundle + code signing
- [ ] Mobile build (no audio, read-only) — Tauri iOS/Android target

---

## 10. Key Libraries

| Library | Where | Purpose |
|---|---|---|
| `tauri 2` | Rust | Desktop shell, IPC, file system |
| `rusqlite` (bundled) | Rust | SQLite — notes, cards, scheduler |
| `cpal 0.15` | Rust | Cross-platform mic capture |
| `serde` + `serde_json` | Rust | Serialization for Tauri commands |
| `anyhow` | Rust | Error handling |
| `tflite` (LiteRT) | Rust | Gemma 4 inference |
| `react 18` | TS | UI framework |
| `@tauri-apps/api` | TS | `invoke()`, file dialogs |
| `zustand` | TS | Lightweight global state |
| `@uiw/react-md-editor` | TS | Markdown editor with preview |
| `vite` | TS | Dev server + bundler |

Install frontend deps:
```bash
npm install zustand @tauri-apps/api @uiw/react-md-editor
```

---

*This file is your living spec. As features ship, check off milestones and update stubs with real implementations. Keep `prompts.rs` as the single place you tune AI behavior — changing a prompt should never require touching UI code.*
