import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('todos')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('completed', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn(
      'created_at',
      'datetime',
      (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn(
      'updated_at',
      'datetime',
      (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('todos').execute();
}