#!/bin/bash
#
# Test Database Connection Script
# Verifies local connection to Cloud SQL development database
#

set -e

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="legal_forms_db_dev"
DB_USER="app-user-dev"
DB_PASSWORD="VVAqB2mUqdAxIBnej1MnYjg3v"

export PGPASSWORD="$DB_PASSWORD"

echo "==================================================="
echo "Database Connection Test"
echo "==================================================="
echo ""

# Check if proxy is running
if ! lsof -Pi :$DB_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Cloud SQL Proxy is not running on port $DB_PORT"
    echo ""
    echo "Start it with:"
    echo "  ./scripts/start-db-proxy.sh"
    echo ""
    exit 1
fi

echo "✅ Cloud SQL Proxy is running on port $DB_PORT"
echo ""

# Test connection
echo "Testing database connection..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Try to connect and run a simple query
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW() as current_time;" 2>&1; then
    echo ""
    echo "✅ Database connection successful!"
    echo ""

    # Show table count
    echo "Listing tables in database..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"
    echo ""

    # Count form entries
    echo "Checking form_entries table..."
    ENTRY_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM form_entries;" 2>/dev/null | xargs || echo "0")
    echo "Total form entries: $ENTRY_COUNT"
    echo ""

    if [ "$ENTRY_COUNT" -gt 0 ]; then
        echo "Recent entries (last 5):"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT id, case_number, created_at FROM form_entries ORDER BY created_at DESC LIMIT 5;"
        echo ""
    fi

    echo "==================================================="
    echo "✅ All checks passed!"
    echo "==================================================="
    echo ""
    echo "You can now start your application with:"
    echo "  npm start"
    echo ""
    echo "Or connect with psql:"
    echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo ""
else
    echo ""
    echo "❌ Database connection failed"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure Cloud SQL Proxy is running:"
    echo "   ps aux | grep cloud-sql-proxy"
    echo ""
    echo "2. Check proxy logs for errors"
    echo ""
    echo "3. Verify credentials:"
    echo "   gcloud secrets versions access latest --secret=DB_PASSWORD_DEV"
    echo ""
    exit 1
fi

unset PGPASSWORD
