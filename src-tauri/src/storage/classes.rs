use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassItem {
	pub id: i64,
	pub name: String,
	pub color: String,
	pub created_at: String,
}

fn validate_name(name: &str) -> anyhow::Result<String> {
	let trimmed = name.trim();
	if trimmed.is_empty() {
		anyhow::bail!("Class name cannot be empty");
	}
	if trimmed.len() > 80 {
		anyhow::bail!("Class name must be 80 characters or fewer");
	}
	Ok(trimmed.to_string())
}

fn normalize_color(color: Option<String>) -> String {
	color
		.map(|c| c.trim().to_string())
		.filter(|c| !c.is_empty())
		.unwrap_or_else(|| "#5DCAA5".to_string())
}

pub fn list_classes(conn: &Connection) -> anyhow::Result<Vec<ClassItem>> {
	let mut stmt = conn.prepare(
		"SELECT id, name, color, created_at
		 FROM classes
		 ORDER BY created_at ASC, id ASC",
	)?;

	let rows = stmt.query_map([], |r| {
		Ok(ClassItem {
			id: r.get(0)?,
			name: r.get(1)?,
			color: r.get(2)?,
			created_at: r.get(3)?,
		})
	})?;

	let mut classes = Vec::new();
	for row in rows {
		classes.push(row?);
	}
	Ok(classes)
}

pub fn create_class(conn: &Connection, name: String, color: Option<String>) -> anyhow::Result<ClassItem> {
	let name = validate_name(&name)?;
	let color = normalize_color(color);

	conn.execute(
		"INSERT INTO classes (name, color, created_at) VALUES (?1, ?2, datetime('now'))",
		params![name, color],
	)?;

	let id = conn.last_insert_rowid();
	get_class(conn, id)
}

pub fn update_class(
	conn: &Connection,
	class_id: i64,
	name: String,
	color: Option<String>,
) -> anyhow::Result<ClassItem> {
	let name = validate_name(&name)?;
	let color = normalize_color(color);

	conn.execute(
		"UPDATE classes SET name = ?1, color = ?2 WHERE id = ?3",
		params![name, color, class_id],
	)?;

	if conn.changes() == 0 {
		anyhow::bail!("Class not found");
	}

	get_class(conn, class_id)
}

pub fn delete_class(conn: &Connection, class_id: i64) -> anyhow::Result<()> {
	conn.execute("DELETE FROM classes WHERE id = ?1", [class_id])?;

	if conn.changes() == 0 {
		anyhow::bail!("Class not found");
	}

	Ok(())
}

fn get_class(conn: &Connection, class_id: i64) -> anyhow::Result<ClassItem> {
	let class_item = conn.query_row(
		"SELECT id, name, color, created_at FROM classes WHERE id = ?1",
		[class_id],
		|r| {
			Ok(ClassItem {
				id: r.get(0)?,
				name: r.get(1)?,
				color: r.get(2)?,
				created_at: r.get(3)?,
			})
		},
	)?;
	Ok(class_item)
}
