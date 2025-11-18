#!/bin/bash

# Direct psql migration runner using Cloud SQL connection
# This bypasses gcloud sql connect and uses psql directly

set -e

echo "==================================="
echo "Running Intake System Migration"
echo "==================================="
echo ""

# Get credentials from secrets
DB_PASSWORD=$(gcloud secrets versions access latest --secret=DB_PASSWORD_DEV)
DB_USER="app-user-dev"
DB_NAME="legal_forms_db_dev"
INSTANCE_CONNECTION="docmosis-tornado:us-central1:legal-forms-db-dev"

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

echo "Step 1: Starting Cloud SQL Proxy in background..."
# Start Cloud SQL Proxy
cloud-sql-proxy $INSTANCE_CONNECTION &
PROXY_PID=$!

# Give proxy time to start
sleep 3

echo "Step 2: Connecting to database via proxy..."
export PGPASSWORD="$DB_PASSWORD"

# Run migration
echo "Step 3: Executing migration..."
psql -h localhost -U $DB_USER -d $DB_NAME -f migrations/001_create_intake_tables.sql

echo ""
echo "Step 4: Verifying tables..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'))
ORDER BY tablename;
"

echo ""
echo "Step 5: Counting indexes..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT COUNT(*) as index_count FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'));
"

# Stop proxy
echo ""
echo "Step 6: Stopping Cloud SQL Proxy..."
kill $PROXY_PID 2>/dev/null || true

echo ""
echo "==================================="
echo "✅ Migration completed successfully!"
echo "==================================="
