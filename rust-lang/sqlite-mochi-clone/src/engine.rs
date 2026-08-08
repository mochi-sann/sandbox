use std::path::{Path, PathBuf};

use crate::{
    DbError, Result,
    ast::{BinaryOperator, ColumnDefinition, ColumnType, Expr, Projection, Statement, Value},
    storage,
};

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Table {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
    pub rows: Vec<Vec<Value>>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ExecutionResult {
    Created,
    Modified(usize),
    Query {
        columns: Vec<String>,
        rows: Vec<Vec<Value>>,
    },
}

#[derive(Debug)]
pub struct Database {
    path: Option<PathBuf>,
    tables: Vec<Table>,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_owned();
        let tables = storage::load(&path)?;
        Ok(Self {
            path: Some(path),
            tables,
        })
    }

    pub fn in_memory() -> Self {
        Self {
            path: None,
            tables: Vec::new(),
        }
    }

    pub fn execute(&mut self, statement: Statement) -> Result<ExecutionResult> {
        if matches!(statement, Statement::Select { .. }) {
            return self.execute_inner(statement);
        }

        let old_tables = self.tables.clone();
        let result = self.execute_inner(statement)?;
        if let Some(path) = &self.path
            && let Err(error) = storage::save(path, &self.tables)
        {
            self.tables = old_tables;
            return Err(error);
        }
        Ok(result)
    }

    pub fn table_schemas(&self) -> Vec<TableSchema> {
        self.tables
            .iter()
            .map(|table| TableSchema {
                name: table.name.clone(),
                columns: table.columns.clone(),
            })
            .collect()
    }

    pub fn table_schema(&self, name: &str) -> Option<TableSchema> {
        self.table(name).map(|table| TableSchema {
            name: table.name.clone(),
            columns: table.columns.clone(),
        })
    }

    fn execute_inner(&mut self, statement: Statement) -> Result<ExecutionResult> {
        match statement {
            Statement::CreateTable { name, columns } => self.create_table(name, columns),
            Statement::Insert {
                table,
                columns,
                values,
            } => self.insert(&table, columns, values),
            Statement::Select {
                table,
                projection,
                filter,
            } => self.select(&table, projection, filter.as_ref()),
            Statement::Update {
                table,
                assignments,
                filter,
            } => self.update(&table, assignments, filter.as_ref()),
            Statement::Delete { table, filter } => self.delete(&table, filter.as_ref()),
        }
    }

    fn create_table(
        &mut self,
        name: String,
        columns: Vec<ColumnDefinition>,
    ) -> Result<ExecutionResult> {
        if self.table(&name).is_some() {
            return Err(DbError::Schema(format!("table '{name}' already exists")));
        }
        for (index, column) in columns.iter().enumerate() {
            if columns[..index]
                .iter()
                .any(|other| names_equal(&other.name, &column.name))
            {
                return Err(DbError::Schema(format!(
                    "column '{}' is defined more than once",
                    column.name
                )));
            }
        }
        self.tables.push(Table {
            name,
            columns,
            rows: Vec::new(),
        });
        Ok(ExecutionResult::Created)
    }

    fn insert(
        &mut self,
        table_name: &str,
        column_names: Option<Vec<String>>,
        values: Vec<Value>,
    ) -> Result<ExecutionResult> {
        let table = self.table_mut(table_name)?;
        let mut row = vec![Value::Null; table.columns.len()];
        if let Some(column_names) = column_names {
            if column_names.len() != values.len() {
                return Err(DbError::Schema(format!(
                    "{} columns were given but {} values were supplied",
                    column_names.len(),
                    values.len()
                )));
            }
            let mut used = Vec::new();
            for (name, value) in column_names.iter().zip(values) {
                let index = column_index(table, name)?;
                if used.contains(&index) {
                    return Err(DbError::Schema(format!(
                        "column '{name}' is specified more than once"
                    )));
                }
                used.push(index);
                row[index] = value;
            }
        } else {
            if table.columns.len() != values.len() {
                return Err(DbError::Schema(format!(
                    "table '{}' has {} columns but {} values were supplied",
                    table.name,
                    table.columns.len(),
                    values.len()
                )));
            }
            row = values;
        }
        validate_row(&table.columns, &row)?;
        table.rows.push(row);
        Ok(ExecutionResult::Modified(1))
    }

    fn select(
        &self,
        table_name: &str,
        projection: Projection,
        filter: Option<&Expr>,
    ) -> Result<ExecutionResult> {
        let table = self.table_required(table_name)?;
        validate_filter(table, filter)?;
        let indexes = match projection {
            Projection::All => (0..table.columns.len()).collect::<Vec<_>>(),
            Projection::Columns(names) => names
                .iter()
                .map(|name| column_index(table, name))
                .collect::<Result<Vec<_>>>()?,
        };
        let columns = indexes
            .iter()
            .map(|index| table.columns[*index].name.clone())
            .collect();
        let rows = table
            .rows
            .iter()
            .filter_map(|row| match matches_filter(table, row, filter) {
                Ok(true) => Some(Ok(indexes
                    .iter()
                    .map(|index| row[*index].clone())
                    .collect())),
                Ok(false) => None,
                Err(error) => Some(Err(error)),
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(ExecutionResult::Query { columns, rows })
    }

    fn update(
        &mut self,
        table_name: &str,
        assignments: Vec<(String, Value)>,
        filter: Option<&Expr>,
    ) -> Result<ExecutionResult> {
        let table = self.table_mut(table_name)?;
        validate_filter(table, filter)?;
        let mut resolved = Vec::new();
        for (name, value) in assignments {
            let index = column_index(table, &name)?;
            if resolved.iter().any(|(used, _)| *used == index) {
                return Err(DbError::Schema(format!(
                    "column '{name}' is assigned more than once"
                )));
            }
            validate_value(&table.columns[index], &value)?;
            resolved.push((index, value));
        }
        let mut changed = 0;
        for row in &mut table.rows {
            if matches_filter_parts(&table.columns, row, filter)? {
                for (index, value) in &resolved {
                    row[*index] = value.clone();
                }
                changed += 1;
            }
        }
        Ok(ExecutionResult::Modified(changed))
    }

    fn delete(&mut self, table_name: &str, filter: Option<&Expr>) -> Result<ExecutionResult> {
        let table = self.table_mut(table_name)?;
        validate_filter(table, filter)?;
        let mut kept = Vec::with_capacity(table.rows.len());
        let mut changed = 0;
        for row in table.rows.drain(..) {
            if matches_filter_parts(&table.columns, &row, filter)? {
                changed += 1;
            } else {
                kept.push(row);
            }
        }
        table.rows = kept;
        Ok(ExecutionResult::Modified(changed))
    }

    fn table(&self, name: &str) -> Option<&Table> {
        self.tables
            .iter()
            .find(|table| names_equal(&table.name, name))
    }

    fn table_required(&self, name: &str) -> Result<&Table> {
        self.table(name)
            .ok_or_else(|| DbError::Schema(format!("unknown table '{name}'")))
    }

    fn table_mut(&mut self, name: &str) -> Result<&mut Table> {
        self.tables
            .iter_mut()
            .find(|table| names_equal(&table.name, name))
            .ok_or_else(|| DbError::Schema(format!("unknown table '{name}'")))
    }
}

fn names_equal(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

fn column_index(table: &Table, name: &str) -> Result<usize> {
    table
        .columns
        .iter()
        .position(|column| names_equal(&column.name, name))
        .ok_or_else(|| DbError::Schema(format!("unknown column '{name}'")))
}

fn validate_row(columns: &[ColumnDefinition], row: &[Value]) -> Result<()> {
    for (column, value) in columns.iter().zip(row) {
        validate_value(column, value)?;
    }
    Ok(())
}

fn validate_value(column: &ColumnDefinition, value: &Value) -> Result<()> {
    match value {
        Value::Null if !column.nullable => Err(DbError::Constraint(format!(
            "column '{}' may not be NULL",
            column.name
        ))),
        Value::Null => Ok(()),
        Value::Integer(_) if column.data_type == ColumnType::Integer => Ok(()),
        Value::Text(_) if column.data_type == ColumnType::Text => Ok(()),
        Value::Integer(_) => Err(DbError::Type(format!(
            "column '{}' expects TEXT, got INTEGER",
            column.name
        ))),
        Value::Text(_) => Err(DbError::Type(format!(
            "column '{}' expects INTEGER, got TEXT",
            column.name
        ))),
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Truth {
    True,
    False,
    Unknown,
}

fn validate_filter(table: &Table, filter: Option<&Expr>) -> Result<()> {
    if let Some(expression) = filter {
        for column in referenced_columns(expression) {
            column_index(table, column)?;
        }
        if table.rows.is_empty() {
            let null_row = vec![Value::Null; table.columns.len()];
            let _ = evaluate_predicate(&table.columns, &null_row, expression)?;
        }
    }
    Ok(())
}

fn referenced_columns(expression: &Expr) -> Vec<&str> {
    let mut columns = Vec::new();
    collect_columns(expression, &mut columns);
    columns
}

fn collect_columns<'a>(expression: &'a Expr, columns: &mut Vec<&'a str>) {
    match expression {
        Expr::Column(name) => columns.push(name),
        Expr::Binary { left, right, .. } => {
            collect_columns(left, columns);
            collect_columns(right, columns);
        }
        Expr::Unary { expression, .. } | Expr::IsNull { expression, .. } => {
            collect_columns(expression, columns);
        }
        Expr::Literal(_) => {}
    }
}

fn matches_filter(table: &Table, row: &[Value], filter: Option<&Expr>) -> Result<bool> {
    matches_filter_parts(&table.columns, row, filter)
}

fn matches_filter_parts(
    columns: &[ColumnDefinition],
    row: &[Value],
    filter: Option<&Expr>,
) -> Result<bool> {
    match filter {
        None => Ok(true),
        Some(expression) => Ok(evaluate_predicate(columns, row, expression)? == Truth::True),
    }
}

fn evaluate_predicate(
    columns: &[ColumnDefinition],
    row: &[Value],
    expression: &Expr,
) -> Result<Truth> {
    match expression {
        Expr::Unary { expression, .. } => Ok(match evaluate_predicate(columns, row, expression)? {
            Truth::True => Truth::False,
            Truth::False => Truth::True,
            Truth::Unknown => Truth::Unknown,
        }),
        Expr::IsNull {
            expression,
            negated,
        } => {
            let is_null = evaluate_value(columns, row, expression)? == Value::Null;
            Ok(if is_null != *negated {
                Truth::True
            } else {
                Truth::False
            })
        }
        Expr::Binary {
            left,
            operator: BinaryOperator::And,
            right,
        } => truth_and(
            evaluate_predicate(columns, row, left)?,
            evaluate_predicate(columns, row, right)?,
        ),
        Expr::Binary {
            left,
            operator: BinaryOperator::Or,
            right,
        } => truth_or(
            evaluate_predicate(columns, row, left)?,
            evaluate_predicate(columns, row, right)?,
        ),
        Expr::Binary {
            left,
            operator,
            right,
        } => compare_values(
            &evaluate_value(columns, row, left)?,
            *operator,
            &evaluate_value(columns, row, right)?,
        ),
        _ => Err(DbError::Type(
            "WHERE expression must be a comparison, NULL test, or boolean expression".into(),
        )),
    }
}

fn evaluate_value(columns: &[ColumnDefinition], row: &[Value], expression: &Expr) -> Result<Value> {
    match expression {
        Expr::Literal(value) => Ok(value.clone()),
        Expr::Column(name) => columns
            .iter()
            .position(|column| names_equal(&column.name, name))
            .map(|index| row[index].clone())
            .ok_or_else(|| DbError::Schema(format!("unknown column '{name}'"))),
        _ => Err(DbError::Type("expected a column or literal value".into())),
    }
}

fn compare_values(left: &Value, operator: BinaryOperator, right: &Value) -> Result<Truth> {
    if matches!(left, Value::Null) || matches!(right, Value::Null) {
        return Ok(Truth::Unknown);
    }
    let ordering = match (left, right) {
        (Value::Integer(left), Value::Integer(right)) => left.cmp(right),
        (Value::Text(left), Value::Text(right)) => left.cmp(right),
        _ => {
            return Err(DbError::Type(
                "cannot compare INTEGER and TEXT values".into(),
            ));
        }
    };
    let value = match operator {
        BinaryOperator::Equal => ordering.is_eq(),
        BinaryOperator::NotEqual => ordering.is_ne(),
        BinaryOperator::Less => ordering.is_lt(),
        BinaryOperator::LessEqual => ordering.is_le(),
        BinaryOperator::Greater => ordering.is_gt(),
        BinaryOperator::GreaterEqual => ordering.is_ge(),
        BinaryOperator::And | BinaryOperator::Or => unreachable!(),
    };
    Ok(if value { Truth::True } else { Truth::False })
}

fn truth_and(left: Truth, right: Truth) -> Result<Truth> {
    Ok(match (left, right) {
        (Truth::False, _) | (_, Truth::False) => Truth::False,
        (Truth::Unknown, _) | (_, Truth::Unknown) => Truth::Unknown,
        _ => Truth::True,
    })
}

fn truth_or(left: Truth, right: Truth) -> Result<Truth> {
    Ok(match (left, right) {
        (Truth::True, _) | (_, Truth::True) => Truth::True,
        (Truth::Unknown, _) | (_, Truth::Unknown) => Truth::Unknown,
        _ => Truth::False,
    })
}

#[cfg(test)]
mod tests {
    use crate::parser::parse_sql;

    use super::*;

    fn execute_all(database: &mut Database, sql: &str) -> Result<Vec<ExecutionResult>> {
        parse_sql(sql)?
            .into_iter()
            .map(|statement| database.execute(statement))
            .collect()
    }

    #[test]
    fn executes_crud_and_projection() {
        let mut database = Database::in_memory();
        let results = execute_all(
            &mut database,
            "CREATE TABLE users (id INTEGER NOT NULL, name TEXT);\
             INSERT INTO users VALUES (1, 'Mochi');\
             INSERT INTO users (id) VALUES (2);\
             UPDATE users SET name = 'Ann' WHERE id = 2;\
             SELECT name FROM users WHERE id >= 2;\
             DELETE FROM users WHERE id = 1;",
        )
        .unwrap();
        assert_eq!(
            results[4],
            ExecutionResult::Query {
                columns: vec!["name".into()],
                rows: vec![vec![Value::Text("Ann".into())]],
            }
        );
        assert_eq!(results[5], ExecutionResult::Modified(1));
    }

    #[test]
    fn implements_null_three_value_logic() {
        let mut database = Database::in_memory();
        let results = execute_all(
            &mut database,
            "CREATE TABLE t (value INTEGER);\
             INSERT INTO t VALUES (NULL);\
             SELECT * FROM t WHERE value = NULL;\
             SELECT * FROM t WHERE value IS NULL;",
        )
        .unwrap();
        assert!(matches!(&results[2], ExecutionResult::Query { rows, .. } if rows.is_empty()));
        assert!(matches!(&results[3], ExecutionResult::Query { rows, .. } if rows.len() == 1));
    }

    #[test]
    fn rejects_type_and_not_null_violations() {
        let mut database = Database::in_memory();
        execute_all(&mut database, "CREATE TABLE t (id INTEGER NOT NULL)").unwrap();
        assert!(execute_all(&mut database, "INSERT INTO t VALUES ('wrong')").is_err());
        assert!(execute_all(&mut database, "INSERT INTO t VALUES (NULL)").is_err());
    }
}
