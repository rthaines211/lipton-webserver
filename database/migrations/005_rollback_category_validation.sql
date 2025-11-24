-- Rollback: 005_rollback_category_validation.sql
-- Purpose: Remove category_code validation trigger and function
-- Phase: 1.6 - Category Code Validation (Rollback)
-- Date: 2025-11-21
--
-- This rollback removes the validation trigger and function
-- Safe to run - only affects intake tables, doc gen completely untouched

BEGIN;

-- =============================================================================
-- REMOVE TRIGGER
-- =============================================================================

-- Drop the validation trigger from intake_issue_metadata
DROP TRIGGER IF EXISTS check_category_code_valid ON intake_issue_metadata;

RAISE NOTICE '✅ Dropped trigger: check_category_code_valid';

-- =============================================================================
-- REMOVE FUNCTION
-- =============================================================================

-- Drop the validation function
DROP FUNCTION IF EXISTS validate_category_code();

RAISE NOTICE '✅ Dropped function: validate_category_code()';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration 005 rollback completed successfully';
    RAISE NOTICE '   - Category code validation trigger removed';
    RAISE NOTICE '   - Category code validation function removed';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTE: After rollback, invalid category codes will NOT be caught';
    RAISE NOTICE '   Consider re-applying migration 005 if validation is needed';
END $$;

COMMIT;

-- =============================================================================
-- POST-ROLLBACK VERIFICATION (Run separately)
-- =============================================================================

-- To verify rollback worked, run these queries:
--
-- 1. Verify trigger removed:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'check_category_code_valid';
--    Expected: No rows returned
--
-- 2. Verify function removed:
--    SELECT proname FROM pg_proc WHERE proname = 'validate_category_code';
--    Expected: No rows returned
--
-- 3. Test that invalid codes now pass (no validation):
--    INSERT INTO intake_issue_metadata (intake_id, category_code, details)
--    VALUES (
--        (SELECT id FROM client_intakes LIMIT 1),
--        'invalid_code_test',
--        'This should now succeed without validation'
--    );
--    Expected: INSERT succeeds (but data is invalid)
--
-- 4. Clean up test data:
--    DELETE FROM intake_issue_metadata WHERE category_code = 'invalid_code_test';
