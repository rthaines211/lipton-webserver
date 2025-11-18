#!/bin/bash

# Migration Runner Script
# This script runs the database migration for the intake system

echo "==================================="
echo "Running Intake System Migration"
echo "==================================="
echo ""

# Database connection details
DB_HOST="legal-forms-db-dev"
DB_USER="app-user-dev"
DB_NAME="legal_forms_db_dev"
DB_PASSWORD="VVAqB2mUqdAxIBnej1MnYjg3v"

echo "Step 1: Connecting to database..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Run the migration using gcloud sql connect with the migration file
echo "Step 2: Running migration..."
echo ""

gcloud sql connect $DB_HOST --user=$DB_USER --database=$DB_NAME << EOF
-- Begin migration
\\echo 'Starting migration 001_create_intake_tables.sql...'
\\i migrations/001_create_intake_tables.sql

-- Verify tables were created
\\echo ''
\\echo 'Verifying tables were created:'
\\echo '================================'
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'intake_submissions',
    'intake_page_1',
    'intake_page_2',
    'intake_page_3',
    'intake_page_4',
    'intake_page_5',
    'saved_sessions',
    'attorneys',
    'audit_logs'
)
ORDER BY tablename;

\\echo ''
\\echo 'Checking indexes:'
\\echo '================================'
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs')
ORDER BY tablename, indexname;

\\echo ''
\\echo 'Migration complete!'
\\q
EOF

echo ""
echo "==================================="
echo "Migration Status"
echo "==================================="

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Create the rollback script"
    echo "2. Test with sample data"
    echo "3. Commit the migration to git"
else
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "To debug:"
    echo "1. Check the migration file syntax"
    echo "2. Verify database connectivity"
    echo "3. Check if tables already exist"
fi