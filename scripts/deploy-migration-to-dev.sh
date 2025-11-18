#!/bin/bash
# ============================================================================
# Deploy Migration to Dev Database
# ============================================================================
# Runs the intake schema migration on legal-forms-db-dev
# Usage: ./scripts/deploy-migration-to-dev.sh
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "DEPLOY MIGRATION TO DEV ENVIRONMENT"
echo "============================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
INSTANCE_NAME="legal-forms-db-dev"
DB_NAME="legal_forms_db_dev"
DB_USER="app-user-dev"
MIGRATION_FILE="database/migrations/001_create_intake_schema.sql"

echo -e "${BLUE}Configuration:${NC}"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Migration file found: $MIGRATION_FILE"
echo ""

# Check if Cloud SQL Proxy is running
if ! pgrep -f "cloud-sql-proxy.*$INSTANCE_NAME" > /dev/null; then
    echo -e "${YELLOW}⚠ Cloud SQL Proxy not running for dev instance${NC}"
    echo ""
    echo "Starting Cloud SQL Proxy..."

    # Start proxy in background
    ./cloud-sql-proxy "${PROJECT_ID}:${REGION}:${INSTANCE_NAME}" \
        --port=5433 \
        --quiet &

    PROXY_PID=$!
    echo "  Proxy PID: $PROXY_PID"

    # Wait for proxy to be ready
    echo -n "  Waiting for proxy to initialize"
    for i in {1..10}; do
        sleep 1
        echo -n "."
        if nc -z localhost 5433 2>/dev/null; then
            break
        fi
    done
    echo ""

    # Check if proxy is ready
    if ! nc -z localhost 5433 2>/dev/null; then
        echo -e "${RED}❌ Cloud SQL Proxy failed to start${NC}"
        kill $PROXY_PID 2>/dev/null || true
        exit 1
    fi

    echo -e "${GREEN}✓${NC} Cloud SQL Proxy started successfully"
    echo ""

    CLEANUP_PROXY=true
else
    echo -e "${GREEN}✓${NC} Cloud SQL Proxy already running"
    echo ""
    CLEANUP_PROXY=false
fi

# Test database connection
echo "Testing database connection..."
if PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connected to dev database successfully"
else
    echo -e "${RED}❌ Cannot connect to dev database${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. You have DB_PASSWORD_DEV environment variable set"
    echo "  2. Cloud SQL instance is running"
    echo "  3. Your IP is allowlisted (or using Cloud SQL Proxy)"
    echo ""

    if [ "$CLEANUP_PROXY" = true ]; then
        echo "Stopping Cloud SQL Proxy..."
        kill $PROXY_PID 2>/dev/null || true
    fi

    exit 1
fi
echo ""

# Check if tables already exist
echo "Checking for existing intake tables..."
TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'intake%';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}⚠ Found $TABLE_COUNT existing intake tables in dev database${NC}"
    echo ""
    PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'intake%' ORDER BY table_name;"
    echo ""

    read -p "$(echo -e ${YELLOW}Do you want to drop existing tables and re-create them? ${NC}[yes/no]: )" CONFIRM

    if [ "$CONFIRM" = "yes" ]; then
        echo "Running rollback migration..."
        PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -f "database/migrations/001_rollback_intake_schema.sql"
        echo -e "${GREEN}✓${NC} Rollback complete"
        echo ""
    else
        echo "Aborting migration"

        if [ "$CLEANUP_PROXY" = true ]; then
            echo "Stopping Cloud SQL Proxy..."
            kill $PROXY_PID 2>/dev/null || true
        fi

        exit 0
    fi
fi

# Run the migration
echo "============================================================================"
echo "RUNNING MIGRATION"
echo "============================================================================"
echo ""

if PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✓${NC} Migration executed successfully!"
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"

    if [ "$CLEANUP_PROXY" = true ]; then
        echo "Stopping Cloud SQL Proxy..."
        kill $PROXY_PID 2>/dev/null || true
    fi

    exit 1
fi

echo ""

# Verify tables created
echo "============================================================================"
echo "VERIFYING MIGRATION"
echo "============================================================================"
echo ""

CREATED_TABLES=$(PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'intake%';" | tr -d ' ')

echo "Tables created: $CREATED_TABLES"

if [ "$CREATED_TABLES" -eq "13" ]; then
    echo -e "${GREEN}✓${NC} All 13 intake tables created successfully!"
else
    echo -e "${YELLOW}⚠ Expected 13 tables, found $CREATED_TABLES${NC}"
fi

echo ""
echo "Intake tables in dev database:"
PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'intake%' ORDER BY table_name;"

echo ""

# Test intake number generation
echo "Testing intake number generation..."
INTAKE_NUM=$(PGPASSWORD="${DB_PASSWORD_DEV}" psql -h localhost -p 5433 -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT generate_intake_number();" | tr -d ' ')
echo "Generated: $INTAKE_NUM"

if [[ "$INTAKE_NUM" =~ ^INT-[0-9]{4}-[0-9]{5}$ ]]; then
    echo -e "${GREEN}✓${NC} Intake number generation working!"
else
    echo -e "${RED}✗${NC} Intake number format incorrect"
fi

echo ""

# Cleanup proxy if we started it
if [ "$CLEANUP_PROXY" = true ]; then
    echo "Stopping Cloud SQL Proxy..."
    kill $PROXY_PID 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Proxy stopped"
    echo ""
fi

# Final summary
echo "============================================================================"
echo "DEPLOYMENT COMPLETE"
echo "============================================================================"
echo ""
echo -e "${GREEN}✓${NC} Migration successfully deployed to dev environment"
echo -e "${GREEN}✓${NC} Database: $DB_NAME on $INSTANCE_NAME"
echo -e "${GREEN}✓${NC} Tables: $CREATED_TABLES intake tables created"
echo ""
echo "Next steps:"
echo "  1. Test the dev environment: https://node-server-dev-zyiwmzwenq-uc.a.run.app"
echo "  2. Verify API endpoints work (once implemented)"
echo "  3. Merge to develop branch when ready"
echo ""
echo "============================================================================"
