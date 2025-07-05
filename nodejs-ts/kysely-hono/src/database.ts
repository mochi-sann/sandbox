import { Kysely, sql, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { Database as DatabaseType } from "./types";

const db = new Database("todos.db");

export const kysely = new Kysely<DatabaseType>({
  dialect: new SqliteDialect({
    database: db,
  }),
});

export async function createTable() {
  await kysely.schema
    .createTable("todos")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("completed", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn(
      "created_at",
      "datetime",
      (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn(
      "updated_at",
      "datetime",
      (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();
}
