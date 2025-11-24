-- ============================================================================
-- ROLLBACK 002: Remove Shared Issue Taxonomy
-- ============================================================================
-- Purpose: Rollback migration 002_create_shared_taxonomy.sql
-- WARNING: This will delete all taxonomy data
-- ============================================================================

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_issue_options_timestamp ON issue_options;
DROP TRIGGER IF EXISTS trigger_update_issue_categories_timestamp ON issue_categories;

-- Drop function
DROP FUNCTION IF EXISTS update_taxonomy_timestamp();

-- Drop tables (CASCADE will handle foreign key dependencies)
DROP TABLE IF EXISTS issue_options CASCADE;
DROP TABLE IF EXISTS issue_categories CASCADE;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Rollback 002 Complete: Taxonomy tables dropped';
END $$;

COMMIT;
