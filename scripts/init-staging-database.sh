#!/bin/bash

#=============================================================================
# Staging Database Schema Initialization
#=============================================================================
# This script initializes the staging database with the required schema
# (tables, views, functions, triggers)
#
# Prerequisites:
# - Cloud SQL instance 'legal-forms-db-staging' must exist
# - Database 'legal_forms_db_staging' must exist
# - User 'app-user-staging' must exist
# - Secret 'DB_PASSWORD_STAGING' must exist in Secret Manager
#
# Usage:
#   ./scripts/init-staging-database.sh
#=============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
INSTANCE_NAME="legal-forms-db-staging"
DATABASE_NAME="legal_forms_db_staging"
DB_USER="app-user-staging"
REGION="us-central1"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Staging Database Schema Initialization                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check if schema.sql exists
echo -e "${YELLOW}Step 1: Checking for schema file...${NC}"
if [ ! -f "schema.sql" ]; then
    echo -e "${RED}❌ Error: schema.sql not found${NC}"
    echo "   Please run this script from the project root directory"
    exit 1
fi
echo -e "${GREEN}✅ Found schema.sql${NC}"
echo ""

# Step 2: Retrieve database password from Secret Manager
echo -e "${YELLOW}Step 2: Retrieving database password from Secret Manager...${NC}"
DB_PASSWORD=$(gcloud secrets versions access latest \
    --secret="DB_PASSWORD_STAGING" \
    --project="$PROJECT_ID" 2>/dev/null)

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Failed to retrieve database password${NC}"
    echo "   Make sure DB_PASSWORD_STAGING secret exists"
    exit 1
fi
echo -e "${GREEN}✅ Password retrieved${NC}"
echo ""

# Step 3: Create Cloud SQL compatible schema
echo -e "${YELLOW}Step 3: Preparing Cloud SQL compatible schema...${NC}"
cat schema.sql | \
    sed 's/OWNER TO ryanhaines/-- OWNER TO app-user-staging/g' | \
    grep -v '\\restrict\|\\unrestrict' \
    > /tmp/staging-schema-temp.sql

echo -e "${GREEN}✅ Schema file prepared${NC}"
echo ""

# Step 4: Get Cloud SQL connection name
echo -e "${YELLOW}Step 4: Getting Cloud SQL connection details...${NC}"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
echo "   Connection: $CONNECTION_NAME"
echo ""

# Step 5: Check if tables already exist
echo -e "${YELLOW}Step 5: Checking current database state...${NC}"
EXISTING_TABLES=$(PGPASSWORD="$DB_PASSWORD" psql \
    "host=/cloudsql/${CONNECTION_NAME} dbname=${DATABASE_NAME} user=${DB_USER}" \
    -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null || echo "0")

EXISTING_TABLES=$(echo "$EXISTING_TABLES" | tr -d ' ')

if [ "$EXISTING_TABLES" != "0" ] && [ -n "$EXISTING_TABLES" ]; then
    echo -e "${YELLOW}⚠️  Warning: Database already has $EXISTING_TABLES tables${NC}"
    echo ""
    echo "   Existing tables will be preserved unless there are conflicts"
    echo "   This script uses CREATE TABLE IF NOT EXISTS where possible"
    echo ""
    read -p "   Continue? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Operation cancelled${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Database is empty, ready for initialization${NC}"
fi
echo ""

# Step 6: Initialize database schema
echo -e "${YELLOW}Step 6: Initializing database schema...${NC}"
echo "   This may take a minute..."
echo ""

# Try using Cloud SQL Proxy if available, otherwise use direct connection
if command -v cloud-sql-proxy >/dev/null 2>&1; then
    # Use Cloud SQL Proxy method
    echo -e "${BLUE}   Using Cloud SQL Proxy method...${NC}"

    # Start proxy in background
    cloud-sql-proxy "$CONNECTION_NAME" --port=5433 &
    PROXY_PID=$!

    # Wait for proxy to be ready
    sleep 3

    # Execute schema
    PGPASSWORD="$DB_PASSWORD" psql \
        -h localhost \
        -p 5433 \
        -U "$DB_USER" \
        -d "$DATABASE_NAME" \
        -f /tmp/staging-schema-temp.sql

    # Kill proxy
    kill $PROXY_PID 2>/dev/null || true
else
    # Use Unix socket method (requires gcloud components install cloud-sql-proxy)
    echo -e "${BLUE}   Using Unix socket method...${NC}"

    PGPASSWORD="$DB_PASSWORD" psql \
        "host=/cloudsql/${CONNECTION_NAME} dbname=${DATABASE_NAME} user=${DB_USER}" \
        -f /tmp/staging-schema-temp.sql
fi

echo ""
echo -e "${GREEN}✅ Schema initialization complete!${NC}"
echo ""

# Step 7: Verify tables were created
echo -e "${YELLOW}Step 7: Verifying table creation...${NC}"

if command -v cloud-sql-proxy >/dev/null 2>&1; then
    cloud-sql-proxy "$CONNECTION_NAME" --port=5433 &
    PROXY_PID=$!
    sleep 3

    TABLES=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h localhost \
        -p 5433 \
        -U "$DB_USER" \
        -d "$DATABASE_NAME" \
        -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")

    kill $PROXY_PID 2>/dev/null || true
else
    TABLES=$(PGPASSWORD="$DB_PASSWORD" psql \
        "host=/cloudsql/${CONNECTION_NAME} dbname=${DATABASE_NAME} user=${DB_USER}" \
        -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
fi

echo ""
echo -e "${GREEN}✅ Tables created:${NC}"
echo "$TABLES" | sed 's/^/   • /'
echo ""

# Cleanup
rm -f /tmp/staging-schema-temp.sql

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Staging Database Ready!                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "   1. Test staging deployment: curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health"
echo "   2. Submit a test form to verify database writes work"
echo "   3. Check staging logs: gcloud run services logs read node-server-staging --region=us-central1"
echo ""
