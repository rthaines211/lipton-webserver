#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Runs SQL migration files in order against the PostgreSQL database.
 * Tracks which migrations have been executed in a 'migrations' table.
 *
 * Usage:
 *   node db/migrations/run-migrations.js
 *
 * Environment Variables:
 *   DB_HOST - Database host (default: localhost or Unix socket for Cloud SQL)
 *   DB_PORT - Database port (default: 5432)
 *   DB_NAME - Database name (required)
 *   DB_USER - Database user (required)
 *   DB_PASSWORD - Database password
 *   INSTANCE_CONNECTION_NAME - Cloud SQL instance connection name (e.g., project:region:instance)
 *
 * Exit Codes:
 *   0 - Success (all migrations applied or already applied)
 *   1 - Error (connection failed, migration failed, etc.)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration from environment
const config = {
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),

  // Cloud SQL connection handling
  // If INSTANCE_CONNECTION_NAME is set, use Unix socket
  // Otherwise use DB_HOST
  host: process.env.INSTANCE_CONNECTION_NAME
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
    : (process.env.DB_HOST || 'localhost'),

  // Connection pool settings
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
};

console.log('🔧 Migration Configuration:');
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log('');

// Create connection pool
const pool = new Pool(config);

// Directory containing migration files
const MIGRATIONS_DIR = path.join(__dirname);

/**
 * Ensure migrations tracking table exists
 */
async function ensureMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64),
      success BOOLEAN DEFAULT true
    );

    CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
    CREATE INDEX IF NOT EXISTS idx_migrations_executed ON migrations(executed_at DESC);
  `;

  try {
    await pool.query(createTableSQL);
    console.log('✅ Migrations table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error.message);
    throw error;
  }
}

/**
 * Get list of already-executed migrations
 */
async function getExecutedMigrations() {
  const result = await pool.query(
    'SELECT filename, executed_at FROM migrations WHERE success = true ORDER BY executed_at ASC'
  );
  return new Set(result.rows.map(row => row.filename));
}

/**
 * Get list of migration files to execute
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .filter(file => !file.includes('rollback')) // Skip rollback scripts
    .sort(); // Ensure alphabetical order (001, 002, etc.)

  return files;
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`📄 Executing migration: ${filename}`);
  console.log(`   File: ${filepath}`);

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Execute migration SQL
    const startTime = Date.now();
    await client.query(sql);
    const duration = Date.now() - startTime;

    // Record migration in tracking table
    await client.query(
      'INSERT INTO migrations (filename, executed_at, success) VALUES ($1, NOW(), true)',
      [filename]
    );

    // Commit transaction
    await client.query('COMMIT');

    console.log(`✅ Migration completed successfully (${duration}ms)`);
    console.log('');

    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');

    // Record failed migration
    try {
      await client.query(
        'INSERT INTO migrations (filename, executed_at, success) VALUES ($1, NOW(), false)',
        [filename]
      );
    } catch (recordError) {
      console.error('⚠️  Failed to record migration failure:', recordError.message);
    }

    console.error(`❌ Migration failed: ${filename}`);
    console.error(`   Error: ${error.message}`);
    console.error('');

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  console.log('');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('');

    // Ensure migrations table exists
    await ensureMigrationsTable();
    console.log('');

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📊 Already executed: ${executedMigrations.size} migration(s)`);

    // Get migration files
    const migrationFiles = getMigrationFiles();
    console.log(`📁 Found: ${migrationFiles.length} migration file(s)`);
    console.log('');

    // Filter out already-executed migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.has(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations - database is up to date!');
      console.log('');
      return;
    }

    console.log(`⏳ Pending migrations: ${pendingMigrations.length}`);
    console.log('');

    // Execute pending migrations in order
    let successCount = 0;
    for (const filename of pendingMigrations) {
      await executeMigration(filename);
      successCount++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total migrations: ${migrationFiles.length}`);
    console.log(`   Already executed: ${executedMigrations.size}`);
    console.log(`   Newly executed: ${successCount}`);
    console.log(`   Status: SUCCESS ✅`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ MIGRATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${error.message}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
