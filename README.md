# Scholr

Desktop-first study notes and flashcard app built with Tauri 2, React, TypeScript, and Rust.

## Quick Start

1. Install dependencies:
   - `npm install`
   - `cargo install tauri-cli`
2. Run in development:
   - `cargo tauri dev`

## Current status

Foundation milestone is implemented:
- Sidebar with classspace management (create, rename, delete) and scoped note lists
- Plain note editor with 3s debounce save
- SQLite initialization and note CRUD commands
- Markdown note files persisted under `notes/{class_slug}/YYYY-MM-DD_HHMMSS.md`
