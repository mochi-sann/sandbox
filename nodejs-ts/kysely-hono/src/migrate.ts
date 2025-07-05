#!/usr/bin/env node

import { migrateToLatest, migrateDown } from './migrator';

async function main() {
  const command = process.argv[2];

  if (command === 'up') {
    console.log('Running migrations...');
    await migrateToLatest();
    console.log('Migrations completed successfully');
  } else if (command === 'down') {
    console.log('Rolling back migrations...');
    await migrateDown();
    console.log('Rollback completed successfully');
  } else {
    console.log('Usage: npm run migrate:up | npm run migrate:down');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});