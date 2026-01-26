#!/usr/bin/env tsx

/**
 * Migration Script Runner
 *
 * Run with: npm run migrate
 * or: tsx scripts/migrate.ts
 */

import 'dotenv/config';
import { runMigrations, closePool } from '../src/database';

async function main() {
  try {
    await runMigrations();
    await closePool();
    console.log('\n✅ Migration completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

main();
