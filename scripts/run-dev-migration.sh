#!/bin/bash
# ============================================================================
# Run Migration on Dev Database
# ============================================================================
# Runs pending migrations on legal-forms-db-dev
# Usage: ./scripts/run-dev-migration.sh
# ============================================================================

set -e

echo "============================================================================"
echo "RUN MIGRATIONS ON DEV DATABASE"
echo "============================================================================"
echo ""

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
INSTANCE_NAME="legal-forms-db-dev"

echo "Starting Cloud SQL Proxy for dev..."
./cloud-sql-proxy "${PROJECT_ID}:${REGION}:${INSTANCE_NAME}" --port=5433 &
PROXY_PID=$!

echo "Proxy PID: $PROXY_PID"
echo "Waiting for proxy to initialize..."
sleep 5

if ! nc -z localhost 5433 2>/dev/null; then
    echo "❌ Cloud SQL Proxy failed to start"
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Cloud SQL Proxy ready"
echo ""

# Run migrations using the migration runner
# NOTE: Do NOT set INSTANCE_CONNECTION_NAME when using local proxy
# Setting it forces Unix socket mode instead of TCP
echo "Running migrations..."
DB_HOST=localhost \
DB_PORT=5433 \
DB_NAME=legal_forms_db_dev \
DB_USER=app-user-dev \
DB_PASSWORD="${DB_PASSWORD_DEV}" \
node db/migrations/run-migrations.js

EXIT_CODE=$?

# Cleanup proxy
echo ""
echo "Stopping Cloud SQL Proxy..."
kill $PROXY_PID 2>/dev/null || true

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed successfully"
else
    echo ""
    echo "❌ Migration failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
