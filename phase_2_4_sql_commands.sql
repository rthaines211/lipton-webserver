-- Phase 2.4 Troubleshooting - SQL Commands
--
-- These are SQL commands to run once connected to the Cloud SQL instance
-- Connect first with: gcloud sql connect legal-forms-db --user=postgres --database=legal_forms_db
-- Or with proxy: PGPASSWORD=... psql -h localhost -p 5432 -U postgres -d legal_forms_db
--

-- ==================================================
-- SECTION 1: VERIFY USER EXISTS
-- ==================================================

-- 1.1 List all users and their properties
SELECT
    usename AS username,
    usecanlogin AS can_login,
    usecancreatdb AS can_create_db,
    usecreatesuper AS is_superuser
FROM pg_user
ORDER BY usename;

-- 1.2 Specifically check for app-user
SELECT usename, usecanlogin, usesysid
FROM pg_user
WHERE usename = 'app-user';

-- 1.3 Check if app-user has database connection privilege
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee = 'app-user'
GROUP BY grantee, privilege_type, is_grantable;

-- ==================================================
-- SECTION 2: VERIFY DATABASE EXISTS
-- ==================================================

-- 2.1 List all databases
SELECT datname as database_name, pg_catalog.pg_get_userbyid(datdba) as owner
FROM pg_database
ORDER BY datname;

-- 2.2 Check specifically for legal_forms_db
SELECT datname, pg_catalog.pg_get_userbyid(datdba) as owner
FROM pg_database
WHERE datname = 'legal_forms_db';

-- ==================================================
-- SECTION 3: VERIFY SCHEMA AND TABLES
-- ==================================================

-- 3.1 Count tables in public schema
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- 3.2 List all tables in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3.3 Check for specific required tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cases', 'parties', 'party_issue_selections')
ORDER BY table_name;

-- 3.4 Describe cases table
\d cases

-- 3.5 Describe parties table
\d parties

-- 3.6 Describe party_issue_selections table
\d party_issue_selections

-- ==================================================
-- SECTION 4: VERIFY USER PERMISSIONS
-- ==================================================

-- 4.1 Check all privileges granted to app-user on tables
SELECT
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'app-user'
ORDER BY table_name, privilege_type;

-- 4.2 Check if app-user can select from tables
SELECT COUNT(*)
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'app-user'
  AND privilege_type = 'SELECT';

-- 4.3 Check schema privileges
SELECT
    grantee,
    privilege_type
FROM information_schema.schemata_privileges
WHERE table_schema = 'public'
  AND grantee = 'app-user';

-- ==================================================
-- SECTION 5: FIX PERMISSIONS (RUN AS POSTGRES)
-- ==================================================

-- 5.1 Create app-user if it doesn't exist
-- NOTE: Replace 'SECURE_PASSWORD' with actual password from secret
CREATE USER IF NOT EXISTS "app-user" WITH PASSWORD 'SECURE_PASSWORD';

-- 5.2 Grant database connection
GRANT CONNECT ON DATABASE legal_forms_db TO "app-user";

-- 5.3 Grant schema usage
GRANT USAGE ON SCHEMA public TO "app-user";

-- 5.4 Grant all privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";

-- 5.5 Grant all privileges on all sequences (for auto-increment)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";

-- 5.6 Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "app-user";

-- 5.7 Verify all privileges are granted
SELECT
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'app-user'
ORDER BY table_name, privilege_type;

-- ==================================================
-- SECTION 6: TEST CONNECTION AS APP-USER
-- ==================================================

-- 6.1 Connect as app-user first, then run these:

-- Simple connectivity test
SELECT 1 as connection_test;

-- List available tables
\dt

-- Count rows in each table
SELECT 'cases' as table_name, COUNT(*) as row_count FROM cases
UNION ALL
SELECT 'parties', COUNT(*) FROM parties
UNION ALL
SELECT 'party_issue_selections', COUNT(*) FROM party_issue_selections;

-- Test SELECT privilege
SELECT * FROM cases LIMIT 1;

-- Test INSERT privilege (creates dummy row)
INSERT INTO cases (case_number, case_title, created_at)
VALUES ('TEST_' || to_char(now(), 'YYYYMMDDHH24MISS'), 'Test Case', now());

-- Test UPDATE privilege
UPDATE cases SET case_title = 'Updated Test' WHERE case_number LIKE 'TEST_%' LIMIT 1;

-- Test DELETE privilege
DELETE FROM cases WHERE case_number LIKE 'TEST_%';

-- ==================================================
-- SECTION 7: TROUBLESHOOTING SPECIFIC ERRORS
-- ==================================================

-- Error: "permission denied for schema public"
-- Solution: Run this as postgres
GRANT USAGE ON SCHEMA public TO "app-user";

-- Error: "permission denied for table cases"
-- Solution: Run this as postgres
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "app-user";

-- Error: "permission denied for sequence"
-- Solution: Run this as postgres
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "app-user";

-- ==================================================
-- SECTION 8: VERIFY INSTALLATION
-- ==================================================

-- 8.1 Check PostgreSQL version
SELECT version();

-- 8.2 Check current user
SELECT current_user;

-- 8.3 Check current database
SELECT current_database();

-- 8.4 Check search path
SHOW search_path;

-- 8.5 List all users with their attributes
\du

-- 8.6 List all databases
\l

-- 8.7 List all tables with sizes
\dt+

-- ==================================================
-- SECTION 9: CLEANUP (if needed)
-- ==================================================

-- 9.1 Drop app-user (if starting over)
-- WARNING: This is destructive
-- DROP USER IF EXISTS "app-user";

-- 9.2 Drop database (if starting over)
-- WARNING: This is destructive
-- DROP DATABASE IF EXISTS legal_forms_db;

-- ==================================================
-- SECTION 10: MONITORING AND DIAGNOSTICS
-- ==================================================

-- 10.1 Check for locks (might indicate connection issues)
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE datname = 'legal_forms_db'
ORDER BY state, pid;

-- 10.2 Check active connections
SELECT COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'legal_forms_db';

-- 10.3 Check query logs (if enabled)
SELECT * FROM pg_log LIMIT 10;

-- 10.4 Check for table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================================================
-- QUICK VALIDATION SCRIPT
-- ==================================================

-- Run this entire block to validate Phase 2.4:

-- 1. Check connection works
SELECT 'Connection OK' as test_1;

-- 2. Check database
SELECT 'Database EXISTS' as test_2
FROM pg_database
WHERE datname = 'legal_forms_db';

-- 3. Check user exists
SELECT 'User EXISTS' as test_3
FROM pg_user
WHERE usename = 'app-user';

-- 4. Check tables exist
SELECT 'All required tables exist' as test_4
FROM (
    SELECT COUNT(*) as cnt
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('cases', 'parties', 'party_issue_selections')
) sub
WHERE cnt = 3;

-- 5. Check app-user permissions
SELECT 'app-user has SELECT privilege' as test_5
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'app-user'
  AND privilege_type = 'SELECT'
LIMIT 1;

-- ==================================================
-- TIPS
-- ==================================================

-- To use these commands:
-- 1. Connect with: gcloud sql connect legal-forms-db --user=postgres --database=legal_forms_db
-- 2. Paste sections from above
-- 3. Review output for issues
-- 4. Run remediation commands (Section 5)
-- 5. Test as app-user (Section 6)
-- 6. Exit with: \q

