# Scholr

Desktop-first study notes and flashcard app built with Tauri 2, React, TypeScript, and Rust.

## Quick Start

1. Install dependencies once:
   - `npm install`
2. Start the fastest feedback loop for UI work:
   - `npm run dev`
3. Start the full desktop app:
   - `npm run dev:desktop`

## Fast Checks

Use these when you want to test a change without doing a full build from scratch:

- UI only: `npm run dev`
- Rust backend only: `npm run check:rust`
- Full app sanity check: `npm run check:all`

The npm scripts include the Tauri CLI, so you do not need a separate `cargo install tauri-cli` step.

## Current status

Foundation milestone is implemented:
- Sidebar with classspace management (create, rename, delete) and scoped note lists
- Plain note editor with 3s debounce save
- SQLite initialization and note CRUD commands
- Markdown note files persisted under `notes/{class_slug}/YYYY-MM-DD_HHMMSS.md`
