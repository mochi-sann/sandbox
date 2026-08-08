use std::io::{BufRead, Write};

use crate::{
    Database, DbError, ExecutionResult, Result,
    ast::{ColumnType, Value},
    parser::parse_sql,
};

pub fn execute_sql(database: &mut Database, sql: &str, writer: &mut impl Write) -> Result<()> {
    for statement in parse_sql(sql)? {
        let result = database.execute(statement)?;
        write_result(writer, &result)?;
    }
    Ok(())
}

pub fn run_repl(
    database: &mut Database,
    mut reader: impl BufRead,
    mut writer: impl Write,
) -> Result<()> {
    writeln!(writer, "MochiDB 0.1.0 — enter .help for help")?;
    let mut buffer = String::new();
    loop {
        write!(
            writer,
            "{}",
            if buffer.is_empty() {
                "mochi> "
            } else {
                "   ...> "
            }
        )?;
        writer.flush()?;
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            if !buffer.trim().is_empty() {
                execute_sql(database, &buffer, &mut writer)?;
            }
            break;
        }

        let trimmed = line.trim();
        if buffer.is_empty() && trimmed.starts_with('.') {
            if handle_meta_command(database, trimmed, &mut writer)? {
                break;
            }
            continue;
        }

        buffer.push_str(&line);
        if ends_with_statement_terminator(&buffer) {
            match execute_sql(database, &buffer, &mut writer) {
                Ok(()) => {}
                Err(error) => writeln!(writer, "Error: {error}")?,
            }
            buffer.clear();
        }
    }
    Ok(())
}

fn ends_with_statement_terminator(input: &str) -> bool {
    input.trim_end().ends_with(';')
}

fn handle_meta_command(
    database: &Database,
    command: &str,
    writer: &mut impl Write,
) -> Result<bool> {
    let mut parts = command.split_whitespace();
    let name = parts.next().unwrap_or_default();
    match name {
        ".exit" | ".quit" => Ok(true),
        ".help" => {
            writeln!(
                writer,
                ".help             Show this help\n\
                 .tables           List tables\n\
                 .schema [TABLE]   Show CREATE TABLE definitions\n\
                 .exit             Exit the shell"
            )?;
            Ok(false)
        }
        ".tables" => {
            if parts.next().is_some() {
                return Err(DbError::Constraint("usage: .tables".into()));
            }
            let names = database
                .table_schemas()
                .into_iter()
                .map(|schema| schema.name)
                .collect::<Vec<_>>();
            writeln!(writer, "{}", names.join("  "))?;
            Ok(false)
        }
        ".schema" => {
            let requested = parts.next();
            if parts.next().is_some() {
                return Err(DbError::Constraint("usage: .schema [TABLE]".into()));
            }
            let schemas = match requested {
                Some(name) => vec![
                    database
                        .table_schema(name)
                        .ok_or_else(|| DbError::Schema(format!("unknown table '{name}'")))?,
                ],
                None => database.table_schemas(),
            };
            for schema in schemas {
                let columns = schema
                    .columns
                    .iter()
                    .map(|column| {
                        format!(
                            "{} {}{}",
                            column.name,
                            match column.data_type {
                                ColumnType::Integer => "INTEGER",
                                ColumnType::Text => "TEXT",
                            },
                            if column.nullable { "" } else { " NOT NULL" }
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                writeln!(writer, "CREATE TABLE {} ({columns});", schema.name)?;
            }
            Ok(false)
        }
        _ => Err(DbError::Constraint(format!(
            "unknown command '{name}'; enter .help for help"
        ))),
    }
}

fn write_result(writer: &mut impl Write, result: &ExecutionResult) -> Result<()> {
    match result {
        ExecutionResult::Created => writeln!(writer, "Table created.")?,
        ExecutionResult::Modified(count) => {
            writeln!(writer, "{count} row(s) affected.")?;
        }
        ExecutionResult::Query { columns, rows } => write_table(writer, columns, rows)?,
    }
    Ok(())
}

fn write_table(writer: &mut impl Write, columns: &[String], rows: &[Vec<Value>]) -> Result<()> {
    let rendered_rows = rows
        .iter()
        .map(|row| row.iter().map(render_value).collect::<Vec<_>>())
        .collect::<Vec<_>>();
    let widths = columns
        .iter()
        .enumerate()
        .map(|(index, column)| {
            rendered_rows
                .iter()
                .map(|row| row[index].chars().count())
                .fold(column.chars().count(), usize::max)
        })
        .collect::<Vec<_>>();
    write_cells(writer, columns, &widths)?;
    writeln!(
        writer,
        "{}",
        widths
            .iter()
            .map(|width| "-".repeat(*width))
            .collect::<Vec<_>>()
            .join("-+-")
    )?;
    for row in &rendered_rows {
        write_cells(writer, row, &widths)?;
    }
    writeln!(writer, "{} row(s).", rows.len())?;
    Ok(())
}

fn write_cells(writer: &mut impl Write, cells: &[String], widths: &[usize]) -> Result<()> {
    for (index, (cell, width)) in cells.iter().zip(widths).enumerate() {
        if index > 0 {
            write!(writer, " | ")?;
        }
        write!(writer, "{cell}{}", " ".repeat(width - cell.chars().count()))?;
    }
    writeln!(writer)?;
    Ok(())
}

fn render_value(value: &Value) -> String {
    match value {
        Value::Null => "NULL".into(),
        Value::Integer(value) => value.to_string(),
        Value::Text(value) => value.clone(),
    }
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::*;

    #[test]
    fn formats_query_as_a_table() {
        let mut database = Database::in_memory();
        let mut output = Vec::new();
        execute_sql(
            &mut database,
            "CREATE TABLE t (id INTEGER, name TEXT);\
             INSERT INTO t VALUES (1, 'Mochi');\
             SELECT * FROM t;",
            &mut output,
        )
        .unwrap();
        let output = String::from_utf8(output).unwrap();
        assert!(output.contains("id | name"));
        assert!(output.contains("1  | Mochi"));
        assert!(output.contains("1 row(s)."));
    }

    #[test]
    fn repl_supports_multiline_and_meta_commands() {
        let input = b"CREATE TABLE notes (\nid INTEGER NOT NULL, body TEXT\n);\n.tables\n.schema notes\n.exit\n";
        let mut output = Vec::new();
        run_repl(&mut Database::in_memory(), Cursor::new(input), &mut output).unwrap();
        let output = String::from_utf8(output).unwrap();
        assert!(output.contains("notes"));
        assert!(output.contains("CREATE TABLE notes (id INTEGER NOT NULL, body TEXT);"));
    }
}
