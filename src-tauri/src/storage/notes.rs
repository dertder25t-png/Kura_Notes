use chrono::Local;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub class_id: Option<i64>,
    pub folder_id: Option<i64>,
    pub title: String,
    pub raw_content: String,
    pub study_content: String,
    pub audio_transcript: String,
    pub file_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

fn slugify(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut prev_is_sep = false;

    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            prev_is_sep = false;
        } else if !prev_is_sep {
            out.push('_');
            prev_is_sep = true;
        }
    }

    out.trim_matches('_').to_string()
}

fn resolve_class_folder(conn: &Connection, class_id: Option<i64>) -> anyhow::Result<String> {
    let Some(class_id) = class_id else {
        return Ok("untagged".to_string());
    };

    let class_name: String = conn.query_row(
        "SELECT name FROM classes WHERE id = ?1",
        [class_id],
        |r| r.get(0),
    ).unwrap_or_else(|_| "untagged".to_string());
    let slug = slugify(&class_name);
    if slug.is_empty() {
        Ok("general".to_string())
    } else {
        Ok(slug)
    }
}

fn resolve_folder_folder(conn: &Connection, folder_id: Option<i64>) -> anyhow::Result<String> {
    let Some(id) = folder_id else {
        return Ok("inbox".to_string());
    };

    let folder_name: String = conn.query_row(
        "SELECT name FROM folders WHERE id = ?1",
        [id],
        |r| r.get(0),
    )?;
    let slug = slugify(&folder_name);
    if slug.is_empty() {
        Ok("inbox".to_string())
    } else {
        Ok(slug)
    }
}

fn ensure_file_path(
    conn: &Connection,
    project_root: &Path,
    class_id: Option<i64>,
    folder_id: Option<i64>,
    existing: Option<String>,
) -> anyhow::Result<String> {
    if let Some(path) = existing {
        return Ok(path);
    }

    let class_folder = resolve_class_folder(conn, class_id)?;
    let folder_folder = resolve_folder_folder(conn, folder_id)?;
    let timestamp = Local::now().format("%Y-%m-%d_%H%M%S").to_string();
    let mut path = PathBuf::from(project_root);
    path.push("notes");
    path.push(class_folder);
    path.push(folder_folder);
    std::fs::create_dir_all(&path)?;
    path.push(format!("{timestamp}.md"));

    Ok(path.to_string_lossy().to_string())
}

pub fn save_note(
    conn: &Connection,
    project_root: &Path,
    note_id: Option<i64>,
    class_id: Option<i64>,
    folder_id: Option<i64>,
    title: String,
    raw_content: String,
) -> anyhow::Result<Note> {
    if let Some(id) = note_id {
        let (current_file_path, current_folder_id, current_class_id): (Option<String>, Option<i64>, Option<i64>) = conn.query_row(
            "SELECT file_path, folder_id, class_id FROM notes WHERE id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;

        let resolved_folder_id = folder_id.or(current_folder_id);
        let resolved_class_id = class_id.or(current_class_id);
        let file_path = ensure_file_path(conn, project_root, resolved_class_id, resolved_folder_id, current_file_path)?;
        std::fs::write(&file_path, &raw_content)?;

        conn.execute(
            "UPDATE notes
             SET class_id = ?1, folder_id = ?2, title = ?3, raw_content = ?4, file_path = ?5, updated_at = datetime('now')
             WHERE id = ?6",
            params![resolved_class_id, resolved_folder_id, title, raw_content, file_path, id],
        )?;

        return load_note(conn, id);
    }

    let file_path = ensure_file_path(conn, project_root, class_id, folder_id, None)?;
    std::fs::write(&file_path, &raw_content)?;

    conn.execute(
        "INSERT INTO notes (class_id, folder_id, title, raw_content, file_path, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
        params![class_id, folder_id, title, raw_content, file_path],
    )?;

    let id = conn.last_insert_rowid();
    load_note(conn, id)
}

pub fn load_note(conn: &Connection, note_id: i64) -> anyhow::Result<Note> {
    let note = conn.query_row(
        "SELECT id, class_id, folder_id, title, raw_content, study_content, audio_transcript, file_path, created_at, updated_at
         FROM notes
         WHERE id = ?1",
        [note_id],
        |r| {
            Ok(Note {
                id: r.get(0)?,
                class_id: r.get(1)?,
                folder_id: r.get(2)?,
                title: r.get::<_, Option<String>>(3)?.unwrap_or_else(|| "Untitled".to_string()),
                raw_content: r.get::<_, Option<String>>(4)?.unwrap_or_default(),
                study_content: r.get::<_, Option<String>>(5)?.unwrap_or_default(),
                audio_transcript: r.get::<_, Option<String>>(6)?.unwrap_or_default(),
                file_path: r.get(7)?,
                created_at: r.get(8)?,
                updated_at: r.get(9)?,
            })
        },
    )?;

    Ok(note)
}

pub fn list_notes(conn: &Connection, class_id: Option<i64>) -> anyhow::Result<Vec<Note>> {
    let mut stmt = conn.prepare(
        "SELECT id, class_id, folder_id, title, raw_content, study_content, audio_transcript, file_path, created_at, updated_at
         FROM notes
         WHERE (?1 IS NULL OR class_id = ?1)
         ORDER BY updated_at DESC",
    )?;

    let rows = stmt.query_map(params![class_id], |r| {
        Ok(Note {
            id: r.get(0)?,
            class_id: r.get(1)?,
            folder_id: r.get(2)?,
            title: r.get::<_, Option<String>>(3)?.unwrap_or_else(|| "Untitled".to_string()),
            raw_content: r.get::<_, Option<String>>(4)?.unwrap_or_default(),
            study_content: r.get::<_, Option<String>>(5)?.unwrap_or_default(),
            audio_transcript: r.get::<_, Option<String>>(6)?.unwrap_or_default(),
            file_path: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    })?;

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row?);
    }
    Ok(notes)
}

pub fn list_notes_by_folder(
    conn: &Connection,
    class_id: Option<i64>,
    folder_id: i64,
) -> anyhow::Result<Vec<Note>> {
    let mut stmt = conn.prepare(
        "SELECT id, class_id, folder_id, title, raw_content, study_content, audio_transcript, file_path, created_at, updated_at
         FROM notes
         WHERE folder_id = ?2 AND (?1 IS NULL OR class_id = ?1)
         ORDER BY updated_at DESC",
    )?;

    let rows = stmt.query_map(params![class_id, folder_id], |r| {
        Ok(Note {
            id: r.get(0)?,
            class_id: r.get(1)?,
            folder_id: r.get(2)?,
            title: r.get::<_, Option<String>>(3)?.unwrap_or_else(|| "Untitled".to_string()),
            raw_content: r.get::<_, Option<String>>(4)?.unwrap_or_default(),
            study_content: r.get::<_, Option<String>>(5)?.unwrap_or_default(),
            audio_transcript: r.get::<_, Option<String>>(6)?.unwrap_or_default(),
            file_path: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    })?;

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row?);
    }
    Ok(notes)
}

pub fn move_note_to_folder(
    conn: &Connection,
    note_id: i64,
    class_id: Option<i64>,
    folder_id: i64,
) -> anyhow::Result<Note> {
    conn.execute(
        "UPDATE notes SET folder_id = ?1, class_id = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![folder_id, class_id, note_id],
    )?;

    if conn.changes() == 0 {
        anyhow::bail!("Note not found");
    }

    load_note(conn, note_id)
}

pub fn delete_note(conn: &Connection, note_id: i64) -> anyhow::Result<()> {
    let file_path: Option<String> = conn.query_row(
        "SELECT file_path FROM notes WHERE id = ?1",
        [note_id],
        |r| r.get(0),
    )?;

    conn.execute("DELETE FROM notes WHERE id = ?1", [note_id])?;

    if conn.changes() == 0 {
        anyhow::bail!("Note not found");
    }

    if let Some(path) = file_path {
        let path_ref = Path::new(&path);
        if path_ref.exists() {
            let _ = std::fs::remove_file(path_ref);
        }
    }

    Ok(())
}
