import { pool, testConnection } from './connection';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Database Migration Runner
 *
 * Simple migration system that runs SQL files in order
 */

async function createMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(query);
  console.log('✅ Migrations table ready');
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM migrations ORDER BY executed_at'
  );

  return new Set(result.rows.map(row => row.id));
}

async function getMigrationFiles(): Promise<{ id: string; filename: string; path: string }[]> {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  No migrations directory found');
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Lexical sort ensures 001, 002, etc. run in order

  return files.map(filename => ({
    id: filename.replace('.sql', ''),
    filename,
    path: path.join(migrationsDir, filename),
  }));
}

async function executeMigration(migration: { id: string; filename: string; path: string }): Promise<void> {
  console.log(`\n📝 Executing migration: ${migration.filename}`);

  const sql = fs.readFileSync(migration.path, 'utf-8');

  try {
    // Execute migration
    await pool.query(sql);

    // Record migration
    await pool.query(
      'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
      [migration.id, migration.filename]
    );

    console.log(`✅ Migration completed: ${migration.filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migration.filename}`);
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  console.log('\n🚀 Starting database migrations...\n');

  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Create migrations table
    await createMigrationsTable();

    // Get executed and pending migrations
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await getMigrationFiles();

    const pendingMigrations = migrationFiles.filter(
      m => !executedMigrations.has(m.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations. Database is up to date!');
      return;
    }

    console.log(`📊 Found ${pendingMigrations.length} pending migration(s)`);

    // Execute pending migrations in order
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

export async function rollbackLastMigration(): Promise<void> {
  console.log('\n⚠️  Rollback not implemented yet');
  console.log('To rollback, manually revert the database changes');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}
