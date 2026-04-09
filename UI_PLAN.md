# Kura Notes: UI/UX Master Plan (2026 Pro-Level)

This document outlines the roadmap to transition Kura Notes from a "basic" UI to a world-class, zero-friction, top-tier user experience. The core philosophy is **Speed, Clarity, and Progressive Disclosure.**

---

## Phase 1: The "Zero-Friction" Foundation (Focus & Typography)

**The Goal:** When the user opens the app, they should be able to start typing within 0.5 seconds. The interface must look clean, breathable, and premium.

### What to Implement:
1. **Focus Mode by Default:** The `NoteEditor.tsx` should take up 80% of the screen by default. No cluttered toolbars.
2. **Premium Typography & Whitespace:** Implement a strict spacing system and a highly legible font stack.
3. **Instant Capture:** Opening the app immediately focuses the cursor on a new or the most recently opened note.

### Step-by-Step Implementation:
1. **Update `src/styles/global.css`:**
   * Import a premium sans-serif font like **Inter** or **SF Pro** for the UI.
   * Import a highly readable serif font (like **Merriweather** or **Lora**) for long-form note bodies.
   * Define your CSS variables for spacing (e.g., `--spacing-sm`, `--spacing-md`, `--spacing-xl`) and strictly adhere to them. Double your current margins to give elements "breathing room."
2. **Refactor `NoteEditor.tsx`:**
   * Remove unnecessary borders and backgrounds. Make the editor background seamlessly blend with the main app background.
   * Add an `autoFocus` property to your main text input area so the user can type immediately on launch.
3. **Clean up `Sidebar.tsx`:**
   * Make it collapsible. Add a subtle, smooth animation (using CSS transitions or `framer-motion`) when it opens/closes.
   * Use an icon-only mode when collapsed to save space.

---

## Phase 2: Progressive Disclosure (Hiding the Heavy Artillery)

**The Goal:** You have incredibly powerful tools (`StudyPanel.tsx`, `FlashcardBuilder.tsx`, `DualPane.tsx`, `SynthesizeButton.tsx`). Do not overwhelm the user by showing them all at once. Hide complexity until it is requested.

### What to Implement:
1. **"Modes" Architecture:** Implement contextual modes (e.g., "Note Taking Mode" vs. "Study Mode").
2. **Dynamic Tool Dock:** Make your `ToolDock.tsx` float and only appear when needed, or keep it quietly tucked away on the edge of the screen.

### Step-by-Step Implementation:
1. **Create a Global UI State:**
   * In `src/types/index.ts`, define a `UIState` interface (e.g., `type AppMode = 'focus' | 'study' | 'organize'`).
   * Use React Context (or Zustand/Redux) to manage this state globally across `App.tsx`.
2. **Refactor `DualPane.tsx` and `StudyPanel.tsx`:**
   * Only mount or render these components when `AppMode === 'study'`.
   * When transitioning into Study Mode, use a smooth sliding animation to split the screen, revealing the flashcards or study panel alongside the notes.
3. **Optimize `SynthesizeButton.tsx`:**
   * Make this an inline, floating contextual button. Like Medium or Notion, when the user highlights text, *then* pop up the AI Synthesize button. Don't leave it permanently taking up space on the screen.

---

## Phase 3: Spatial Organization (The "Whiteboard" Feel)

**The Goal:** Students hate endless nested folders. Leverage your `FolderCanvas.tsx` to create a visual, spatial way to map out semesters and classes.

### What to Implement:
1. **Visual Node Map:** Treat folders and classes as cards on a 2D canvas that the user can pan around.
2. **Drag-and-Drop:** Seamlessly move notes between visual buckets.

### Step-by-Step Implementation:
1. **Enhance `FolderCanvas.tsx`:**
   * Use a library like `reactflow` or `framer-motion` to create a draggable 2D canvas.
   * Represent classes (from `src-tauri/src/storage/classes.rs`) as large boundary boxes.
   * Represent notes as small draggable cards within those boxes.
2. **Implement Drag and Drop:**
   * Use `@dnd-kit/core` to allow users to drag a note from the `Sidebar.tsx` directly onto the `FolderCanvas.tsx`.
3. **Zoom & Pan Controls:**
   * Add a mini-map or simple zoom controls in the bottom right corner of the canvas for easy navigation of large semesters.

---

## Phase 4: Pro-Level 2026 Polish (Speed & Feel)

**The Goal:** Make the app feel like magic. It should feel native, incredibly fast, and unbreakable.

### What to Implement:
1. **Command Palette (Cmd/Ctrl + K):** Power users navigate without a mouse. 
2. **Instant Local Sync:** Leverage Tauri so every keystroke is saved immediately without loaders.
3. **Micro-interactions:** Small satisfying animations when tasks are completed or flashcards are created.

### Step-by-Step Implementation:
1. **Build a Command Palette:**
   * Create a global modal triggered by `Cmd+K` (Mac) or `Ctrl+K` (Windows).
   * Allow users to type to search for notes, create new folders, or switch to "Study Mode" directly from the keyboard.
2. **Verify Tauri Backend Speed:**
   * Check your `src-tauri/src/commands/note_commands.rs` and ensure that save operations are debounced (using your `useDebounce.ts` hook) but handled entirely locally via SQLite (`schema.sql`). 
   * Ensure there are absolutely no "loading spinners" when saving text.
3. **Add Micro-interactions:**
   * When a flashcard is generated via `FlashcardBuilder.tsx`, add a subtle success state (a green checkmark pop, a slight scale bounce on the card).

---

## Summary of Your Immediate Next Steps (Today/Tomorrow):
1. **Strip back the UI:** Go into `App.tsx` and hide everything except the `NoteEditor` and a clean `Sidebar`.
2. **Fix Fonts & Spacing:** Update `global.css` to use Inter/SF Pro and double your whitespace.
3. **Build the "Study Mode" Toggle:** Wire up a beautiful button that seamlessly slides out the `DualPane` and `StudyPanel` only when clicked.