#!/bin/bash
#
# Local Development Environment Checker
# Verifies all prerequisites and configurations
#

echo "==================================================="
echo "Local Development Environment Check"
echo "==================================================="
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not installed"
    echo "   Install from: https://nodejs.org/"
fi
echo ""

# 2. Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: v$NPM_VERSION"
else
    check_fail "npm not installed"
fi
echo ""

# 3. Check gcloud
echo "3. Checking gcloud CLI..."
if command -v gcloud &> /dev/null; then
    GCLOUD_VERSION=$(gcloud version --format="value(core)" 2>/dev/null)
    check_pass "gcloud CLI installed: $GCLOUD_VERSION"

    # Check authentication
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
        check_pass "Authenticated as: $ACTIVE_ACCOUNT"
    else
        check_fail "Not authenticated with gcloud"
        echo "   Run: gcloud auth login"
    fi
else
    check_fail "gcloud CLI not installed"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
fi
echo ""

# 4. Check Cloud SQL Proxy
echo "4. Checking Cloud SQL Proxy..."
if command -v cloud-sql-proxy &> /dev/null; then
    check_pass "Cloud SQL Proxy installed"
else
    check_warn "Cloud SQL Proxy not installed (will auto-install on first run)"
    echo "   Run: ./scripts/start-db-proxy.sh"
fi
echo ""

# 5. Check psql (PostgreSQL client)
echo "5. Checking PostgreSQL client..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    check_pass "psql installed: $PSQL_VERSION"
else
    check_warn "psql not installed (optional, but useful)"
    echo "   Install: brew install postgresql@14"
fi
echo ""

# 6. Check if project dependencies are installed
echo "6. Checking npm dependencies..."
if [ -d "node_modules" ]; then
    check_pass "npm dependencies installed"
else
    check_fail "npm dependencies not installed"
    echo "   Run: npm install"
fi
echo ""

# 7. Check .env file
echo "7. Checking .env file..."
if [ -f ".env" ]; then
    check_pass ".env file exists"

    # Check critical env vars
    if grep -q "DB_HOST=localhost" .env; then
        check_pass "Database configured for local development"
    else
        check_warn "Database might not be configured for local development"
        echo "   Expected: DB_HOST=localhost"
    fi

    if grep -q "DB_NAME=legal_forms_db_dev" .env; then
        check_pass "Using development database"
    else
        check_warn "Not using development database"
        echo "   Expected: DB_NAME=legal_forms_db_dev"
    fi
else
    check_fail ".env file not found"
    echo "   Copy from .env.example or see LOCAL_DB_SETUP.md"
fi
echo ""

# 8. Check if Cloud SQL Proxy is running
echo "8. Checking Cloud SQL Proxy status..."
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PROXY_PID=$(lsof -Pi :5432 -sTCP:LISTEN -t)
    PROXY_PROCESS=$(ps -p $PROXY_PID -o comm= | xargs basename)

    if [[ "$PROXY_PROCESS" == *"cloud-sql-proxy"* ]]; then
        check_pass "Cloud SQL Proxy is running (PID: $PROXY_PID)"
    else
        check_warn "Port 5432 is in use by: $PROXY_PROCESS (PID: $PROXY_PID)"
        echo "   You might need to stop it: kill $PROXY_PID"
        echo "   Or if it's local PostgreSQL: brew services stop postgresql@14"
    fi
else
    check_warn "Cloud SQL Proxy is not running"
    echo "   Start it: ./scripts/start-db-proxy.sh"
fi
echo ""

# 9. Check database connection
echo "9. Checking database connection..."
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env 2>/dev/null | cut -d'=' -f2)

    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"

        if psql -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev -c "SELECT 1;" &> /dev/null; then
            check_pass "Database connection successful"

            # Count entries
            ENTRY_COUNT=$(psql -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev -t -c "SELECT COUNT(*) FROM form_entries;" 2>/dev/null | xargs || echo "0")
            echo "   Form entries in database: $ENTRY_COUNT"
        else
            check_fail "Database connection failed"
            echo "   Check credentials in .env file"
            echo "   Run: ./scripts/test-db-connection.sh"
        fi

        unset PGPASSWORD
    else
        check_warn "Database password not found in .env"
    fi
else
    check_warn "Cannot test database (proxy not running)"
fi
echo ""

# 10. Check Node.js server
echo "10. Checking if Node.js server is running..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    SERVER_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    check_pass "Server is running on port 3000 (PID: $SERVER_PID)"

    # Test health endpoint
    if curl -s http://localhost:3000/health &> /dev/null; then
        check_pass "Health endpoint responding"
    else
        check_warn "Server running but health endpoint not responding"
    fi
else
    check_warn "Server is not running"
    echo "   Start it: npm start"
fi
echo ""

# Summary
echo "==================================================="
echo "Summary"
echo "==================================================="
echo ""
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Your development environment is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start Cloud SQL Proxy: ./scripts/start-db-proxy.sh"
    echo "2. Start Node.js server: npm start"
    echo "3. Open http://localhost:3000 in your browser"
else
    echo -e "${RED}⚠️  Please fix the failed checks above${NC}"
    echo ""
    echo "Quick fixes:"
    echo "- Install dependencies: npm install"
    echo "- Authenticate gcloud: gcloud auth login"
    echo "- Start Cloud SQL Proxy: ./scripts/start-db-proxy.sh"
    echo ""
    echo "See QUICKSTART_LOCAL_DEV.md for detailed setup instructions"
fi
echo ""
