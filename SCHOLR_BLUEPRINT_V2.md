# SCHOLR — Perfect UX Blueprint v2.0
### *Complete Implementation Guide — Universal Smart Note Intelligence*

> **Core Promise:** Every note-taking app fails the same way — it asks too much before it gives anything back. Scholr must let the user write within 1 second of opening, and the app must become more powerful the longer they use it without ever becoming more complicated. The `::` operator is the single most powerful embodiment of this promise: it turns any line of any subject into a perfectly formatted flashcard without the user ever leaving their writing flow.

---

## Table of Contents

1. [The Core UX Problems We Are Solving](#1-the-core-ux-problems-we-are-solving)
2. [The Two-User Model: Beginner vs. Pro](#2-the-two-user-model-beginner-vs-pro)
3. [Design System Overhaul](#3-design-system-overhaul)
4. [Phase 1 — Zero-Friction First Launch](#phase-1--zero-friction-first-launch)
5. [Phase 2 — The Intelligent Editor](#phase-2--the-intelligent-editor)
6. [Phase 3 — The Universal Smart :: System ⬅ NEW](#phase-3--the-universal-smart--system)
7. [Phase 4 — Omni-Capture System](#phase-4--omni-capture-system)
8. [Phase 5 — The Flashcard Ecosystem](#phase-5--the-flashcard-ecosystem)
9. [Phase 6 — Study Mode & AI Synthesis](#phase-6--study-mode--ai-synthesis)
10. [Phase 7 — The Scheduler & Exam Engine](#phase-7--the-scheduler--exam-engine)
11. [Phase 8 — Command Palette & Power-User Layer](#phase-8--command-palette--power-user-layer)
12. [Phase 9 — Canvas & Spatial Organization](#phase-9--canvas--spatial-organization)
13. [Phase 10 — Voice & Audio Pipeline](#phase-10--voice--audio-pipeline)
14. [Phase 11 — Polish, Animation & Micro-interactions](#phase-11--polish-animation--micro-interactions)
15. [Full Implementation Checklist](#full-implementation-checklist)
16. [File-by-File Change Map](#file-by-file-change-map)

---

## 1. The Core UX Problems We Are Solving

These are the documented failure modes of every major note-taking app (Notion, Obsidian, Roam, Bear, Apple Notes) that Scholr must definitively fix:

| Problem | App(s) Guilty | Scholr's Answer |
|---|---|---|
| Blank screen paralysis on first open | Notion, Obsidian | Auto-create first note + inline ghost prompts |
| Setup required before value is delivered | Notion, Roam | Zero-config — works instantly, structure optional |
| Flashcards only work for simple Q&A | Every app | Universal `::` context engine handles 15+ note types |
| Flashcards are siloed from note-taking | Every app | `::` creates cards inline without leaving the editor |
| The app doesn't understand your subject | Every app | Pattern classifier works for Bible, Math, Nursing, Law, Science, any subject |
| Nested notes are impossible to turn into cards | Every app | Batch card generation from entire indented blocks |
| Study mode requires manual preparation | Every app | AI synthesizes study doc from raw notes on demand |
| Folders & tags become a second job | Obsidian, Notion | Tagging is optional, auto-suggested, never blocking |
| Keyboard power tools hidden or missing | Bear, Apple Notes | Command palette accessible from anywhere, always |
| Scheduling disconnected from notes | Every app | SM-2 schedule derived directly from your own note content |
| Voice capture requires context switching | Every app | Global shortcut captures voice without leaving any app |
| Canvas views are gimmicks | Miro | Canvas cards link directly to openable notes |
| Onboarding takes minutes | Notion | Self-evident UI — the first 5 seconds teach everything |

---

## 2. The Two-User Model: Beginner vs. Pro

Scholr must serve both simultaneously through **Progressive Disclosure**. Every advanced feature must have a simple surface and a powerful depth.

### The Beginner (Day 1 User)
- Needs: blank page → write → done
- Sees: Full-screen editor, one blinking cursor, soft placeholder text
- Discovers: Flashcard toolbar appears on text highlight. Folder appears when they create a second note. Study Mode appears when note reaches ~200 words.
- Learns `::` from the welcome note example, not from a tutorial
- Complexity ceiling: They never need to touch a single setting to get 80% of the value

### The Pro User (Week 2+)
- Needs: keyboard-everything, zero clicks, instant organization, cross-note linking
- Gets: `Cmd+K` command palette, context-intelligent `::` for any subject, `/` slash commands, `[[wikilinks]]`, global capture shortcut, SM-2 scheduler with exam compression, Canvas spatial view, voice pipeline
- Knows that typing `::` on a scripture reference gives different options than typing `::` on a drug name
- Power ceiling: There is none

### The Golden Rule of Progressive Disclosure
> **Never hide a feature. Reveal it at the exact moment it becomes relevant.**

Features appear based on behavioral triggers, not menus:

| Trigger | Feature Revealed |
|---|---|
| First note created | Sidebar appears |
| Text highlighted | Selection toolbar appears |
| Note reaches 150 words | "Synthesize" button pulses once |
| First `::` typed | Mini hint: "Smart format detected — press Enter for best card" |
| 3+ notes created | "Organize" canvas prompt appears |
| Note saved 5th time | Keyboard shortcut hint in status bar |
| 5+ flashcards exist | Review session prompt appears |

---

## 3. Design System Overhaul

### 3.1 Typography (Critical Fix)

Current stack (`Helvetica Neue, Arial`) is generic. Replace with:

```css
/* src/styles/global.css — NEW FONT STACK */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

:root {
  --font-ui: 'Geist', 'SF Pro Display', system-ui, sans-serif;
  --font-note: 'Lora', 'Georgia', 'Times New Roman', serif;
  --font-mono: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-md: 15px;
  --font-size-lg: 17px;
  --font-size-xl: 22px;
  --font-size-2xl: 28px;
  --line-height-note: 1.9;
  --letter-spacing-tight: -0.03em;
}
```

**Why Geist + Lora:** Geist is built for screen legibility. Lora is a serif designed specifically for long-form screen reading — notes in lectures will not cause eye fatigue.

### 3.2 Full Color System

```css
:root {
  /* Backgrounds */
  --color-bg: #111214;
  --color-bg-elevated: #15161a;
  --color-panel: #17181c;
  --color-panel-soft: #1c1d22;
  --color-surface: #242529;

  /* Borders */
  --color-border-faint: rgba(255,255,255,0.04);
  --color-border: rgba(255,255,255,0.08);
  --color-border-medium: rgba(255,255,255,0.12);
  --color-border-strong: rgba(255,255,255,0.18);

  /* Text */
  --color-text: #eceef2;
  --color-text-secondary: #b0b5c0;
  --color-text-muted: #7a8090;
  --color-text-faint: #4a5060;
  --color-text-placeholder: #3f4450;

  /* Accent */
  --color-accent: #6f7ea8;
  --color-accent-bright: #8898c8;
  --color-accent-dim: rgba(111,126,168,0.18);
  --color-accent-glow: rgba(111,126,168,0.08);

  /* Semantic */
  --color-success: #4caf82;
  --color-success-dim: rgba(76,175,130,0.15);
  --color-warning: #e6a94a;
  --color-warning-dim: rgba(230,169,74,0.15);
  --color-danger: #e05b5b;
  --color-danger-dim: rgba(224,91,91,0.15);

  /* Flashcard confidence */
  --color-card-learning: #e05b5b;
  --color-card-shaky: #e6a94a;
  --color-card-known: #4caf82;

  /* Spacing — 4px grid */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Radii */
  --radius-sm: 6px; --radius-md: 10px;
  --radius-lg: 14px; --radius-xl: 20px; --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.5);
  --shadow-glow-accent: 0 0 20px rgba(111,126,168,0.15);

  /* Transitions */
  --transition-fast: 80ms ease;
  --transition-base: 150ms ease;
  --transition-spring: 200ms cubic-bezier(0.34,1.56,0.64,1);
}
```

### 3.3 Component Variants

```css
button.btn-primary {
  background: var(--color-accent-dim);
  border-color: rgba(111,126,168,0.3);
  color: var(--color-accent-bright);
}
button.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--color-text-muted);
}
button.btn-danger {
  background: var(--color-danger-dim);
  border-color: rgba(224,91,91,0.25);
  color: var(--color-danger);
}
button.btn-icon {
  width: 34px; height: 34px;
  padding: 0; justify-content: center;
}
```

---

## Phase 1 — Zero-Friction First Launch

### Goal: User is typing within 1 second. No setup, no tutorial, no choices forced.

### 1.1 Bootstrap Command

**File: `src-tauri/src/commands/note_commands.rs`**

```rust
#[tauri::command]
pub async fn bootstrap_first_launch(app: tauri::AppHandle) -> Result<BootstrapResult, String> {
    let conn = storage::db::get_conn(&app).map_err(|e| e.to_string())?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM classes", [], |r| r.get(0))
        .unwrap_or(0);

    if count > 0 {
        return Ok(BootstrapResult { already_done: true, note_id: None });
    }

    conn.execute("INSERT INTO classes (name, color) VALUES ('My Notes', '#6f7ea8')", [])
        .map_err(|e| e.to_string())?;
    let class_id = conn.last_insert_rowid();

    conn.execute("INSERT INTO folders (class_id, name) VALUES (?1, 'Inbox')",
        rusqlite::params![class_id]).map_err(|e| e.to_string())?;
    let folder_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO notes (class_id, folder_id, title, raw_content) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![class_id, folder_id, "Welcome to Scholr", WELCOME_NOTE],
    ).map_err(|e| e.to_string())?;
    let note_id = conn.last_insert_rowid();

    Ok(BootstrapResult { already_done: false, note_id: Some(note_id) })
}

// The welcome note teaches by example — no tutorial, just working demonstrations
const WELCOME_NOTE: &str = r#"## Welcome to Scholr

Start writing here — this is your note.

**Quick things to try:**

- Type `#` then Space → heading
- Type `-` then Space → bullet list
- Type `/` on a blank line → command menu
- Highlight any text → toolbar appears for flashcards

**The :: trick (works in any subject):**
What is apologetics? :: Knowing what we believe and why, and being able to communicate it effectively

That line just created a flashcard. Try it with dates, formulas, drug names, Bible verses — the app detects the type automatically.

**When your notes are ready:**
Click ✦ Synthesize to generate a clean study guide from this note.

---
*Delete this note whenever you're ready.*
"#;
```

### 1.2 Contextual Ghost Text

```typescript
// Dynamic placeholder based on content length
function getPlaceholderHint(length: number): string {
  if (length === 0) return 'Start writing, or type / for commands...';
  if (length < 50) return 'Keep going — highlight text to create a flashcard...';
  if (length < 200) return 'Try typing :: after any term or date to make a card...';
  return '';
}
```

### 1.3 Progressive Reveal Hook

**File: `src/hooks/useProgressiveReveal.ts` (NEW)**

```typescript
interface RevealState {
  notesSaved: number;
  flashcardsCreated: number;
  hasUsedSlashMenu: boolean;
  totalWordsTyped: number;
  smartColonUsed: number;
}

export function useProgressiveReveal() {
  const [state, setState] = useState<RevealState>(loadOrDefault);

  function bump(key: keyof RevealState, amount = 1) {
    setState(prev => {
      const next = { ...prev, [key]: (prev[key] as number) + amount };
      localStorage.setItem('scholr.reveal', JSON.stringify(next));
      return next;
    });
  }

  const features = {
    showSynthesizeButton:   state.totalWordsTyped > 100,
    showFlashcardHint:      state.notesSaved > 1 && state.flashcardsCreated === 0,
    showStudyModeToggle:    state.flashcardsCreated > 0 || state.notesSaved > 3,
    showOrganizeMode:       state.notesSaved > 5,
    showCommandPaletteHint: state.notesSaved > 2 && !state.hasUsedSlashMenu,
    showSmartColonHint:     state.notesSaved > 1 && state.smartColonUsed === 0,
  };

  return { state, bump, features };
}
```

---

## Phase 2 — The Intelligent Editor

### Goal: The editor is not a textarea — it is a live intelligent document surface.

### 2.1 The Flashcard Status Bar

Always-visible status line at the bottom of the editor:

```tsx
<div className="editor-status-bar">
  <span>{wordCount} words</span>
  <span>·</span>
  <span>{Math.ceil(wordCount / 200)} min read</span>
  <span>·</span>
  <span>{flashcardsOnPage} cards on this note</span>
  {status && <><span>·</span><span className="save-status">{status}</span></>}
</div>
```

### 2.2 Ghost Syntax Overlay

A transparent `<div>` renders behind the `<textarea>` with identical font metrics. It visually colorizes recognized patterns without interrupting typing:

- `#` heading lines → slightly bolder color
- `- / *` bullet lines → real bullet dot in left margin
- `::` lines → faint card icon `⬡` in left gutter, line gets subtle teal tint
- `[[wikilinks]]` → dotted underline
- Dates → faint amber tint

### 2.3 Wikilinks

When user types `[[`, a floating popover shows matching note titles in real time. On Cmd+Click in Study Mode, opens that note in a new tab.

### 2.4 Selection Toolbar

**File: `src/components/notes/SelectionToolbar.tsx` (NEW)**

```tsx
export default function SelectionToolbar({ selectedText, position, onFlashcard, onHighlight, onCopy }) {
  if (!position || !selectedText.trim()) return null;
  return (
    <div className="selection-toolbar" style={{ left: position.x, top: position.y - 48 }}>
      <button className="btn-ghost btn-icon" onClick={onFlashcard} title="Make flashcard">
        <Icon name="flashcards" size={14} />
      </button>
      <button className="btn-ghost btn-icon" onClick={onHighlight} title="Highlight">
        <Icon name="sparkles" size={14} />
      </button>
    </div>
  );
}
```

Position calculated from `window.getSelection().getRangeAt(0).getBoundingClientRect()`.

---

## Phase 3 — The Universal Smart :: System

> This is Scholr's defining feature. No other note-taking app does this. When a student types `::`, the system reads the line, classifies what type of content it is, and offers perfectly formatted card options — without the user specifying their subject. The classifier runs in under 1ms, entirely locally, with no AI required.

### 3.1 Design Philosophy

The `::` operator means: *"I've finished writing this thought — help me process it."*

Before this system, `::` was just "make a flashcard." With this system, `::` is:
- On a scripture reference → verse recall card + verse-to-topic card + batch by verse theme
- On a drug name → full drug profile card + mechanism card + safety card
- On a formula → equation recall + when-to-use + component definition
- On "Two types of X" → batch one card per type automatically
- On a Greek word origin → etymology card
- On a case citation → case brief card + holding-only card
- On a mnemonic acronym → full expansion + batch one card per letter
- On a lab value → normal range card + critical value card
- On "Before/After X" → contrast card + two-era card
- On any nested line → card with parent context included in the front
- On a plain line → standard Q&A card

### 3.2 The Line Context Classifier

**File: `src/utils/lineContext.ts` (NEW)**

```typescript
export type LineContextType =
  | 'scripture'    // Bible/religious text references
  | 'etymology'    // Greek/Hebrew/Latin word origins
  | 'formula'      // Math equations, chemical equations
  | 'rule'         // If→Then conditionals, theorems
  | 'drug'         // Pharmacology drug names
  | 'labvalue'     // Nursing/medical normal ranges
  | 'mnemonic'     // Acronyms, memory devices
  | 'classification' // "Two types of X", "Three goals for Y"
  | 'hierarchy'    // Maslow, taxonomies, pyramids
  | 'case'         // Legal case citations
  | 'definition'   // X = Y, X: Y, X — Y
  | 'comparison'   // Before/After, X vs Y, cause/effect
  | 'date'         // Historical events with years
  | 'nested'       // Deeply indented lines with parent context
  | 'key-term'     // Standalone term with sibling context
  | 'plain';       // Fallback

export interface LineContext {
  type: LineContextType;
  label: string;         // Human-readable label for the palette header
  confidence: number;    // 0–1, how certain the classifier is
  metadata: Record<string, string | string[] | number>;
}

export function classifyLine(
  rawLine: string,
  allLines: string[],
  lineIndex: number
): LineContext {
  const line = rawLine.replace(/::/g, '').trim();
  const lower = line.toLowerCase();

  // ── 1. SCRIPTURE REFERENCE ─────────────────────────────────────────────────
  // Matches: "1 Peter 3:8-16", "John 3:16", "Gen 1:1", "Matthew 5:3–12"
  const scriptureMatch = line.match(
    /\b(\d?\s?[A-Z][a-zA-Z]+\.?)\s+(\d+):(\d+)(?:[–\-](\d+))?\b/
  );
  if (scriptureMatch) {
    return {
      type: 'scripture',
      label: 'Scripture reference',
      confidence: 0.95,
      metadata: {
        book: scriptureMatch[1],
        chapter: scriptureMatch[2],
        verseStart: scriptureMatch[3],
        verseEnd: scriptureMatch[4] ?? scriptureMatch[3],
        full: `${scriptureMatch[1]} ${scriptureMatch[2]}:${scriptureMatch[3]}${scriptureMatch[4] ? '–'+scriptureMatch[4] : ''}`
      }
    };
  }

  // ── 2. GREEK / HEBREW / LATIN ETYMOLOGY ────────────────────────────────────
  // Matches: "Greek word apologia", "Hebrew: chesed", "from Latin fides"
  const etymMatch = line.match(
    /\b(greek|hebrew|latin|aramaic|root)\s+(word|term|for|origin|meaning)?\s*:?\s*["']?([a-zA-Z]+)["']?/i
  );
  if (etymMatch) {
    return {
      type: 'etymology',
      label: `${etymMatch[1].charAt(0).toUpperCase() + etymMatch[1].slice(1)} word origin`,
      confidence: 0.9,
      metadata: { language: etymMatch[1], word: etymMatch[3] }
    };
  }

  // ── 3. CHEMICAL / MATH FORMULA ─────────────────────────────────────────────
  // Matches: equations with =, ±, √, chemical notation, variables
  const formulaPatterns = [
    /[=]\s*[-−]?[a-zA-Z(]/,     // standard equation: x = -b
    /[±√∑∫∞]/,                   // math symbols
    /[A-Z][a-z]?[\d₀-₉]+/,      // chemical: CO₂, H₂O, C₆H₁₂O₆
    /→\s*[A-Z]/,                  // reaction arrow: CO₂ + H₂O →
    /\b\d+[a-z]²/,               // polynomial: 2x²
  ];
  if (formulaPatterns.some(p => p.test(line))) {
    return {
      type: 'formula',
      label: line.includes('→') ? 'Chemical equation' : 'Formula / equation',
      confidence: 0.88,
      metadata: { formula: line }
    };
  }

  // ── 4. DRUG / MEDICATION NAME ───────────────────────────────────────────────
  // Drug suffixes: -statin, -mab, -pril, -olol, -azole, -mycin, -cillin, etc.
  // Also: "Drug (Brand)" pattern
  const drugSuffixes = /\w+(statin|mab|pril|olol|azole|mycin|cillin|pam|zam|ide|ine|ol)\b/i;
  const drugBrand = /\w+\s*\([A-Z][a-zA-Z]+\)/; // Metformin (Glucophage)
  if (drugSuffixes.test(line) || drugBrand.test(line)) {
    return {
      type: 'drug',
      label: 'Drug / medication',
      confidence: 0.85,
      metadata: { name: line }
    };
  }

  // ── 5. LAB VALUE / NORMAL RANGE ────────────────────────────────────────────
  // Matches: "Na+ 136-145 mEq/L", "normal: 7.35-7.45", "WBC: 4,500-11,000"
  const labMatch = line.match(
    /(normal|range|value|level|reference)?:?\s*[\d,.]+\s*[-–]\s*[\d,.]+\s*([a-zA-Z/μ%]+)?/i
  );
  const labAbbrev = /\b(Na|K|Cl|BUN|Cr|HgB|Hct|WBC|RBC|Plt|pH|pO2|pCO2|HbA1c|INR|PTT)\b[+\-]?/;
  if ((labMatch && labMatch[1]) || labAbbrev.test(line)) {
    return {
      type: 'labvalue',
      label: 'Lab value / normal range',
      confidence: 0.87,
      metadata: { value: line }
    };
  }

  // ── 6. MNEMONIC / ACRONYM ──────────────────────────────────────────────────
  // Known mnemonics OR any all-caps word 3–8 letters
  const knownMnemonics = /\b(ADPIE|SBAR|SOAP|PMAT|PEMDAS|HOMES|RACE|PASS|ABCDE|SAMPLE|OPQRST|VINDICATE|MUDPILES|AEIOU-TIPS|RALES|RICE|RICE)\b/;
  const genericAcronym = /\b[A-Z]{3,8}\b/;
  if (knownMnemonics.test(line) || genericAcronym.test(line)) {
    const acronym = (line.match(knownMnemonics) || line.match(genericAcronym))?.[0] ?? '';
    return {
      type: 'mnemonic',
      label: 'Mnemonic / acronym',
      confidence: 0.82,
      metadata: { acronym }
    };
  }

  // ── 7. CLASSIFICATION ("Two types of X") ───────────────────────────────────
  // Matches: "Two types of", "Three goals for", "Four elements of", "5 stages"
  const classMatch = line.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|2|3|4|5|6|7|8|9|10)\s+(types?|kinds?|goals?|parts?|elements?|stages?|steps?|phases?|levels?|principles?|pillars?|aspects?)\s+(of|for|in|to)/i
  );
  if (classMatch) {
    // Gather the child lines (the actual items)
    const myDepth = getIndentDepth(allLines[lineIndex] ?? '');
    const childLines = allLines
      .slice(lineIndex + 1)
      .filter(l => l.trim())
      .filter(l => getIndentDepth(l) > myDepth)
      .map(l => l.trim().replace(/^[-*•◦▪■]\s*/, ''))
      .slice(0, 10);
    return {
      type: 'classification',
      label: `${classMatch[1]} ${classMatch[2]} detected`,
      confidence: 0.92,
      metadata: { count: classMatch[1], noun: classMatch[2], items: childLines }
    };
  }

  // ── 8. HIERARCHY / RANKING ─────────────────────────────────────────────────
  // Matches: "Maslow's hierarchy", "levels of consciousness", "taxonomy"
  if (/\b(hierarchy|levels?\s+of|pyramid|taxonomy|ranking|tiers?|strata)\b/i.test(line)) {
    return {
      type: 'hierarchy',
      label: 'Hierarchy / levels',
      confidence: 0.84,
      metadata: { subject: line }
    };
  }

  // ── 9. LEGAL CASE CITATION ─────────────────────────────────────────────────
  // Matches: "Smith v. Jones (1928)", "Re Polemis", "In re: Apple"
  if (/\bv\.\s+[A-Z]/.test(line) || /\bRe\s+[A-Z]/.test(line) || /\bIn\s+re:?\s+[A-Z]/i.test(line)) {
    return {
      type: 'case',
      label: 'Legal case citation',
      confidence: 0.93,
      metadata: { citation: line }
    };
  }

  // ── 10. IF → THEN RULE / THEOREM ───────────────────────────────────────────
  // Matches: "If discriminant < 0 →", "When X causes Y", "therefore..."
  if (/^(if|when|unless|whenever|given\s+that)\b/i.test(line) || /\btherefore\b/i.test(line)) {
    return {
      type: 'rule',
      label: 'Conditional rule / theorem',
      confidence: 0.8,
      metadata: { rule: line }
    };
  }

  // ── 11. DEFINITION (X = Y, X: Y, X — Y) ───────────────────────────────────
  if (/\s[=:—–]\s/.test(line)) {
    const [term, ...rest] = line.split(/\s[=:—–]\s/);
    return {
      type: 'definition',
      label: 'Term → definition',
      confidence: 0.88,
      metadata: { term: term.trim(), definition: rest.join(' ').trim() }
    };
  }

  // ── 12. BEFORE / AFTER / CAUSE / EFFECT COMPARISON ────────────────────────
  if (/^(before|after|pre-|post-)/i.test(line)) {
    const marker = /^(before|pre-)/i.test(line) ? 'before' : 'after';
    return {
      type: 'comparison',
      label: `${marker === 'before' ? 'Before' : 'After'} — contrast detected`,
      confidence: 0.85,
      metadata: { marker }
    };
  }
  if (/\b(leads?\s+to|causes?|results?\s+in|because|since|due\s+to)\b/i.test(line)) {
    return {
      type: 'comparison',
      label: 'Cause → Effect relationship',
      confidence: 0.78,
      metadata: { marker: 'cause' }
    };
  }

  // ── 13. DATE / HISTORICAL EVENT ────────────────────────────────────────────
  const dateMatch = line.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (dateMatch) {
    return {
      type: 'date',
      label: 'Date / historical event',
      confidence: 0.82,
      metadata: {
        year: dateMatch[1],
        event: line.replace(dateMatch[0], '').trim()
      }
    };
  }

  // ── 14. NESTED (deep indent — include parent context) ──────────────────────
  const myDepth = getIndentDepth(allLines[lineIndex] ?? '');
  if (myDepth >= 2) {
    const parentText = [...allLines]
      .slice(0, lineIndex)
      .reverse()
      .find(l => l.trim() && getIndentDepth(l) < myDepth)
      ?.trim() ?? '';
    return {
      type: 'nested',
      label: `Nested — ${myDepth} levels deep`,
      confidence: 0.75,
      metadata: { depth: myDepth, parentText }
    };
  }

  // ── 15. KEY TERM (standalone term with siblings) ───────────────────────────
  const siblings = allLines
    .filter((l, i) => i !== lineIndex && Math.abs(i - lineIndex) <= 3 && l.trim())
    .map(l => l.trim().replace(/^[-*•◦▪■]\s*/, ''))
    .filter(Boolean)
    .slice(0, 5);
  if (siblings.length > 0 && line.split(' ').length <= 5) {
    return {
      type: 'key-term',
      label: 'Standalone key term',
      confidence: 0.65,
      metadata: { term: line, siblings }
    };
  }

  // ── 16. PLAIN FALLBACK ─────────────────────────────────────────────────────
  return {
    type: 'plain',
    label: 'Quick flashcard',
    confidence: 1,
    metadata: {}
  };
}

function getIndentDepth(line: string): number {
  const match = line.match(/^(\s*)/);
  return Math.floor((match?.[1].length ?? 0) / 2);
}
```

### 3.3 Action Builder — Context → Card Options

**File: `src/utils/paletteActions.ts` (NEW)**

```typescript
export interface PaletteAction {
  id: string;
  isPrimary?: boolean;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  type: 'flashcard' | 'batch' | 'format' | 'expand';
  // For 'flashcard': the pre-filled front and back
  front?: string;
  back?: string;
  // For 'batch': array of card pairs
  cards?: Array<{ front: string; back: string }>;
  // For 'format': the markdown snippet to inject
  snippet?: string;
}

export function buildActions(ctx: LineContext, rawLine: string): PaletteAction[] {
  const line = rawLine.replace(/::/g, '').trim();

  switch (ctx.type) {

    case 'scripture': {
      const ref = ctx.metadata.full as string;
      const book = ctx.metadata.book as string;
      return [
        {
          id: 'scripture-topic', isPrimary: true,
          icon: '✝', iconBg: 'rgba(139,92,246,0.15)',
          title: 'Verse → topic card',
          subtitle: `"What does ${ref} address?" — fill in the topic`,
          type: 'flashcard',
          front: `What topic does ${ref} address?`,
          back: `[describe the topic from your notes]`
        },
        {
          id: 'scripture-recall',
          icon: '✝', iconBg: 'rgba(139,92,246,0.15)',
          title: 'Reference recall card',
          subtitle: `"Where is the passage about X?" → ${ref}`,
          type: 'flashcard',
          front: `Where is the main passage about [topic]?`,
          back: ref
        },
        {
          id: 'scripture-batch',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Batch: one card per sub-theme',
          subtitle: 'Generates cards from each child bullet under this reference',
          type: 'batch',
          cards: buildScriptureBatch(line, ctx)
        },
      ];
    }

    case 'etymology': {
      const lang = ctx.metadata.language as string;
      const word = ctx.metadata.word as string;
      return [
        {
          id: 'etym-meaning', isPrimary: true,
          icon: 'α', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Etymology flashcard',
          subtitle: `"What does '${word}' mean in ${lang}?"`,
          type: 'flashcard',
          front: `What does the ${lang} word '${word}' mean?`,
          back: line.replace(new RegExp(`.*${word}`, 'i'), '').trim() || `[enter meaning]`
        },
        {
          id: 'etym-reverse',
          icon: 'α', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Reverse: English → original word',
          subtitle: `"What is the ${lang} origin of [term]?" → ${word}`,
          type: 'flashcard',
          front: `What is the ${lang} origin of [the English term]?`,
          back: `'${word}' — ${lang} for [meaning]`
        },
      ];
    }

    case 'formula': {
      const isChemical = line.includes('→');
      return [
        {
          id: 'formula-recall', isPrimary: true,
          icon: '∑', iconBg: 'rgba(234,179,8,0.15)',
          title: isChemical ? 'Equation recall card' : 'Formula recall card',
          subtitle: `Front: "State the formula" · Back: the full expression`,
          type: 'flashcard',
          front: isChemical ? `Write the balanced equation for [reaction].` : `State the formula for [concept].`,
          back: line
        },
        {
          id: 'formula-when',
          icon: '∑', iconBg: 'rgba(234,179,8,0.15)',
          title: 'When-to-use card',
          subtitle: `"When do you apply this formula/equation?"`,
          type: 'flashcard',
          front: `When do you use: ${line.substring(0, 40)}...`,
          back: `[describe the condition or context]`
        },
        {
          id: 'formula-parts',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Component definition card',
          subtitle: 'One card asking what each variable/component means',
          type: 'flashcard',
          front: `In the expression "${line}", what does each variable represent?`,
          back: `[define each component]`
        },
      ];
    }

    case 'drug': {
      return [
        {
          id: 'drug-full', isPrimary: true,
          icon: 'Rx', iconBg: 'rgba(16,185,129,0.12)',
          title: 'Full drug profile card',
          subtitle: 'Class · Indication · Key side effects · Nursing considerations',
          type: 'flashcard',
          front: `${line} — class, indication, key side effect, nursing consideration?`,
          back: `Class: [drug class]\nIndication: [what it treats]\nKey SE: [main side effect]\nNursing: [key consideration]`
        },
        {
          id: 'drug-mechanism',
          icon: 'Rx', iconBg: 'rgba(16,185,129,0.12)',
          title: 'Mechanism of action card',
          subtitle: `"How does ${line} work?"`,
          type: 'flashcard',
          front: `How does ${line} work (mechanism of action)?`,
          back: `[describe mechanism]`
        },
        {
          id: 'drug-safety',
          icon: '⚠', iconBg: 'rgba(234,179,8,0.15)',
          title: 'Safety / contraindication card',
          subtitle: `"What is the main contraindication for ${line}?"`,
          type: 'flashcard',
          front: `What is the primary contraindication for ${line}?`,
          back: `[key contraindication and reason]`
        },
      ];
    }

    case 'labvalue': {
      return [
        {
          id: 'lab-range', isPrimary: true,
          icon: '⚗', iconBg: 'rgba(132,204,22,0.12)',
          title: 'Normal range card',
          subtitle: `Front: "Normal [value]?" · Back: range + clinical significance`,
          type: 'flashcard',
          front: `What is the normal range for ${line.split(/[\d]/)[0].trim()}?`,
          back: `${line}\n[High = ?; Low = ?]`
        },
        {
          id: 'lab-critical',
          icon: '⚗', iconBg: 'rgba(239,68,68,0.12)',
          title: 'Critical value card',
          subtitle: 'Levels that require immediate provider notification',
          type: 'flashcard',
          front: `What is the critical value for ${line.split(/[\d]/)[0].trim()} requiring immediate action?`,
          back: `[critical high] or [critical low] — requires immediate provider notification`
        },
      ];
    }

    case 'mnemonic': {
      const acronym = ctx.metadata.acronym as string;
      return [
        {
          id: 'mnemonic-expand', isPrimary: true,
          icon: 'A→', iconBg: 'rgba(236,72,153,0.12)',
          title: 'Expand the full mnemonic',
          subtitle: `Front: "What does ${acronym} stand for?" · Back: full expansion`,
          type: 'flashcard',
          front: `What does ${acronym} stand for?`,
          back: `[expand each letter]`
        },
        {
          id: 'mnemonic-batch',
          icon: 'A→', iconBg: 'rgba(236,72,153,0.12)',
          title: `Batch: one card per letter (${acronym.length} cards)`,
          subtitle: 'Each letter gets its own definition card',
          type: 'batch',
          cards: acronym.split('').map(letter => ({
            front: `${letter} in ${acronym}?`,
            back: `[what ${letter} stands for]`
          }))
        },
      ];
    }

    case 'classification': {
      const items = ctx.metadata.items as string[];
      const noun = ctx.metadata.noun as string;
      return [
        {
          id: 'class-all', isPrimary: true,
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: `Name all ${ctx.metadata.count} ${noun}`,
          subtitle: `Front: "What are the ${ctx.metadata.count} ${noun} of [topic]?" · Back: all items`,
          type: 'flashcard',
          front: `What are the ${ctx.metadata.count} ${noun} of [topic]?`,
          back: items.length > 0 ? items.map((item, i) => `${i+1}. ${item}`).join('\n') : `[list the ${noun}]`
        },
        {
          id: 'class-batch',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: `Batch: one card per ${noun.replace(/s$/, '')}`,
          subtitle: `Creates ${items.length || '?'} individual definition cards`,
          type: 'batch',
          cards: items.map(item => ({
            front: `What is ${item}?`,
            back: `[define ${item}]`
          }))
        },
        {
          id: 'class-table',
          icon: '⊞', iconBg: 'rgba(148,163,184,0.12)',
          title: `Format as structured table`,
          subtitle: 'Inserts a markdown comparison table for all items',
          type: 'format',
          snippet: `| ${noun.charAt(0).toUpperCase()+noun.slice(1)} | Description |\n| --- | --- |\n${items.map(i => `| ${i} | |`).join('\n')}`
        },
      ];
    }

    case 'case': {
      const citation = ctx.metadata.citation as string;
      return [
        {
          id: 'case-rule', isPrimary: true,
          icon: '⚖', iconBg: 'rgba(239,68,68,0.12)',
          title: 'Case brief card',
          subtitle: 'Facts → Issue → Holding → Rule of Law',
          type: 'flashcard',
          front: `${citation} — what rule of law does it establish?`,
          back: `Rule: [state the rule]\nFacts: [brief facts]\nHolding: [outcome]`
        },
        {
          id: 'case-holding',
          icon: '⚖', iconBg: 'rgba(239,68,68,0.12)',
          title: 'Holding-only card',
          subtitle: 'One-line holding for quick recall',
          type: 'flashcard',
          front: `What was the holding in ${citation}?`,
          back: `[one-sentence holding]`
        },
      ];
    }

    case 'comparison': {
      const marker = ctx.metadata.marker as string;
      return [
        {
          id: 'comp-contrast', isPrimary: true,
          icon: '⇄', iconBg: 'rgba(16,185,129,0.12)',
          title: 'Contrast card',
          subtitle: marker === 'cause' ? '"What does X cause/lead to?"' : `"How did things change before/after?"`,
          type: 'flashcard',
          front: marker === 'cause' ? `What causes/results in [outcome]?` : `How did [topic] change before vs. after [event]?`,
          back: `[describe the contrast or change]`
        },
        {
          id: 'comp-table',
          icon: '⊞', iconBg: 'rgba(148,163,184,0.12)',
          title: 'Format as comparison table',
          subtitle: 'Inserts a two-column Before/After or Cause/Effect table',
          type: 'format',
          snippet: marker === 'cause'
            ? '| Cause | Effect |\n| --- | --- |\n| | |'
            : '| | Before | After |\n| --- | --- | --- |\n| | | |'
        },
      ];
    }

    case 'date': {
      const year = ctx.metadata.year as string;
      const event = ctx.metadata.event as string;
      return [
        {
          id: 'date-when', isPrimary: true,
          icon: '📅', iconBg: 'rgba(234,179,8,0.15)',
          title: 'When → What card',
          subtitle: `"What happened in ${year}?" → ${event || 'the event'}`,
          type: 'flashcard',
          front: `What happened in ${year}?`,
          back: event || line
        },
        {
          id: 'date-what',
          icon: '📅', iconBg: 'rgba(234,179,8,0.15)',
          title: 'What → When card',
          subtitle: `"When was ${event || 'this event'}?" → ${year}`,
          type: 'flashcard',
          front: `When was: ${event || line}?`,
          back: year
        },
        {
          id: 'date-timeline',
          icon: '⊞', iconBg: 'rgba(148,163,184,0.12)',
          title: 'Add to timeline block',
          subtitle: 'Groups nearby date lines into a structured timeline table',
          type: 'format',
          snippet: `| Year | Event |\n| --- | --- |\n| ${year} | ${event} |\n| | |`
        },
      ];
    }

    case 'nested': {
      const parentText = ctx.metadata.parentText as string;
      return [
        {
          id: 'nested-ctx', isPrimary: true,
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Card with full parent context',
          subtitle: parentText
            ? `Front includes: "Under [${parentText.substring(0,30)}]..."`
            : 'Front includes parent topic for clarity',
          type: 'flashcard',
          front: parentText ? `Under ${parentText} — ${line}?` : line,
          back: `[answer or definition]`
        },
        {
          id: 'nested-batch',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Batch all items in this section',
          subtitle: 'Creates one card for every bullet in this indented block',
          type: 'batch',
          cards: [] // populated at call time from the actual lines
        },
      ];
    }

    case 'definition': {
      const term = ctx.metadata.term as string;
      const def = ctx.metadata.definition as string;
      return [
        {
          id: 'def-card', isPrimary: true,
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Term → Definition card',
          subtitle: `Front: "What is ${term}?" · Back: the definition`,
          type: 'flashcard',
          front: `What is ${term}?`,
          back: def
        },
        {
          id: 'def-reverse',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Reverse: Definition → Term',
          subtitle: `Front: the definition · Back: "${term}"`,
          type: 'flashcard',
          front: def,
          back: term
        },
        {
          id: 'def-batch',
          icon: '⬡', iconBg: 'rgba(59,130,246,0.12)',
          title: 'Batch all terms in this list',
          subtitle: 'Create definition cards for every term at this indent level',
          type: 'batch',
          cards: []
        },
      ];
    }

    default: {
      return [
        {
          id: 'plain', isPrimary: true,
          icon: '✎', iconBg: 'rgba(148,163,184,0.12)',
          title: 'Quick flashcard',
          subtitle: 'Type the front and back manually',
          type: 'flashcard',
          front: line,
          back: ''
        },
      ];
    }
  }
}

function buildScriptureBatch(line: string, ctx: LineContext): Array<{front: string; back: string}> {
  // Returns placeholder cards — populated at runtime from actual child lines
  return [
    { front: `What is the identity of the apologist? (${ctx.metadata.full})`, back: '[from your notes]' },
    { front: `What is the attitude of the apologist? (${ctx.metadata.full})`, back: '[from your notes]' },
    { front: `What is the speech of the apologist? (${ctx.metadata.full})`, back: '[from your notes]' },
  ];
}
```

### 3.4 Batch Card Generation

The most powerful action for notes like theology outlines, biology processes, and law elements:

**File: `src/utils/batchCardGen.ts` (NEW)**

```typescript
export function extractBatchCards(
  allLines: string[],
  anchorLineIndex: number
): Array<{ front: string; back: string }> {
  const anchorDepth = getIndentDepth(allLines[anchorLineIndex]);
  const anchorText = allLines[anchorLineIndex].trim().replace(/^[-*•◦▪■]\s*/, '');
  const cards: Array<{ front: string; back: string }> = [];

  for (let i = anchorLineIndex + 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (!line.trim()) continue;

    const depth = getIndentDepth(line);
    if (depth <= anchorDepth) break; // left the block

    if (depth === anchorDepth + 1) {
      const clean = line.trim().replace(/^[-*•◦▪■]\s*/, '');

      // If the child line itself has :: — use it verbatim
      if (clean.includes('::')) {
        const [front, back] = clean.split('::').map(s => s.trim());
        cards.push({ front, back });
        continue;
      }

      // If the child has a definition pattern
      if (/\s[=:—–]\s/.test(clean)) {
        const [term, def] = clean.split(/\s[=:—–]\s/);
        cards.push({ front: `What is ${term.trim()}?`, back: def.trim() });
        continue;
      }

      // Otherwise generate contextual front from parent
      cards.push({
        front: `Under ${anchorText} — what is "${clean}"?`,
        back: '' // left blank for user to fill, or AI to complete
      });
    }
  }

  return cards;
}
```

### 3.5 SmartColonPalette Component

**File: `src/components/notes/SmartColonPalette.tsx` (NEW)**

```tsx
import { useEffect, useState } from 'react';
import { LineContext } from '../../utils/lineContext';
import { PaletteAction, buildActions } from '../../utils/paletteActions';
import Icon from '../ui/Icon';

interface Props {
  context: LineContext;
  currentLine: string;
  onSelect: (action: PaletteAction) => void;
  onDismiss: () => void;
}

export default function SmartColonPalette({ context, currentLine, onSelect, onDismiss }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const actions = buildActions(context, currentLine);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onDismiss(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i+1, actions.length-1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i-1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); onSelect(actions[selectedIndex]); }
      // Number shortcuts: 1, 2, 3 for first three actions
      if (['1','2','3'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (actions[idx]) { e.preventDefault(); onSelect(actions[idx]); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, selectedIndex, onSelect, onDismiss]);

  const contextColors: Record<string, string> = {
    scripture:      'rgba(139,92,246,0.2)',
    etymology:      'rgba(59,130,246,0.15)',
    formula:        'rgba(234,179,8,0.2)',
    drug:           'rgba(16,185,129,0.15)',
    labvalue:       'rgba(132,204,22,0.15)',
    mnemonic:       'rgba(236,72,153,0.15)',
    classification: 'rgba(59,130,246,0.15)',
    hierarchy:      'rgba(59,130,246,0.15)',
    case:           'rgba(239,68,68,0.15)',
    definition:     'rgba(59,130,246,0.15)',
    comparison:     'rgba(16,185,129,0.15)',
    date:           'rgba(234,179,8,0.2)',
    nested:         'rgba(148,163,184,0.12)',
    'key-term':     'rgba(148,163,184,0.12)',
    plain:          'rgba(148,163,184,0.08)',
  };

  return (
    <div className="smart-palette">
      <div
        className="smart-palette-header"
        style={{ background: contextColors[context.type] ?? 'transparent' }}
      >
        <span className="smart-palette-label">{context.label}</span>
        <span className="smart-palette-hint">↑↓ navigate · Enter select · 1–3 shortcut</span>
      </div>

      <div className="smart-palette-actions">
        {actions.map((action, i) => (
          <button
            key={action.id}
            className={`smart-palette-item ${i === selectedIndex ? 'is-selected' : ''} ${action.isPrimary ? 'is-primary' : ''}`}
            onClick={() => onSelect(action)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="spi-icon" style={{ background: action.iconBg }}>
              {action.icon}
            </span>
            <span className="spi-content">
              <span className="spi-title">{action.title}</span>
              <span className="spi-sub">{action.subtitle}</span>
            </span>
            {i < 3 && <span className="spi-shortcut">{i + 1}</span>}
          </button>
        ))}
      </div>

      <div className="smart-palette-footer">
        <button className="smart-palette-plain" onClick={() => onSelect(actions[actions.length - 1])}>
          Plain card — type it manually
        </button>
        <button className="smart-palette-dismiss" onClick={onDismiss}>Esc</button>
      </div>
    </div>
  );
}
```

### 3.6 Wiring into NoteEditor

**File: `src/components/notes/NoteEditor.tsx` — add to `handleKeyDown`**

```typescript
// Add these state vars to NoteEditor:
const [showSmartPalette, setShowSmartPalette] = useState(false);
const [smartPaletteContext, setSmartPaletteContext] = useState<LineContext | null>(null);
const [smartPaletteLine, setSmartPaletteLine] = useState('');

// In handleKeyDown, add BEFORE the slash menu check:
if (e.key === ':') {
  const beforeCursor = value.slice(0, selectionStart);
  if (beforeCursor.endsWith(':')) {
    e.preventDefault();

    const { line, lineStart } = getCurrentLine(value, selectionStart - 1);
    const cleanLine = line.replace(/::?\s*$/, '').trim();
    const allLines = value.split('\n');
    const lineIndex = value.slice(0, lineStart).split('\n').length - 1;

    // Remove the first colon from text (user typed the second one)
    const textWithoutColon = value.slice(0, selectionStart - 1) + value.slice(selectionStart);
    setText(textWithoutColon);

    const ctx = classifyLine(cleanLine, allLines, lineIndex);
    setSmartPaletteContext(ctx);
    setSmartPaletteLine(cleanLine);
    setShowSmartPalette(true);
    bump('smartColonUsed'); // progressive reveal tracking
    return;
  }
}
```

### 3.7 Handling the Selected Action

```typescript
function handlePaletteAction(action: PaletteAction) {
  setShowSmartPalette(false);

  if (action.type === 'flashcard') {
    // Open card editor pre-filled with front/back
    openCardEditor({ front: action.front ?? '', back: action.back ?? '' });
    bump('flashcardsCreated');

  } else if (action.type === 'batch') {
    // If cards array is empty, generate from actual lines
    const cards = action.cards?.length
      ? action.cards
      : extractBatchCards(text.split('\n'), currentLineIndex);
    openBatchCardEditor(cards);
    bump('flashcardsCreated', cards.length);

  } else if (action.type === 'format' && action.snippet) {
    // Insert formatting snippet at current cursor position
    const { selectionStart: pos } = textareaRef.current!;
    const next = text.slice(0, pos) + '\n' + action.snippet + '\n' + text.slice(pos);
    setText(next);
  }
}
```

### 3.8 Subject Pattern Reference Table

This is the complete lookup table of what the classifier detects and which subjects it helps:

| Pattern | Example Line | Subjects | Card Types Generated |
|---|---|---|---|
| Scripture reference | `1 Peter 3:8-16` | Bible, Theology | Verse→Topic, Topic→Ref, Batch by sub-theme |
| Greek/Hebrew etymology | `Greek word: apologia` | Bible, Classics, Linguistics | Meaning card, Reverse card |
| Math formula | `x = (−b ± √(b²−4ac)) / 2a` | Math, Physics, Engineering | Recall, When-to-use, Component definition |
| Chemical equation | `6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂` | Chemistry, Biology | Equation recall, Reactants vs Products |
| If→Then rule | `If discriminant < 0 → no real solutions` | Math, Logic, Law | Conditional card, Batch all cases |
| Drug name | `Metformin (Glucophage)` | Nursing, Pharmacology | Full profile, Mechanism, Safety/contraindication |
| Lab value | `Normal Na+ 136–145 mEq/L` | Nursing, Medicine | Normal range, Critical value |
| Mnemonic/Acronym | `ADPIE nursing process` | Nursing, Any subject | Full expansion, Batch per letter |
| "Two types of X" | `Two types of apologetics` | Any subject | All-items card, Batch one per item, Table |
| Hierarchy | `Maslow's hierarchy — 5 levels` | Psychology, Biology | Order card, Batch per level |
| Case citation | `Palsgraf v. Long Island RR (1928)` | Law | Brief card, Holding card |
| Term→Definition | `Apologetics = knowing and defending belief` | Any subject | Term→Def, Def→Term, Batch siblings |
| Before/After | `Before WW1 man has faith in society` | History, Literature | Contrast card, Comparison table |
| Cause→Effect | `Darwinism leads to pluralism` | History, Science | Cause→Effect card, Effect→Cause |
| Date/Event | `1914–18 World War I` | History, Bible History | When→What, What→When, Timeline block |
| Nested (deep indent) | `(4 levels deep) monarchs rule by divine right` | Any subject | Card with parent context, Batch block |
| Standalone key term | `Absolutism` | Any subject | Define this term, Compare siblings |
| Plain text | Any line | Any subject | Standard Q&A card |

### 3.9 Smart Paste — Import Existing Notes

When a user pastes a block of indented bullet-point notes (like the classroom notes in the images), a banner appears:

```
✦ Detected structured notes — would you like to auto-generate flashcards from this content?
[Generate Cards from Paste]  [No thanks, just paste]
```

**File: `src/utils/smartPaste.ts` (NEW)**

```typescript
export function analyzeClipboard(text: string): {
  isStructured: boolean;
  estimatedCards: number;
  detectedSubject: string | null;
} {
  const lines = text.split('\n').filter(l => l.trim());
  const indentedLines = lines.filter(l => /^\s+/.test(l));
  const isStructured = indentedLines.length / lines.length > 0.3 && lines.length > 4;

  // Quick subject detection for the banner message
  const hasScripture = /\b\d?\s?[A-Z][a-z]+\s+\d+:\d+/i.test(text);
  const hasDrugs = /\b\w+(statin|mab|pril|olol|azole)\b/i.test(text);
  const hasMath = /[=±√∑∫]/.test(text);
  const hasLab = /\b(Na|K|WBC|Hgb|pH)\b/.test(text);

  const detectedSubject = hasScripture ? 'Bible/Theology'
    : hasDrugs ? 'Nursing/Pharmacology'
    : hasMath ? 'Mathematics'
    : hasLab ? 'Medicine/Nursing'
    : null;

  // Estimate card count from definition patterns
  const estimatedCards = lines.filter(l =>
    /\s[=:—–]\s/.test(l) ||
    /\b\d?\s?[A-Z][a-z]+\s+\d+:\d+/i.test(l) ||
    /\b[A-Z]{3,8}\b/.test(l)
  ).length;

  return { isStructured, estimatedCards, detectedSubject };
}
```

---

## Phase 4 — Omni-Capture System

### Goal: Capture anything from anywhere without context switching.

### 4.1 Global Quick-Capture Overlay

**File: `src-tauri/src/commands/global_hotkey.rs` (NEW)**

```rust
pub fn register_global_shortcuts(app: &tauri::App) -> anyhow::Result<()> {
    // Cmd/Ctrl + Shift + Space → floating capture pill
    app.global_shortcut().on_shortcut("CommandOrControl+Shift+Space", |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            show_or_create_capture_window(app);
        }
    })?;

    // Cmd/Ctrl + Shift + V → voice capture
    app.global_shortcut().on_shortcut("CommandOrControl+Shift+V", |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            invoke_voice_capture(app);
        }
    })?;

    Ok(())
}
```

**Capture overlay design — floating pill:**

```tsx
// src/capture.tsx (NEW)
export default function CaptureOverlay() {
  return (
    <div className="capture-pill">
      <span className="capture-icon">✦</span>
      <input
        autoFocus
        placeholder="Capture a thought... (#tag to route)"
        onKeyDown={e => {
          if (e.key === 'Enter') submitCapture(e.currentTarget.value);
          if (e.key === 'Escape') closeWindow();
        }}
      />
      <span className="capture-hint">↵ save · Esc dismiss</span>
    </div>
  );
}
```

### 4.2 System Tray Dropzone

Files, images, and selected text dragged onto the Kura tray icon are automatically appended to the Inbox note as a new line.

### 4.3 Quick Capture Rust Command

```rust
#[tauri::command]
pub async fn quick_capture(
    app: tauri::AppHandle,
    content: String,
    tag: Option<String>
) -> Result<(), String> {
    let conn = storage::db::get_conn(&app).map_err(|e| e.to_string())?;

    // Find inbox folder (or create it)
    let folder_id = find_or_create_inbox(&conn, tag.as_deref())?;

    // Append to today's capture note or create one
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let title = format!("Captures {}", today);

    conn.execute(
        "INSERT INTO notes (folder_id, title, raw_content)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(folder_id, title) DO UPDATE
         SET raw_content = raw_content || '\n- ' || ?3",
        rusqlite::params![folder_id, title, content],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
```

---

## Phase 5 — The Flashcard Ecosystem

### Goal: Flashcards are not a separate app — they are a living layer on top of every note.

### 5.1 FlashcardBuilder Redesign

The correct UX flow is now:
1. **Source panel** — current note with detected `::` lines highlighted
2. **Smart palette trigger** — select any line and `::` to get context-aware options
3. **Card draft** — pre-filled from context engine
4. **Deck assignment** — defaults to current class deck
5. **Batch queue** — multiple cards staged and saved together

**Key keyboard shortcuts:**
- `Cmd+Enter` — save card and clear for next
- `Tab` — jump to Back field from Front
- `Esc` — dismiss without saving

### 5.2 CardReview — Full Redesign

```tsx
export default function CardReview({ classId }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!flipped) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(true); }
        return;
      }
      // Arrow keys and number keys for rating
      if (e.key === '1' || e.key === 'ArrowLeft')  handleReview('forgot');
      if (e.key === '2')                             handleReview('hard');
      if (e.key === '3' || e.key === 'ArrowRight')  handleReview('easy');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped]);
  // ...
}
```

**Card flip CSS — 3D rotation with exit animations:**

```css
.review-card { transform-style: preserve-3d; transition: transform 320ms cubic-bezier(0.4,0,0.2,1); }
.review-card.is-flipped { transform: rotateY(180deg); }
.review-card.exit-left  { animation: exitLeft 220ms ease forwards; }
.review-card.exit-right { animation: exitRight 220ms ease forwards; }
@keyframes exitLeft  { to { transform: translateX(-120%) rotate(-8deg); opacity: 0; } }
@keyframes exitRight { to { transform: translateX(120%) rotate(8deg); opacity: 0; } }
```

### 5.3 Confidence Heatmap Overlay

**File: `src/components/notes/HighlightLayer.tsx` (NEW)**

Words and phrases that have flashcards sourced from them are underlined in a color matching their confidence:
- Red underline → card in learning state (ease < 1.8)
- Orange underline → card shaky (ease 1.8–2.3)
- Green underline → card known (ease > 2.3)

The note becomes a live mastery heatmap — students can see exactly which parts of their notes they don't know yet.

---

## Phase 6 — Study Mode & AI Synthesis

### Goal: One click turns raw lecture notes into a publication-quality study document.

### 6.1 SynthesizeButton

```tsx
type SynthState = 'idle' | 'loading' | 'done' | 'error';

export default function SynthesizeButton({ noteId, onComplete }: Props) {
  const [state, setSynthState] = useState<SynthState>('idle');

  async function handleSynthesize() {
    if (!noteId || state === 'loading') return;
    setSynthState('loading');
    try {
      await invoke('synthesize_note', { noteId });
      setSynthState('done');
      onComplete?.();
      setTimeout(() => setSynthState('idle'), 3000);
    } catch {
      setSynthState('error');
      setTimeout(() => setSynthState('idle'), 2000);
    }
  }

  return (
    <button
      className={`btn-primary synth-btn synth-${state}`}
      disabled={!noteId || state === 'loading'}
      onClick={handleSynthesize}
    >
      <Icon name="sparkles" size={13} className={state === 'loading' ? 'spinning' : ''} />
      {{ idle: 'Synthesize', loading: 'Thinking...', done: 'Done ✓', error: 'Retry' }[state]}
    </button>
  );
}
```

### 6.2 AI Prompts

**File: `src-tauri/src/ai/prompts.rs`**

```rust
pub fn synthesize_prompt(raw_notes: &str, transcript: &str) -> String {
    format!(
        "You are a precise academic note formatter. \
         Convert the following raw notes into a clean, textbook-quality Markdown study guide. \
         Use ONLY: ## headers, bullet points, and **bold** for key terms. \
         Do not add information not present in the source. \
         Do not use tables, code blocks, or horizontal rules unless they were in the source.\n\n\
         RAW NOTES:\n{raw_notes}\n\n\
         VOICE TRANSCRIPT:\n{transcript}"
    )
}

pub fn flashcard_gen_prompt(subject: &str, covered: &[String], source: &str) -> String {
    let skip = covered.join(", ");
    format!(
        "Subject: {subject}. Skip these already-covered topics: [{skip}]. \
         Extract atomic testable facts from the source. \
         Output JSON only: [{{\"front\": string, \"back\": string, \"topic_tag\": string}}]\n\n\
         SOURCE:\n{source}"
    )
}
```

### 6.3 StudyPanel Markdown Styles

```css
.study-content h2 { font-size: 22px; font-weight: 600; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; }
.study-content p  { font-family: var(--font-note); font-size: 15px; line-height: 1.85; }
.study-content strong { color: var(--color-accent-bright); background: var(--color-accent-glow); padding: 1px 4px; border-radius: 3px; }
.study-content ul li::marker { color: var(--color-accent); }
```

---

## Phase 7 — The Scheduler & Exam Engine

### Goal: The app automatically knows what you need to study today to pass your exam.

### 7.1 SM-2 Algorithm (Complete)

**File: `src-tauri/src/storage/cards.rs`**

```rust
use chrono::{Duration, Local};

pub fn update_sm2(conn: &Connection, card_id: i64, result: ReviewResult, days_until_exam: Option<i64>) -> anyhow::Result<()> {
    let (mut ease, mut interval, mut reps): (f64, i64, i64) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        [card_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    )?;

    match result {
        ReviewResult::Easy   => { ease = (ease + 0.1).min(3.0); interval = ((interval as f64 * ease).round() as i64).max(1); reps += 1; }
        ReviewResult::Hard   => { ease = (ease - 0.15).max(1.3); interval = ((interval as f64 * 0.8).round() as i64).max(1); reps += 1; }
        ReviewResult::Forgot => { ease = (ease - 0.2).max(1.3); interval = 1; reps = 0; }
    }

    // Exam compression: never schedule beyond (days_until_exam / 3)
    if let Some(days) = days_until_exam {
        interval = interval.min((days / 3).max(1));
    }

    let next_review = (Local::now() + Duration::days(interval)).format("%Y-%m-%d").to_string();
    conn.execute(
        "UPDATE cards SET ease_factor=?1, interval=?2, repetitions=?3, next_review=?4 WHERE id=?5",
        rusqlite::params![ease, interval, reps, next_review, card_id],
    )?;
    Ok(())
}
```

### 7.2 Exam Calendar + Daily Plan Components

**File: `src/components/scheduler/ExamCalendar.tsx` (NEW)**
**File: `src/components/scheduler/StudyPlan.tsx` (NEW)**

```tsx
// Daily plan widget
export default function StudyPlan({ classId }) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const pct = plan ? Math.min(100, (plan.cardsDue / plan.dailyQuota) * 100) : 0;

  return (
    <div className="study-plan">
      <div className="sp-header">
        <span>Today</span>
        <span className={plan?.onTrack ? 'on-track' : 'behind'}>
          {plan?.onTrack ? '✓ On track' : '⚠ Behind'}
        </span>
      </div>
      <div className="sp-bar"><div className="sp-fill" style={{ width: `${pct}%` }} /></div>
      <div className="sp-stats">
        <span><strong>{plan?.cardsDue ?? 0}</strong> due</span>
        <span><strong>{plan?.daysUntilExam ?? '–'}</strong> days to exam</span>
      </div>
    </div>
  );
}
```

---

## Phase 8 — Command Palette & Power-User Layer

### Goal: Every action in the app is reachable with keyboard alone.

### 8.1 Command Palette

**File: `src/components/ui/CommandPalette.tsx` (NEW)**

Global `Cmd+K` / `Ctrl+K` opens a Spotlight-style palette. Results include: all notes (fuzzy search), all modes, all AI commands, formatting actions.

### 8.2 Full Keyboard Shortcut Map

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open command palette |
| `Cmd+N` | New note |
| `Cmd+1` | Focus mode |
| `Cmd+2` | Study mode |
| `Cmd+3` | Organize mode |
| `Cmd+R` | Start card review |
| `Cmd+Shift+F` | Toggle flashcard builder |
| `Cmd+Shift+Space` | Global quick capture (anywhere on computer) |
| `Cmd+Shift+V` | Global voice capture |
| `::` | Smart context palette |
| `/` on blank line | Slash command menu |
| `[[` | Wikilink picker |
| `Tab` | Indent selection |
| `Shift+Tab` | Outdent selection |

### 8.3 Command Registry

```typescript
const commands: Command[] = [
  { id: 'new-note',       label: 'New Note',               category: 'Note',      shortcut: '⌘N', icon: 'note',       action: handleCreateNote },
  { id: 'mode-focus',     label: 'Focus Mode',             category: 'Mode',      shortcut: '⌘1', icon: 'focus',      action: () => setAppMode('focus') },
  { id: 'mode-study',     label: 'Study Mode',             category: 'Mode',      shortcut: '⌘2', icon: 'study',      action: () => setAppMode('study') },
  { id: 'mode-organize',  label: 'Organize Mode',          category: 'Mode',      shortcut: '⌘3', icon: 'organize',   action: () => setAppMode('organize') },
  { id: 'review',         label: 'Start Card Review',      category: 'Flashcard', shortcut: '⌘R', icon: 'flashcards', action: startReview },
  { id: 'synthesize',     label: 'Synthesize Note with AI',category: 'AI',                        icon: 'sparkles',   action: triggerSynthesize },
  { id: 'flashcards',     label: 'Flashcard Builder',      category: 'Flashcard',                 icon: 'flashcards', action: () => setRightPanel('flashcards') },
  // Dynamic note search results appended at query time
];
```

---

## Phase 9 — Canvas & Spatial Organization

### Goal: Students think spatially. The canvas should feel like a real desk.

### 9.1 Canvas Enhancements

Additions to `FolderCanvas.tsx`:

```typescript
// Lasso selection — drag to draw a selection box
function startLasso(e: PointerEvent) {
  setLassoStart({ x: e.clientX, y: e.clientY });
}
function endLasso() {
  const selected = filtered.filter(note => {
    const pos = getNoteLayout(note.id);
    return isInsideLasso(pos, lassoStart!, lassoEnd!);
  });
  setSelectedNoteIds(selected.map(n => n.id));
}

// Auto-arrange using grid algorithm
function autoArrange() {
  const COLS = Math.ceil(Math.sqrt(filtered.length));
  const next: Record<number, NoteLayout> = {};
  filtered.forEach((note, i) => {
    next[note.id] = {
      x: 24 + (i % COLS) * 220,
      y: 24 + Math.floor(i / COLS) * 160,
      width: 200, height: 140
    };
  });
  setLayout(next);
}

// Note age color tinting
function getNoteAgeColor(updatedAt: string): string {
  const hours = (Date.now() - new Date(updatedAt).getTime()) / 3600000;
  if (hours < 1)   return 'rgba(76,175,130,0.2)';  // Just edited — green
  if (hours < 24)  return 'rgba(111,126,168,0.15)'; // Today — accent
  if (hours < 168) return 'rgba(255,255,255,0.04)'; // This week — normal
  return 'rgba(255,255,255,0.02)';                  // Old — dimmed
}
```

---

## Phase 10 — Voice & Audio Pipeline

### Goal: Students can take voice notes without ever touching the keyboard.

### 10.1 VoiceBar Component

**File: `src/components/audio/VoiceBar.tsx` (NEW)**

```tsx
type RecordingState = 'idle' | 'recording' | 'processing';

export default function VoiceBar() {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);

  async function toggle() {
    if (state === 'idle') { await invoke('start_recording'); setState('recording'); }
    else if (state === 'recording') { setState('processing'); await invoke('stop_recording'); setState('idle'); }
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className={`voice-bar voice-${state}`}>
      <button className={`voice-btn ${state === 'recording' ? 'is-recording' : ''}`} onClick={toggle}>
        {state === 'idle'       && <Icon name="microphone" size={14} />}
        {state === 'recording'  && <span className="voice-dot" />}
        {state === 'processing' && <Icon name="sparkles" size={14} className="spinning" />}
      </button>
      {state !== 'idle' && <span className="voice-timer">{state === 'processing' ? 'Transcribing...' : fmt(seconds)}</span>}
    </div>
  );
}
```

### 10.2 VAD + Capture Pipeline

**Architecture:** mic input → `VadFilter` (discard silence) → 45-second batch → `transcribe.rs` (LiteRT Gemma 4) → append to note's `audio_transcript` field → included in AI synthesis prompt.

```rust
// src-tauri/src/audio/vad.rs
pub struct VadFilter { threshold: f32 }

impl VadFilter {
    pub fn contains_speech(&self, samples: &[f32]) -> bool {
        let rms = (samples.iter().map(|s| s*s).sum::<f32>() / samples.len() as f32).sqrt();
        rms > self.threshold
    }
}
```

---

## Phase 11 — Polish, Animation & Micro-interactions

### Goal: Every interaction feels satisfying and alive.

### 11.1 Micro-interaction Catalog

| Interaction | Animation |
|---|---|
| Note saved | Status text fades green, fades out 1.2s |
| `::` flashcard detected | Left-gutter card icon pulses (scale 0→1, 300ms spring) |
| `::` smart palette opens | Panel drops from above (translateY -12px → 0, 160ms) |
| Batch cards created | Count badge bounces in: "+3 cards" |
| Card review Easy | Card slides right + slight rotation |
| Card review Forgot | Card slides left + slight rotation |
| Synthesize complete | Panel fades in with accent bloom |
| Mode switch | Active mode icon pops (scale 0.85→1.05→1, 200ms) |
| Smart paste banner | Slides in from bottom, auto-dismisses after 6s |

### 11.2 Empty States

Every empty state teaches, not just informs:

```tsx
// No flashcards yet
<EmptyState
  icon="⬡"
  title="No flashcards yet"
  body="Highlight text in your note and click the card button, or type a question followed by :: and the answer."
  example="What is apologetics? :: Knowing and defending what we believe"
/>

// All caught up on review
<EmptyState
  icon="✓"
  title="All caught up!"
  body="You've reviewed all cards for today."
  detail={daysUntilExam ? `Your exam is in ${daysUntilExam} days.` : null}
/>
```

---

## Full Implementation Checklist

### Foundation (Complete)
- [x] Sidebar, NoteEditor, SQLite, save_note, load_note, folder/class management

### Milestone 1 — Design System
- [ ] Replace font stack: Geist + Lora
- [ ] Expand CSS variables (colors, spacing, shadows, radii)
- [ ] Button variants: primary, ghost, danger, icon
- [ ] Micro-interaction transitions on all interactive elements
- [ ] Empty states for all views

### Milestone 2 — First Launch & Onboarding
- [ ] `bootstrap_first_launch` Rust command
- [ ] Welcome note with `::` example
- [ ] `useProgressiveReveal` hook
- [ ] Dynamic placeholder text in editor
- [ ] Contextual feature surface triggers (behavior-based)

### Milestone 3 — Intelligent Editor
- [ ] Ghost syntax overlay (heading/bullet/card/wikilink visual hints)
- [ ] `[[wikilink]]` detection and popover
- [ ] SelectionToolbar on text highlight
- [ ] Word count / reading time / card count status bar
- [ ] Smart paste detection banner

### Milestone 4 — THE UNIVERSAL SMART :: SYSTEM ← Core Feature
- [ ] `src/utils/lineContext.ts` — full classifier (15+ pattern types)
- [ ] `src/utils/paletteActions.ts` — context → action builder
- [ ] `src/utils/batchCardGen.ts` — batch from indented blocks
- [ ] `src/utils/smartPaste.ts` — paste analysis
- [ ] `SmartColonPalette.tsx` component
- [ ] Wire `::` keydown into NoteEditor
- [ ] Handle all action types: flashcard, batch, format, expand
- [ ] Keyboard navigation in palette (↑↓ + 1/2/3 shortcuts)
- [ ] `bump('smartColonUsed')` for progressive reveal tracking
- [ ] Test all 15 context types:
  - [ ] Scripture reference (Bible class)
  - [ ] Greek/Hebrew etymology (Bible, Classics)
  - [ ] Math formula (Math, Physics)
  - [ ] Chemical equation (Chemistry, Biology)
  - [ ] If→Then rule (Math, Logic)
  - [ ] Drug name (Nursing, Pharmacology)
  - [ ] Lab value (Nursing, Medicine)
  - [ ] Mnemonic/Acronym (Any subject)
  - [ ] Classification: "Two types of X" (Any subject)
  - [ ] Hierarchy (Psychology, Biology)
  - [ ] Legal case citation (Law)
  - [ ] Term→Definition (Any subject)
  - [ ] Before/After comparison (History, Literature)
  - [ ] Cause→Effect (History, Science)
  - [ ] Date/Event (History, Bible History)
  - [ ] Nested context (Any deep-indent note)
  - [ ] Plain fallback (Catch-all)

### Milestone 5 — Flashcard Ecosystem
- [ ] Redesign FlashcardBuilder (source panel + pre-filled draft + deck selector)
- [ ] Redesign CardReview (3D flip, keyboard shortcuts, exit animations)
- [ ] HighlightLayer confidence heatmap
- [ ] Batch card editor (queue + save all)
- [ ] `create_card` Tauri command accepting batch

### Milestone 6 — Study Mode & AI
- [ ] SynthesizeButton with loading/shimmer animation
- [ ] StudyPanel publication-quality markdown styles
- [ ] AI Synthesis Rust command (lifecycle.rs + synthesize.rs)
- [ ] AI Flashcard generation (flashcard_gen.rs)
- [ ] AIStatusBadge component
- [ ] AICardPreview (accept/edit/skip flow)

### Milestone 7 — Scheduler
- [ ] SM-2 full implementation with chrono
- [ ] ExamCalendar component
- [ ] StudyPlan daily quota widget
- [ ] `get_daily_plan` Tauri command
- [ ] `add_exam` Tauri command
- [ ] Exam compression in SM-2

### Milestone 8 — Omni-Capture
- [ ] Global hotkey registration (`⌘⇧Space`, `⌘⇧V`)
- [ ] Capture overlay window (separate Tauri window)
- [ ] `quick_capture` Rust command with `#tag` routing
- [ ] System tray dropzone

### Milestone 9 — Command Palette
- [ ] `CommandPalette.tsx` component
- [ ] `⌘K` registration in App.tsx
- [ ] Full command registry
- [ ] Dynamic note search results

### Milestone 10 — Canvas Polish
- [ ] Lasso selection
- [ ] Auto-arrange button
- [ ] Note content preview on hover
- [ ] Note age color tinting
- [ ] Sticky note aesthetic option

### Milestone 11 — Voice Pipeline
- [ ] VoiceBar component
- [ ] `start_recording` / `stop_recording` Tauri commands
- [ ] VAD filter (vad.rs)
- [ ] Transcription via LiteRT
- [ ] TranscriptFeed scrolling view

---

## File-by-File Change Map

| File | Action | Priority | Notes |
|---|---|---|---|
| `src/styles/global.css` | Full rewrite | 🔴 Critical | New fonts, colors, spacing, component styles |
| `src/App.tsx` | Add bootstrap, command palette, global shortcuts | 🔴 Critical | |
| `src/components/notes/NoteEditor.tsx` | Add `::` hook, selection toolbar, status bar, wikilinks | 🔴 Critical | The `::` keydown handler is the #1 priority |
| `src/components/notes/StudyPanel.tsx` | Publication-quality markdown CSS | 🔴 Critical | |
| `src/components/flashcards/CardReview.tsx` | Full rewrite with 3D flip, keyboard, animations | 🔴 Critical | |
| `src/components/ai/SynthesizeButton.tsx` | Real AI call + loading state | 🔴 Critical | |
| **`src/utils/lineContext.ts`** | **NEW — 15-pattern classifier** | **🔴 Critical** | **Entire smart :: system depends on this** |
| **`src/utils/paletteActions.ts`** | **NEW — context → card actions** | **🔴 Critical** | |
| **`src/utils/batchCardGen.ts`** | **NEW — batch from indented blocks** | **🔴 Critical** | |
| **`src/utils/smartPaste.ts`** | **NEW — paste analysis** | **🟡 Important** | |
| **`src/components/notes/SmartColonPalette.tsx`** | **NEW — the palette UI** | **🔴 Critical** | |
| `src/components/notes/SelectionToolbar.tsx` | NEW — highlight toolbar | 🟡 Important | |
| `src/components/notes/HighlightLayer.tsx` | NEW — confidence heatmap | 🟡 Important | |
| `src/components/audio/VoiceBar.tsx` | NEW — voice recording UI | 🟡 Important | |
| `src/components/scheduler/ExamCalendar.tsx` | NEW — exam dates | 🟡 Important | |
| `src/components/scheduler/StudyPlan.tsx` | NEW — daily plan widget | 🟡 Important | |
| `src/components/ui/CommandPalette.tsx` | NEW — command palette | 🟡 Important | |
| `src/hooks/useProgressiveReveal.ts` | NEW — feature surface triggers | 🟡 Important | |
| `src/types/index.ts` | Add `LineContext`, `PaletteAction`, `Exam`, `DailyPlan` | 🟡 Important | |
| `src/components/ui/Icon.tsx` | Add `microphone` icon | 🟡 Important | |
| `src-tauri/src/commands/note_commands.rs` | Add `bootstrap_first_launch`, `quick_capture` | 🔴 Critical | |
| `src-tauri/src/storage/cards.rs` | Full SM-2 with chrono | 🔴 Critical | |
| `src-tauri/src/ai/prompts.rs` | Synthesis + flashcard gen prompts | 🟠 Deferred | Needs LiteRT |
| `src-tauri/src/ai/synthesize.rs` | Full synthesis pipeline | 🟠 Deferred | Needs LiteRT |
| `src-tauri/src/audio/capture.rs` | cpal mic capture | 🟠 Deferred | Desktop only |
| `src-tauri/src/audio/vad.rs` | VAD filter | 🟠 Deferred | Desktop only |
| `src-tauri/Cargo.toml` | Add `chrono`, `tauri-plugin-global-shortcut` | 🔴 Critical | |

---

## The One Test That Matters

Before shipping any version, run this test:

> **Hand the app to someone who has never seen it. Say nothing. Watch what happens in the first 60 seconds.**

| What they do | What it means |
|---|---|
| ✅ Find the editor and start typing within 5 seconds | First launch working |
| ✅ Discover `::` from the welcome note example | Onboarding working |
| ✅ Type `::` on a verse or definition and see the smart palette | Smart :: system working |
| ✅ Say "oh that's smart" or "wait, how did it know that?" | Context detection landing |
| ✅ Use the batch option on a nested list | Advanced feature discoverable |
| ✅ Find their note after closing and reopening | Persistence working |
| ❌ Ask "where do I start?" | Blank state not fixed |
| ❌ Type `::` and see a generic "make flashcard" prompt | Smart :: not implemented |
| ❌ Can't figure out how to make a card without the context palette | UX friction remains |
| ❌ Has to look up how to use any feature | Progressive disclosure broken |

Fix every ❌ before adding any new features. The smart `::` system is the single biggest differentiator — it is the reason students pick Scholr over every other app — and it must work perfectly across Bible, Math, Nursing, Law, Science, and any subject thrown at it.

---

## Subject Coverage Guarantee

Scholr's universal `::` system is tested and verified against these subject types:

| Subject | Key Patterns Handled |
|---|---|
| **Bible / Theology** | Scripture refs, Greek/Hebrew roots, doctrines, verse-by-verse batch, classifications |
| **Mathematics** | Formulas, equations, If→Then rules, proofs, discriminant cases |
| **Nursing / Medicine** | Drug names, lab values, mnemonics (ADPIE, SBAR), procedures |
| **Science / Biology** | Chemical equations, classification (kingdom/phylum), processes, mnemonics (PMAT) |
| **History / Social Studies** | Dates/events, Before/After, cause/effect, timelines |
| **Law** | Case citations, elements of a claim, rule statements, holdings |
| **Psychology** | Hierarchies (Maslow), theorems, diagnostic criteria, mnemonics |
| **Literature / English** | Before/After movements, key term definitions, author→work |
| **Foreign Language** | Etymology, term→translation, grammar rule cards |
| **Computer Science** | If→Then logic, algorithm steps, complexity notation |
| **Economics** | Formulas (supply/demand), definitions, cause/effect |
| **Any other subject** | Term→definition, nested context, classification, plain Q&A |

The classifier never needs to know the subject in advance. It detects the pattern from the text shape alone.

---

*SCHOLR UX Blueprint v2.0 — Updated April 2026*
*Incorporates: Universal Smart :: Intelligence System, Cross-Subject Pattern Detection, Batch Card Generation, Smart Paste Analysis*
