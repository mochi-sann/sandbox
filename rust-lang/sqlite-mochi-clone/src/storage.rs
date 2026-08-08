use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::Path,
};

use crate::{
    DbError, Result,
    ast::{ColumnDefinition, ColumnType, Value},
    engine::Table,
};

const MAGIC: &[u8; 8] = b"MOCHIDB\0";
const VERSION: u32 = 1;
const MAX_ITEMS: u32 = 1_000_000;
const MAX_STRING_BYTES: u32 = 16 * 1024 * 1024;

pub fn load(path: &Path) -> Result<Vec<Table>> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let mut bytes = Vec::new();
    File::open(path)?.read_to_end(&mut bytes)?;
    let mut reader = Reader::new(&bytes);
    if reader.read_exact(MAGIC.len())? != MAGIC {
        return Err(DbError::Storage("invalid database magic".into()));
    }
    let version = reader.read_u32()?;
    if version != VERSION {
        return Err(DbError::Storage(format!(
            "unsupported database version {version}"
        )));
    }
    let table_count = reader.read_count("table")?;
    let mut tables = Vec::with_capacity(table_count);
    for _ in 0..table_count {
        let name = reader.read_string()?;
        let column_count = reader.read_count("column")?;
        let mut columns = Vec::with_capacity(column_count);
        for _ in 0..column_count {
            let name = reader.read_string()?;
            let data_type = match reader.read_u8()? {
                1 => ColumnType::Integer,
                2 => ColumnType::Text,
                tag => return Err(DbError::Storage(format!("unknown column type tag {tag}"))),
            };
            let nullable = match reader.read_u8()? {
                0 => false,
                1 => true,
                tag => return Err(DbError::Storage(format!("invalid nullable flag {tag}"))),
            };
            columns.push(ColumnDefinition {
                name,
                data_type,
                nullable,
            });
        }
        let row_count = reader.read_count("row")?;
        let mut rows = Vec::with_capacity(row_count);
        for _ in 0..row_count {
            let mut row = Vec::with_capacity(columns.len());
            for _ in 0..columns.len() {
                row.push(reader.read_value()?);
            }
            rows.push(row);
        }
        tables.push(Table {
            name,
            columns,
            rows,
        });
    }
    if !reader.is_at_end() {
        return Err(DbError::Storage(
            "unexpected trailing bytes in database".into(),
        ));
    }
    Ok(tables)
}

pub fn save(path: &Path, tables: &[Table]) -> Result<()> {
    let parent = path.parent().filter(|path| !path.as_os_str().is_empty());
    if let Some(parent) = parent {
        fs::create_dir_all(parent)?;
    }
    let file_name = path
        .file_name()
        .ok_or_else(|| DbError::Storage("database path has no file name".into()))?
        .to_string_lossy();
    let temporary = path.with_file_name(format!(".{file_name}.tmp-{}", std::process::id()));
    let write_result = (|| -> Result<()> {
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&temporary)?;
        file.write_all(MAGIC)?;
        write_u32(&mut file, VERSION)?;
        write_len(&mut file, tables.len(), "tables")?;
        for table in tables {
            write_string(&mut file, &table.name)?;
            write_len(&mut file, table.columns.len(), "columns")?;
            for column in &table.columns {
                write_string(&mut file, &column.name)?;
                file.write_all(&[match column.data_type {
                    ColumnType::Integer => 1,
                    ColumnType::Text => 2,
                }])?;
                file.write_all(&[u8::from(column.nullable)])?;
            }
            write_len(&mut file, table.rows.len(), "rows")?;
            for row in &table.rows {
                for value in row {
                    write_value(&mut file, value)?;
                }
            }
        }
        file.sync_all()?;
        fs::rename(&temporary, path)?;
        if let Some(parent) = parent {
            File::open(parent)?.sync_all()?;
        }
        Ok(())
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write_result
}

fn write_value(writer: &mut impl Write, value: &Value) -> Result<()> {
    match value {
        Value::Null => writer.write_all(&[0])?,
        Value::Integer(value) => {
            writer.write_all(&[1])?;
            writer.write_all(&value.to_le_bytes())?;
        }
        Value::Text(value) => {
            writer.write_all(&[2])?;
            write_string(writer, value)?;
        }
    }
    Ok(())
}

fn write_string(writer: &mut impl Write, value: &str) -> Result<()> {
    write_len(writer, value.len(), "string bytes")?;
    writer.write_all(value.as_bytes())?;
    Ok(())
}

fn write_len(writer: &mut impl Write, len: usize, label: &str) -> Result<()> {
    let len =
        u32::try_from(len).map_err(|_| DbError::Storage(format!("too many {label} to store")))?;
    write_u32(writer, len)
}

fn write_u32(writer: &mut impl Write, value: u32) -> Result<()> {
    writer.write_all(&value.to_le_bytes())?;
    Ok(())
}

struct Reader<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    fn read_exact(&mut self, len: usize) -> Result<&'a [u8]> {
        let end = self
            .position
            .checked_add(len)
            .filter(|end| *end <= self.bytes.len())
            .ok_or_else(|| DbError::Storage("database file is truncated".into()))?;
        let result = &self.bytes[self.position..end];
        self.position = end;
        Ok(result)
    }

    fn read_u8(&mut self) -> Result<u8> {
        Ok(self.read_exact(1)?[0])
    }

    fn read_u32(&mut self) -> Result<u32> {
        let bytes: [u8; 4] = self.read_exact(4)?.try_into().expect("fixed length");
        Ok(u32::from_le_bytes(bytes))
    }

    fn read_count(&mut self, label: &str) -> Result<usize> {
        let count = self.read_u32()?;
        if count > MAX_ITEMS {
            return Err(DbError::Storage(format!(
                "{label} count {count} exceeds the safety limit"
            )));
        }
        Ok(count as usize)
    }

    fn read_string(&mut self) -> Result<String> {
        let len = self.read_u32()?;
        if len > MAX_STRING_BYTES {
            return Err(DbError::Storage(format!(
                "string length {len} exceeds the safety limit"
            )));
        }
        String::from_utf8(self.read_exact(len as usize)?.to_vec())
            .map_err(|_| DbError::Storage("database contains invalid UTF-8".into()))
    }

    fn read_value(&mut self) -> Result<Value> {
        match self.read_u8()? {
            0 => Ok(Value::Null),
            1 => {
                let bytes: [u8; 8] = self.read_exact(8)?.try_into().expect("fixed length");
                Ok(Value::Integer(i64::from_le_bytes(bytes)))
            }
            2 => Ok(Value::Text(self.read_string()?)),
            tag => Err(DbError::Storage(format!("unknown value tag {tag}"))),
        }
    }

    fn is_at_end(&self) -> bool {
        self.position == self.bytes.len()
    }
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::{ExecutionResult, parser::parse_sql};

    use super::*;

    fn test_path(label: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("mochidb-{label}-{}-{nonce}.db", std::process::id()))
    }

    #[test]
    fn persists_and_reopens_database() {
        let path = test_path("roundtrip");
        {
            let mut database = crate::Database::open(&path).unwrap();
            for statement in parse_sql(
                "CREATE TABLE notes (id INTEGER NOT NULL, body TEXT);\
                 INSERT INTO notes VALUES (-1, 'こんにちは');",
            )
            .unwrap()
            {
                database.execute(statement).unwrap();
            }
        }
        let mut reopened = crate::Database::open(&path).unwrap();
        let result = reopened
            .execute(parse_sql("SELECT * FROM notes").unwrap().remove(0))
            .unwrap();
        assert!(matches!(result, ExecutionResult::Query { rows, .. } if rows.len() == 1));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_corrupt_and_truncated_files() {
        let corrupt = test_path("corrupt");
        fs::write(&corrupt, b"not a database").unwrap();
        assert!(matches!(load(&corrupt), Err(DbError::Storage(_))));
        fs::remove_file(corrupt).unwrap();

        let truncated = test_path("truncated");
        fs::write(&truncated, MAGIC).unwrap();
        assert!(matches!(load(&truncated), Err(DbError::Storage(_))));
        fs::remove_file(truncated).unwrap();
    }
}
