#!/bin/bash
#
# Phase 2.4 - Quick Commands Reference
# Copy and paste these commands to diagnose and fix Cloud SQL connection issues
#
# Usage: Run each section in order or pick the specific ones you need
#

set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
INSTANCE_NAME="legal-forms-db"
DATABASE_NAME="legal_forms_db"

echo "=== Phase 2.4 - Quick Commands Reference ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# ==================================================
# SECTION 1: DIAGNOSTIC COMMANDS
# ==================================================

echo ""
echo "=== SECTION 1: DIAGNOSTIC COMMANDS ==="
echo "Run these first to identify the problem"
echo ""

# 1.1 Check instance status
echo "1.1 Check if instance is RUNNABLE:"
echo "    gcloud sql instances describe legal-forms-db --format=\"value(state)\""
gcloud sql instances describe legal-forms-db --format="value(state)"
echo ""

# 1.2 Check database exists
echo "1.2 List all databases:"
echo "    gcloud sql databases list --instance=legal-forms-db"
gcloud sql databases list --instance=legal-forms-db
echo ""

# 1.3 Check user exists
echo "1.3 List all users:"
echo "    gcloud sql users list --instance=legal-forms-db"
gcloud sql users list --instance=legal-forms-db
echo ""

# 1.4 Check secrets exist
echo "1.4 Verify secrets exist:"
echo "    gcloud secrets list | grep -E 'db-user|db-password'"
gcloud secrets list | grep -E "db-user|db-password" || echo "    ⚠️  Secrets not found"
echo ""

# ==================================================
# SECTION 2: REMEDIATION COMMANDS
# ==================================================

echo ""
echo "=== SECTION 2: REMEDIATION COMMANDS ==="
echo "Run these if diagnostic shows issues"
echo ""

# 2.1 Create database if missing
echo "2.1 Create database (if missing):"
echo "    gcloud sql databases create legal_forms_db --instance=legal-forms-db"
echo "    To run: gcloud sql databases create legal_forms_db --instance=legal-forms-db"
echo ""

# 2.2 Create user if missing
echo "2.2 Create user (if missing):"
echo "    gcloud sql users create app-user \\"
echo "      --instance=legal-forms-db \\"
echo "      --password=\$(gcloud secrets versions access latest --secret=db-password)"
echo ""

# 2.3 Grant permissions
echo "2.3 Grant permissions via proxy:"
echo "    # Step 1: Start the proxy"
echo "    cloud_sql_proxy -instances=${PROJECT_ID}:${REGION}:${INSTANCE_NAME}=tcp:5432 &"
echo ""
echo "    # Step 2: Run SQL commands"
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)

cat << 'EOF'
    PGPASSWORD=$PASSWORD psql -h localhost -p 5432 -U postgres -d legal_forms_db << 'EOSQL'
    GRANT CONNECT ON DATABASE legal_forms_db TO "app-user";
    GRANT ALL PRIVILEGES ON SCHEMA public TO "app-user";
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "app-user";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "app-user";
    EOSQL
EOF

echo ""

# ==================================================
# SECTION 3: CONNECTION TEST COMMANDS
# ==================================================

echo ""
echo "=== SECTION 3: CONNECTION TEST COMMANDS ==="
echo "Use these to verify connections work"
echo ""

echo "3.1 Test connection with gcloud sql connect:"
echo "    gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db"
echo "    Then in psql: SELECT 1;"
echo "    Then exit: \q"
echo ""

echo "3.2 Alternative: Test with Cloud SQL Proxy:"
echo ""
echo "    # Terminal 1: Start the proxy"
echo "    cloud_sql_proxy -instances=${PROJECT_ID}:${REGION}:${INSTANCE_NAME}=tcp:5432"
echo ""
echo "    # Terminal 2: Connect"
echo "    export DB_PASSWORD=\$(gcloud secrets versions access latest --secret=db-password)"
echo "    PGPASSWORD=\$DB_PASSWORD psql -h localhost -p 5432 -U app-user -d legal_forms_db"
echo ""
echo "    Then in psql: SELECT 1;"
echo "    Then exit: \q"
echo ""

echo "3.3 Test as postgres user (for comparison):"
echo "    gcloud sql connect legal-forms-db --user=postgres --database=legal_forms_db"
echo ""

# ==================================================
# SECTION 4: SCHEMA VALIDATION COMMANDS
# ==================================================

echo ""
echo "=== SECTION 4: SCHEMA VALIDATION COMMANDS ==="
echo "Use these to verify schema was imported"
echo ""

echo "4.1 Check table count:"
echo "    gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db"
echo "    Then in psql: SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
echo ""

echo "4.2 List all tables:"
echo "    gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db"
echo "    Then in psql: \\dt"
echo ""

echo "4.3 Check specific tables:"
echo "    gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db"
echo "    Then in psql:"
echo "    - \\d cases"
echo "    - \\d parties"
echo "    - \\d party_issue_selections"
echo ""

echo "4.4 Check user permissions:"
echo "    gcloud sql connect legal-forms-db --user=postgres --database=legal_forms_db"
echo "    Then in psql:"
echo "    SELECT grantee, table_name, privilege_type"
echo "    FROM information_schema.table_privileges"
echo "    WHERE table_schema = 'public' AND grantee = 'app-user';"
echo ""

# ==================================================
# SECTION 5: IF SCHEMA IS MISSING - REIMPORT
# ==================================================

echo ""
echo "=== SECTION 5: RE-IMPORT SCHEMA (if missing) ==="
echo "Run these commands if tables don't exist"
echo ""

echo "5.1 Export schema from local database:"
echo "    pg_dump -U ryanhaines -h localhost legal_forms_db --schema-only > schema.sql"
echo ""

echo "5.2 Upload to Cloud Storage:"
echo "    gsutil cp schema.sql gs://${PROJECT_ID}-db-migration/"
echo ""

echo "5.3 Import to Cloud SQL:"
echo "    gcloud sql import sql legal-forms-db \\"
echo "      gs://${PROJECT_ID}-db-migration/schema.sql \\"
echo "      --database=legal_forms_db \\"
echo "      --user=postgres"
echo ""

# ==================================================
# SECTION 6: QUICK STATUS CHECK
# ==================================================

echo ""
echo "=== SECTION 6: FULL STATUS CHECK ==="
echo "Single command to check everything at once"
echo ""

echo "Running full status check..."
echo ""

echo "Instance Status:"
INSTANCE_STATE=$(gcloud sql instances describe legal-forms-db --format="value(state)")
echo "  State: $INSTANCE_STATE"

INSTANCE_IP=$(gcloud sql instances describe legal-forms-db --format="value(ipAddresses[0].ipAddress)")
echo "  IP: $INSTANCE_IP"

echo ""
echo "Database Status:"
DB_EXISTS=$(gcloud sql databases list --instance=legal-forms-db | grep -c "legal_forms_db" || echo "0")
if [ "$DB_EXISTS" -gt 0 ]; then
  echo "  Database: EXISTS ✓"
else
  echo "  Database: MISSING ✗"
fi

echo ""
echo "User Status:"
USER_EXISTS=$(gcloud sql users list --instance=legal-forms-db | grep -c "app-user" || echo "0")
if [ "$USER_EXISTS" -gt 0 ]; then
  echo "  User: EXISTS ✓"
else
  echo "  User: MISSING ✗"
fi

echo ""
echo "=== End of Quick Commands Reference ==="
echo ""
echo "NEXT STEPS:"
echo "1. Review diagnostic output above"
echo "2. Run remediation commands for any MISSING items"
echo "3. Run connection test commands to verify"
echo "4. Run schema validation commands"
echo "5. If everything passes, proceed to Phase 3"
echo ""
