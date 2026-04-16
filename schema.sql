CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#5DCAA5',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id         INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  folder_id        INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  title            TEXT,
  raw_content      TEXT DEFAULT '',
  study_content    TEXT DEFAULT '',
  audio_transcript TEXT DEFAULT '',
  file_path        TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS flashcards (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id           INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  class_id          INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  source_line_index  INTEGER DEFAULT 0,
  context_type      TEXT NOT NULL,
  context_label     TEXT NOT NULL,
  front             TEXT NOT NULL,
  back              TEXT NOT NULL,
  source_line       TEXT DEFAULT '',
  metadata_json     TEXT DEFAULT '{}',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type    TEXT NOT NULL,
  note_id       INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  metadata_json TEXT DEFAULT '{}',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_type_created_at
ON telemetry_events(event_type, created_at DESC);

