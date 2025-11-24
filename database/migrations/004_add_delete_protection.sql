-- ============================================================================
-- MIGRATION 004: ADD DELETE PROTECTION
-- ============================================================================
-- Purpose: Prevent accidental deletion of shared taxonomy data
-- Date: 2025-01-21
-- Phase: 1.5 - Database Foundation
--
-- CRITICAL: Protects shared taxonomy from accidental deletion
-- - Adds ON DELETE RESTRICT to all foreign keys referencing shared taxonomy
-- - Prevents deletion of categories/options while they're referenced
-- - Applies to BOTH intake system and doc gen system (if applicable)
--
-- Decision Q3: Use ON DELETE RESTRICT (explicit errors vs silent failures)
--
-- Rollback: See 004_rollback_delete_protection.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- INTAKE SYSTEM: Add DELETE RESTRICT
-- ============================================================================

-- Protect issue_options from deletion while referenced by intake_issue_selections
ALTER TABLE intake_issue_selections
    DROP CONSTRAINT IF EXISTS intake_issue_selections_issue_option_id_fkey,
    ADD CONSTRAINT intake_issue_selections_issue_option_id_fkey
        FOREIGN KEY (issue_option_id)
        REFERENCES issue_options(id)
        ON DELETE RESTRICT;  -- Prevents deletion if referenced

-- ============================================================================
-- SHARED TAXONOMY: Add DELETE RESTRICT
-- ============================================================================

-- Protect issue_categories from deletion while it has options
ALTER TABLE issue_options
    DROP CONSTRAINT IF EXISTS issue_options_category_id_fkey,
    ADD CONSTRAINT issue_options_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES issue_categories(id)
        ON DELETE RESTRICT;  -- Prevents category deletion if has options

-- ============================================================================
-- DOC GEN SYSTEM: Add DELETE RESTRICT (if party_issue_selections exists)
-- ============================================================================

-- Check if doc gen tables exist and add protection
-- Note: This is defensive - we don't expect these tables to exist yet
-- but we want to protect them if they do

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'party_issue_selections'
    ) THEN
        -- Add protection to doc gen system
        EXECUTE '
            ALTER TABLE party_issue_selections
                DROP CONSTRAINT IF EXISTS party_issue_selections_issue_option_id_fkey,
                ADD CONSTRAINT party_issue_selections_issue_option_id_fkey
                    FOREIGN KEY (issue_option_id)
                    REFERENCES issue_options(id)
                    ON DELETE RESTRICT
        ';
        RAISE NOTICE 'Delete protection added to party_issue_selections';
    ELSE
        RAISE NOTICE 'party_issue_selections table not found (expected for fresh install)';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify constraints were created with RESTRICT
DO $$
DECLARE
    restrict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO restrict_count
    FROM pg_constraint
    WHERE conname LIKE '%issue%fkey'
    AND confdeltype = 'r';  -- 'r' means RESTRICT

    RAISE NOTICE 'Migration 004 Complete:';
    RAISE NOTICE '  Foreign key constraints with DELETE RESTRICT: %', restrict_count;
    RAISE NOTICE '  Protected tables:';
    RAISE NOTICE '    - issue_options (referenced by intake_issue_selections)';
    RAISE NOTICE '    - issue_categories (referenced by issue_options)';

    IF restrict_count < 2 THEN
        RAISE WARNING 'Expected at least 2 RESTRICT constraints, found %', restrict_count;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Verify constraints exist and show RESTRICT delete action
-- Run this manually to verify:
/*
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%issue%fkey'
ORDER BY conname;
*/

-- Expected output should show 'RESTRICT' for all issue-related foreign keys

-- ============================================================================
-- TEST DELETE PROTECTION (for manual testing)
-- ============================================================================

-- These commands should FAIL with explicit errors:
-- DELETE FROM issue_options WHERE option_code = 'RatsMice';
-- -- ERROR: update or delete on table "issue_options" violates foreign key constraint
--
-- DELETE FROM issue_categories WHERE category_code = 'vermin';
-- -- ERROR: update or delete on table "issue_categories" violates foreign key constraint
