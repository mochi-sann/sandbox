import { Migrator, FileMigrationProvider } from 'kysely';
import { kysely } from './database';
import { promises as fs } from 'fs';
import path from 'path';

export async function migrateToLatest() {
  const migrator = new Migrator({
    db: kysely,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to migrate');
    console.error(error);
    process.exit(1);
  }
}

export async function migrateDown() {
  const migrator = new Migrator({
    db: kysely,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  });

  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was rolled back successfully`);
    } else if (it.status === 'Error') {
      console.error(`Failed to roll back migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to roll back migration');
    console.error(error);
    process.exit(1);
  }
}