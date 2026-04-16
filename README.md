# Scholr

Desktop-first study notes and flashcard app built with Tauri 2, React, TypeScript, and Rust.

## Quick Start

1. Install dependencies once:
   - `npm install`
2. Start the full desktop app (frontend + Rust backend):
   - `npm run dev`
3. Start UI-only development when backend is not needed:
   - `npm run dev:web`

## Fast Checks

Use these when you want to test a change without doing a full build from scratch:

- UI only: `npm run dev:web`
- Rust backend only: `npm run check:rust`
- Full app sanity check: `npm run check:all`
- Flashcard quality suite: `npm run test:quality`

The npm scripts include the Tauri CLI, so you do not need a separate `cargo install tauri-cli` step.

## Current status

Foundation milestone is implemented:
- Sidebar with classspace management (create, rename, delete) and scoped note lists
- Plain note editor with 3s debounce save
- SQLite initialization and note CRUD commands
- Markdown note files persisted under `notes/{class_slug}/YYYY-MM-DD_HHMMSS.md`

## Privacy and Local Data Safety

Scholr is local-first. Personal notes and local databases should never be pushed to GitHub.

- `notes/` is ignored by git.
- Local sqlite artifacts (`*.db`, `*.db-wal`, `*.db-shm`, `*.db-journal`) are ignored.
- Local env overrides (`.env.local`) are ignored.

If notes were tracked before this change, run once:

- `git rm -r --cached notes`
- `git commit -m "stop tracking local notes"`

## V1 Rollout Tracker

Implementation phases are tracked in `IMPLEMENTATION_PHASES.md`.
