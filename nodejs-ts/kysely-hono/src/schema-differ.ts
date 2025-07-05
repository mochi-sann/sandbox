import { TableDefinition, ColumnDefinition } from './schema';

export interface SchemaDiff {
  addedTables: TableDefinition[];
  removedTables: string[];
  modifiedTables: TableModification[];
}

export interface TableModification {
  tableName: string;
  addedColumns: ColumnDefinition[];
  removedColumns: string[];
  modifiedColumns: ColumnModification[];
}

export interface ColumnModification {
  columnName: string;
  oldColumn: ColumnDefinition;
  newColumn: ColumnDefinition;
}

export function compareSchemas(oldSchema: TableDefinition[], newSchema: TableDefinition[]): SchemaDiff {
  const diff: SchemaDiff = {
    addedTables: [],
    removedTables: [],
    modifiedTables: [],
  };

  const oldTableMap = new Map(oldSchema.map(t => [t.name, t]));
  const newTableMap = new Map(newSchema.map(t => [t.name, t]));

  // Find added tables
  for (const newTable of newSchema) {
    if (!oldTableMap.has(newTable.name)) {
      diff.addedTables.push(newTable);
    }
  }

  // Find removed tables
  for (const oldTable of oldSchema) {
    if (!newTableMap.has(oldTable.name)) {
      diff.removedTables.push(oldTable.name);
    }
  }

  // Find modified tables
  for (const newTable of newSchema) {
    const oldTable = oldTableMap.get(newTable.name);
    if (oldTable) {
      const tableModification = compareTableDefinitions(oldTable, newTable);
      if (tableModification) {
        diff.modifiedTables.push(tableModification);
      }
    }
  }

  return diff;
}

function compareTableDefinitions(oldTable: TableDefinition, newTable: TableDefinition): TableModification | null {
  const modification: TableModification = {
    tableName: newTable.name,
    addedColumns: [],
    removedColumns: [],
    modifiedColumns: [],
  };

  const oldColumnMap = new Map(oldTable.columns.map(c => [c.name, c]));
  const newColumnMap = new Map(newTable.columns.map(c => [c.name, c]));

  // Find added columns
  for (const newColumn of newTable.columns) {
    if (!oldColumnMap.has(newColumn.name)) {
      modification.addedColumns.push(newColumn);
    }
  }

  // Find removed columns
  for (const oldColumn of oldTable.columns) {
    if (!newColumnMap.has(oldColumn.name)) {
      modification.removedColumns.push(oldColumn.name);
    }
  }

  // Find modified columns
  for (const newColumn of newTable.columns) {
    const oldColumn = oldColumnMap.get(newColumn.name);
    if (oldColumn && !areColumnsEqual(oldColumn, newColumn)) {
      modification.modifiedColumns.push({
        columnName: newColumn.name,
        oldColumn,
        newColumn,
      });
    }
  }

  // Return null if no changes
  if (
    modification.addedColumns.length === 0 &&
    modification.removedColumns.length === 0 &&
    modification.modifiedColumns.length === 0
  ) {
    return null;
  }

  return modification;
}

function areColumnsEqual(col1: ColumnDefinition, col2: ColumnDefinition): boolean {
  return (
    col1.name === col2.name &&
    col1.type === col2.type &&
    col1.nullable === col2.nullable &&
    col1.primaryKey === col2.primaryKey &&
    col1.autoIncrement === col2.autoIncrement &&
    col1.defaultValue === col2.defaultValue &&
    col1.defaultExpression === col2.defaultExpression
  );
}

export function generateMigrationFromDiff(diff: SchemaDiff, migrationName: string): string {
  let upStatements: string[] = [];
  let downStatements: string[] = [];

  // Handle added tables
  for (const table of diff.addedTables) {
    upStatements.push(generateCreateTableStatement(table));
    downStatements.push(`await db.schema.dropTable('${table.name}').execute();`);
  }

  // Handle removed tables
  for (const tableName of diff.removedTables) {
    upStatements.push(`await db.schema.dropTable('${tableName}').execute();`);
    // Note: We can't recreate the table structure for down migration without more info
    downStatements.push(`// TODO: Recreate table '${tableName}' structure`);
  }

  // Handle modified tables
  for (const tableModification of diff.modifiedTables) {
    const { tableName, addedColumns, removedColumns, modifiedColumns } = tableModification;

    // Add columns
    for (const column of addedColumns) {
      upStatements.push(generateAddColumnStatement(tableName, column));
      downStatements.push(`await db.schema.alterTable('${tableName}').dropColumn('${column.name}').execute();`);
    }

    // Remove columns
    for (const columnName of removedColumns) {
      upStatements.push(`await db.schema.alterTable('${tableName}').dropColumn('${columnName}').execute();`);
      downStatements.push(`// TODO: Recreate column '${columnName}' in table '${tableName}'`);
    }

    // Modify columns (SQLite doesn't support ALTER COLUMN, so we use recreate table approach)
    for (const columnMod of modifiedColumns) {
      upStatements.push(`// TODO: Modify column '${columnMod.columnName}' in table '${tableName}' (requires table recreation in SQLite)`);
      downStatements.push(`// TODO: Revert column '${columnMod.columnName}' in table '${tableName}'`);
    }
  }

  return generateMigrationFileContent(migrationName, upStatements, downStatements);
}

function generateCreateTableStatement(table: TableDefinition): string {
  const columns = table.columns.map(col => {
    let columnDef = `'${col.name}', '${col.type}'`;
    
    const options: string[] = [];
    
    if (col.primaryKey) {
      options.push('col.primaryKey()');
    }
    
    if (col.autoIncrement) {
      options.push('col.autoIncrement()');
    }
    
    if (!col.nullable && !col.primaryKey) {
      options.push('col.notNull()');
    }
    
    if (col.defaultValue !== undefined) {
      if (typeof col.defaultValue === 'string') {
        options.push(`col.defaultTo('${col.defaultValue}')`);
      } else {
        options.push(`col.defaultTo(${col.defaultValue})`);
      }
    }
    
    if (col.defaultExpression) {
      options.push(`col.defaultTo(sql\`${col.defaultExpression}\`)`);
    }
    
    if (options.length > 0) {
      columnDef += `, (col) => ${options.join('.')}`;
    }
    
    return `.addColumn(${columnDef})`;
  }).join('\n    ');

  return `await db.schema
    .createTable('${table.name}')${columns}
    .execute();`;
}

function generateAddColumnStatement(tableName: string, column: ColumnDefinition): string {
  let columnDef = `'${column.name}', '${column.type}'`;
  
  const options: string[] = [];
  
  if (!column.nullable) {
    options.push('col.notNull()');
  }
  
  if (column.defaultValue !== undefined) {
    if (typeof column.defaultValue === 'string') {
      options.push(`col.defaultTo('${column.defaultValue}')`);
    } else {
      options.push(`col.defaultTo(${column.defaultValue})`);
    }
  }
  
  if (column.defaultExpression) {
    options.push(`col.defaultTo(sql\`${column.defaultExpression}\`)`);
  }
  
  if (options.length > 0) {
    columnDef += `, (col) => ${options.join('.')}`;
  }
  
  return `await db.schema.alterTable('${tableName}').addColumn(${columnDef}).execute();`;
}

function generateMigrationFileContent(migrationName: string, upStatements: string[], downStatements: string[]): string {
  return `import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  ${upStatements.join('\n  ')}
}

export async function down(db: Kysely<any>): Promise<void> {
  ${downStatements.reverse().join('\n  ')}
}`;
}