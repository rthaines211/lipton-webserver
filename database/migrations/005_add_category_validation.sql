-- Migration: 005_add_category_validation.sql
-- Purpose: Add trigger to validate category_code against issue_categories
-- Phase: 1.6 - Category Code Validation
-- Date: 2025-11-21
--
-- This prevents typos and provides LOUD, NON-SILENT error messages
-- Decision Q4: Database Triggers with Explicit Errors (Option C)
--
-- CRITICAL: This migration only affects intake tables.
-- Doc gen tables are completely unaffected.

BEGIN;

-- =============================================================================
-- VALIDATION FUNCTION
-- =============================================================================

-- Create validation function
-- This function checks if category_code exists in issue_categories table
CREATE OR REPLACE FUNCTION validate_category_code()
RETURNS TRIGGER AS $$
DECLARE
    valid_codes TEXT;
BEGIN
    -- Check if the category_code exists in issue_categories
    IF NOT EXISTS (
        SELECT 1
        FROM issue_categories
        WHERE category_code = NEW.category_code
        AND is_active = true
    ) THEN
        -- Build list of valid codes for error message
        SELECT string_agg(category_code, ', ' ORDER BY category_code)
        INTO valid_codes
        FROM issue_categories
        WHERE is_active = true;

        -- LOUD ERROR - Not silent!
        -- This will halt the transaction and return a clear error message
        RAISE EXCEPTION 'Invalid category_code: "%". Valid codes are: %',
            NEW.category_code,
            valid_codes
        USING HINT = 'Check for typos, trailing spaces, or incorrect case in category_code';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_category_code() IS
  'Validates category_code in intake_issue_metadata against issue_categories.
   Throws explicit error if invalid code provided.
   Used in Phase 1.6 of Intake-DocGen Unification Plan.
   Only affects intake tables - doc gen tables untouched.';

-- =============================================================================
-- ATTACH TRIGGER
-- =============================================================================

-- Attach trigger to intake_issue_metadata
-- Runs BEFORE INSERT OR UPDATE to prevent invalid data from entering
CREATE TRIGGER check_category_code_valid
    BEFORE INSERT OR UPDATE ON intake_issue_metadata
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_code();

COMMENT ON TRIGGER check_category_code_valid ON intake_issue_metadata IS
  'Validates category_code before insert/update.
   Prevents typos and invalid category codes.
   Part of Phase 1.6 - Category Code Validation.';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005 completed successfully';
    RAISE NOTICE '   - validate_category_code() function created';
    RAISE NOTICE '   - check_category_code_valid trigger attached to intake_issue_metadata';
    RAISE NOTICE '   - Category code validation now active';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: This trigger only affects intake_issue_metadata table';
    RAISE NOTICE '   Doc gen tables (cases, parties, party_issue_selections) are UNTOUCHED';
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION (Run separately)
-- =============================================================================

-- To verify this migration worked, run these queries:
--
-- 1. Check function exists:
--    SELECT proname, prosrc FROM pg_proc WHERE proname = 'validate_category_code';
--
-- 2. Check trigger exists:
--    SELECT tgname, tgrelid::regclass, tgfoid::regproc
--    FROM pg_trigger
--    WHERE tgname = 'check_category_code_valid';
--
-- 3. Test with VALID code (should succeed):
--    INSERT INTO intake_issue_metadata (intake_id, category_code, details)
--    VALUES (
--        (SELECT id FROM client_intakes LIMIT 1),
--        'vermin',
--        'Test valid category'
--    );
--
-- 4. Test with INVALID code (should FAIL with loud error):
--    INSERT INTO intake_issue_metadata (intake_id, category_code, details)
--    VALUES (
--        (SELECT id FROM client_intakes LIMIT 1),
--        'vermim',  -- Typo!
--        'Test invalid category'
--    );
--    Expected: ERROR: Invalid category_code: "vermim". Valid codes are: ...
