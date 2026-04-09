CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#5DCAA5',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id         INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
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
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

