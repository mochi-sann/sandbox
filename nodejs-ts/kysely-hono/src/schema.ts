import { ColumnType, Generated, sql } from "kysely";

export interface Schema {
  todos: TodosTable;
}

export interface TodosTable {
  id: Generated<number>;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: "integer" | "text" | "boolean" | "datetime" | "real";
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  defaultValue?: string | number | boolean;
  defaultExpression?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

export const SCHEMA_DEFINITION: TableDefinition[] = [
  {
    name: "users",
    columns: [
      {
        name: "id",
        type: "integer",
        primaryKey: true,
        autoIncrement: true,
      },
      {
        name: "name",
        type: "text",
        nullable: false,
      },
      {
        name: "password",
        type: "text",
        nullable: false,
      },
      {
        name: "created_at",
        type: "datetime",
        nullable: false,
        defaultExpression: "CURRENT_TIMESTAMP",
      },
      {
        name: "updated_at",
        type: "datetime",
        nullable: false,
        defaultExpression: "CURRENT_TIMESTAMP",
      },
    ],
  },
  {
    name: "todos",
    columns: [
      {
        name: "id",
        type: "integer",
        primaryKey: true,
        autoIncrement: true,
      },
      {
        name: "title",
        type: "text",
        nullable: false,
      },
      {
        name: "description",
        type: "text",
        nullable: true,
      },
      {
        name: "completed",
        type: "boolean",
        nullable: false,
        defaultValue: false,
      },
      {
        name: "created_at",
        type: "datetime",
        nullable: false,
        defaultExpression: "CURRENT_TIMESTAMP",
      },
      {
        name: "updated_at",
        type: "datetime",
        nullable: false,
        defaultExpression: "CURRENT_TIMESTAMP",
      },
    ],
  },
];

export function generateTableCreationSQL(table: TableDefinition): string {
  const columns = table.columns
    .map((col) => {
      let columnDef = `${col.name} ${col.type.toUpperCase()}`;

      if (col.primaryKey) {
        columnDef += " PRIMARY KEY";
      }

      if (col.autoIncrement) {
        columnDef += " AUTOINCREMENT";
      }

      if (!col.nullable && !col.primaryKey) {
        columnDef += " NOT NULL";
      }

      if (col.defaultValue !== undefined) {
        if (typeof col.defaultValue === "string") {
          columnDef += ` DEFAULT '${col.defaultValue}'`;
        } else {
          columnDef += ` DEFAULT ${col.defaultValue}`;
        }
      }

      if (col.defaultExpression) {
        columnDef += ` DEFAULT ${col.defaultExpression}`;
      }

      return columnDef;
    })
    .join(",\n    ");

  return `CREATE TABLE ${table.name} (\n    ${columns}\n);`;
}
