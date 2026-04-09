use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
	pub id: i64,
	pub class_id: i64,
	pub name: String,
	pub created_at: String,
}

fn validate_name(name: &str) -> anyhow::Result<String> {
	let trimmed = name.trim();
	if trimmed.is_empty() {
		anyhow::bail!("Folder name cannot be empty");
	}
	if trimmed.len() > 80 {
		anyhow::bail!("Folder name must be 80 characters or fewer");
	}
	Ok(trimmed.to_string())
}

fn get_folder(conn: &Connection, folder_id: i64) -> anyhow::Result<Folder> {
	let folder = conn.query_row(
		"SELECT id, class_id, name, created_at FROM folders WHERE id = ?1",
		[folder_id],
		|r| {
			Ok(Folder {
				id: r.get(0)?,
				class_id: r.get(1)?,
				name: r.get(2)?,
				created_at: r.get(3)?,
			})
		},
	)?;
	Ok(folder)
}

pub fn ensure_inbox_folder(conn: &Connection, class_id: i64) -> anyhow::Result<Folder> {
	let existing: Option<i64> = conn
		.query_row(
			"SELECT id FROM folders WHERE class_id = ?1 ORDER BY id ASC LIMIT 1",
			[class_id],
			|r| r.get(0),
		)
		.ok();

	if let Some(id) = existing {
		return get_folder(conn, id);
	}

	conn.execute(
		"INSERT INTO folders (class_id, name, created_at) VALUES (?1, 'Inbox', datetime('now'))",
		params![class_id],
	)?;

	get_folder(conn, conn.last_insert_rowid())
}

pub fn list_folders(conn: &Connection, class_id: i64) -> anyhow::Result<Vec<Folder>> {
	let _ = ensure_inbox_folder(conn, class_id)?;

	let mut stmt = conn.prepare(
		"SELECT id, class_id, name, created_at
		 FROM folders
		 WHERE class_id = ?1
		 ORDER BY created_at ASC, id ASC",
	)?;

	let rows = stmt.query_map([class_id], |r| {
		Ok(Folder {
			id: r.get(0)?,
			class_id: r.get(1)?,
			name: r.get(2)?,
			created_at: r.get(3)?,
		})
	})?;

	let mut folders = Vec::new();
	for row in rows {
		folders.push(row?);
	}
	Ok(folders)
}

pub fn create_folder(conn: &Connection, class_id: i64, name: String) -> anyhow::Result<Folder> {
	let name = validate_name(&name)?;

	conn.execute(
		"INSERT INTO folders (class_id, name, created_at) VALUES (?1, ?2, datetime('now'))",
		params![class_id, name],
	)?;

	get_folder(conn, conn.last_insert_rowid())
}

pub fn rename_folder(conn: &Connection, folder_id: i64, name: String) -> anyhow::Result<Folder> {
	let name = validate_name(&name)?;

	conn.execute(
		"UPDATE folders SET name = ?1 WHERE id = ?2",
		params![name, folder_id],
	)?;

	if conn.changes() == 0 {
		anyhow::bail!("Folder not found");
	}

	get_folder(conn, folder_id)
}

pub fn folder_exists(conn: &Connection, folder_id: i64, class_id: i64) -> anyhow::Result<bool> {
	let exists: i64 = conn.query_row(
		"SELECT COUNT(*) FROM folders WHERE id = ?1 AND class_id = ?2",
		params![folder_id, class_id],
		|r| r.get(0),
	)?;
	Ok(exists > 0)
}

pub fn delete_folder(conn: &Connection, class_id: i64, folder_id: i64) -> anyhow::Result<()> {
	let folders = list_folders(conn, class_id)?;
	if folders.len() <= 1 {
		anyhow::bail!("At least one folder must remain in a class");
	}

	if !folder_exists(conn, folder_id, class_id)? {
		anyhow::bail!("Folder not found");
	}

	let fallback_folder = folders
		.into_iter()
		.find(|folder| folder.id != folder_id)
		.ok_or_else(|| anyhow::anyhow!("No fallback folder available"))?;

	conn.execute(
		"UPDATE notes SET folder_id = ?1 WHERE class_id = ?2 AND folder_id = ?3",
		params![fallback_folder.id, class_id, folder_id],
	)?;

	conn.execute(
		"DELETE FROM folders WHERE class_id = ?1 AND id = ?2",
		params![class_id, folder_id],
	)?;

	if conn.changes() == 0 {
		anyhow::bail!("Folder not found");
	}

	Ok(())
}
