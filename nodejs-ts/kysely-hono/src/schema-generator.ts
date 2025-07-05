#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { SCHEMA_DEFINITION, TableDefinition } from './schema';
import { compareSchemas, generateMigrationFromDiff } from './schema-differ';

const SCHEMA_SNAPSHOT_PATH = path.join(__dirname, '../.schema-snapshot.json');
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function generateMigration() {
  try {
    // Read the previous schema snapshot
    let previousSchema: TableDefinition[] = [];
    try {
      const snapshotData = await fs.readFile(SCHEMA_SNAPSHOT_PATH, 'utf8');
      previousSchema = JSON.parse(snapshotData);
    } catch (error) {
      console.log('No previous schema snapshot found. Creating initial migration...');
    }

    // Compare schemas
    const diff = compareSchemas(previousSchema, SCHEMA_DEFINITION);

    // Check if there are any changes
    if (
      diff.addedTables.length === 0 &&
      diff.removedTables.length === 0 &&
      diff.modifiedTables.length === 0
    ) {
      console.log('No schema changes detected.');
      return;
    }

    // Generate migration name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const migrationName = `${timestamp}_schema_changes`;
    const migrationFileName = `${migrationName}.ts`;
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFileName);

    // Generate migration content
    const migrationContent = generateMigrationFromDiff(diff, migrationName);

    // Ensure migrations directory exists
    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });

    // Write migration file
    await fs.writeFile(migrationPath, migrationContent);

    // Update schema snapshot
    await fs.writeFile(SCHEMA_SNAPSHOT_PATH, JSON.stringify(SCHEMA_DEFINITION, null, 2));

    console.log(`Migration generated: ${migrationFileName}`);
    console.log(`Changes detected:`);
    
    if (diff.addedTables.length > 0) {
      console.log(`  Added tables: ${diff.addedTables.map(t => t.name).join(', ')}`);
    }
    
    if (diff.removedTables.length > 0) {
      console.log(`  Removed tables: ${diff.removedTables.join(', ')}`);
    }
    
    if (diff.modifiedTables.length > 0) {
      console.log(`  Modified tables: ${diff.modifiedTables.map(t => t.tableName).join(', ')}`);
    }

  } catch (error) {
    console.error('Error generating migration:', error);
    process.exit(1);
  }
}

async function initSchema() {
  try {
    // Create initial schema snapshot
    await fs.writeFile(SCHEMA_SNAPSHOT_PATH, JSON.stringify(SCHEMA_DEFINITION, null, 2));
    console.log('Schema snapshot initialized');
  } catch (error) {
    console.error('Error initializing schema:', error);
    process.exit(1);
  }
}

async function showSchemaDiff() {
  try {
    let previousSchema: TableDefinition[] = [];
    try {
      const snapshotData = await fs.readFile(SCHEMA_SNAPSHOT_PATH, 'utf8');
      previousSchema = JSON.parse(snapshotData);
    } catch (error) {
      console.log('No previous schema snapshot found.');
      return;
    }

    const diff = compareSchemas(previousSchema, SCHEMA_DEFINITION);

    if (
      diff.addedTables.length === 0 &&
      diff.removedTables.length === 0 &&
      diff.modifiedTables.length === 0
    ) {
      console.log('No schema changes detected.');
      return;
    }

    console.log('Schema changes detected:');
    console.log(JSON.stringify(diff, null, 2));
  } catch (error) {
    console.error('Error showing schema diff:', error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'generate':
      await generateMigration();
      break;
    case 'init':
      await initSchema();
      break;
    case 'diff':
      await showSchemaDiff();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run schema:generate - Generate migration from schema changes');
      console.log('  npm run schema:init     - Initialize schema snapshot');
      console.log('  npm run schema:diff     - Show schema differences');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Schema generator failed:', error);
  process.exit(1);
});