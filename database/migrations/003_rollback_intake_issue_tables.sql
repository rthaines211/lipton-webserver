-- ============================================================================
-- ROLLBACK 003: Remove Intake Issue Tables
-- ============================================================================
-- Purpose: Rollback migration 003_create_intake_issue_tables.sql
-- WARNING: This will delete all intake issue data
-- ============================================================================

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_intake_metadata_timestamp ON intake_issue_metadata;

-- Drop function
DROP FUNCTION IF EXISTS update_intake_metadata_timestamp();

-- Drop tables (CASCADE will handle dependencies)
DROP TABLE IF EXISTS intake_issue_metadata CASCADE;
DROP TABLE IF EXISTS intake_issue_selections CASCADE;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Rollback 003 Complete: Intake issue tables dropped';
END $$;

COMMIT;
