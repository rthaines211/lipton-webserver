-- =====================================================================
-- Rollback Migration: 001_rollback.sql
-- Purpose: Safely remove all tables created by 001_create_intake_tables.sql
-- Author: Ryan Haines
-- Date: November 2025
-- =====================================================================

-- WARNING: This will delete all data in these tables!
-- Make sure you have backups if this is not a fresh dev environment.

\echo 'Starting rollback of migration 001...'
\echo ''

-- Drop tables in reverse order of dependencies (foreign keys)
-- Child tables first, then parent tables

\echo 'Dropping audit_logs table...'
DROP TABLE IF EXISTS audit_logs CASCADE;

\echo 'Dropping attorneys table...'
DROP TABLE IF EXISTS attorneys CASCADE;

\echo 'Dropping saved_sessions table...'
DROP TABLE IF EXISTS saved_sessions CASCADE;

\echo 'Dropping intake page tables (5)...'
DROP TABLE IF EXISTS intake_page_5 CASCADE;
DROP TABLE IF EXISTS intake_page_4 CASCADE;
DROP TABLE IF EXISTS intake_page_3 CASCADE;
DROP TABLE IF EXISTS intake_page_2 CASCADE;
DROP TABLE IF EXISTS intake_page_1 CASCADE;

\echo 'Dropping intake_submissions table...'
DROP TABLE IF EXISTS intake_submissions CASCADE;

\echo 'Dropping trigger function...'
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

\echo ''
\echo 'Rollback complete!'
\echo ''
\echo 'Verifying all tables are removed:'
SELECT COUNT(*) as remaining_tables FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'));
-- Should return 0

\echo ''
\echo 'If remaining_tables = 0, rollback was successful.'

-- =====================================================================
-- ROLLBACK COMPLETE
-- =====================================================================
