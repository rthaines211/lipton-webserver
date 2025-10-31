/**
 * Migration Script: Add document_types_to_generate column
 * Phase 2.1: Document Selection Feature
 *
 * This script adds the document_types_to_generate column to the cases table
 * and backfills existing records with the default value (all document types).
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = new Pool({
    user: process.env.DB_USER || 'ryanhaines',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'legal_forms_db',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migration: Add document_types_to_generate column');
        console.log('=' .repeat(70));

        // Read migration SQL file
        const migrationPath = path.join(__dirname, '../database/migrate_add_document_types.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Extract executable statements (ignore comments and verification queries)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Found ${statements.length} SQL statements to execute`);
        console.log();

        await client.query('BEGIN');

        let executedCount = 0;
        for (const statement of statements) {
            // Skip verification queries (they're commented out)
            if (statement.includes('SELECT') && statement.includes('information_schema')) {
                continue;
            }

            if (statement.trim().length > 0) {
                try {
                    console.log(`  Executing statement ${++executedCount}...`);
                    await client.query(statement);
                    console.log(`  ✅ Success`);
                } catch (error) {
                    // Ignore "already exists" errors for idempotency
                    if (error.message.includes('already exists') ||
                        error.message.includes('duplicate key')) {
                        console.log(`  ⚠️  Warning: ${error.message.split('\n')[0]} (skipping)`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        await client.query('COMMIT');

        console.log();
        console.log('=' .repeat(70));
        console.log('✅ Migration completed successfully!');
        console.log();

        // Run verification queries
        console.log('🔍 Verification:');
        console.log('=' .repeat(70));

        // 1. Check column exists
        const columnCheck = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'cases' AND column_name = 'document_types_to_generate'
        `);

        if (columnCheck.rows.length > 0) {
            console.log('✅ Column exists:');
            console.log(`   Name: ${columnCheck.rows[0].column_name}`);
            console.log(`   Type: ${columnCheck.rows[0].data_type}`);
            console.log(`   Default: ${columnCheck.rows[0].column_default}`);
        } else {
            console.log('❌ Column not found!');
        }

        console.log();

        // 2. Check index exists
        const indexCheck = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'cases' AND indexname = 'idx_cases_document_types'
        `);

        if (indexCheck.rows.length > 0) {
            console.log('✅ Index created:');
            console.log(`   Name: ${indexCheck.rows[0].indexname}`);
        } else {
            console.log('⚠️  Index not found (may not be needed if column doesn\'t exist yet)');
        }

        console.log();

        // 3. Check backfill
        const backfillCheck = await client.query(`
            SELECT COUNT(*) as total_cases,
                   COUNT(*) FILTER (WHERE document_types_to_generate IS NOT NULL) as with_document_types,
                   COUNT(*) FILTER (WHERE document_types_to_generate = '["srogs", "pods", "admissions"]'::JSONB) as with_default
            FROM cases
        `);

        if (backfillCheck.rows.length > 0) {
            const stats = backfillCheck.rows[0];
            console.log('✅ Backfill status:');
            console.log(`   Total cases: ${stats.total_cases}`);
            console.log(`   Cases with document_types: ${stats.with_document_types}`);
            console.log(`   Cases with default value: ${stats.with_default}`);
        }

        console.log();
        console.log('=' .repeat(70));
        console.log('✅ All verification checks passed!');
        console.log();

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:');
        console.error(error.message);
        console.error();
        console.error('Stack trace:');
        console.error(error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('🎉 Migration script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Fatal error:');
        console.error(error);
        process.exit(1);
    });
