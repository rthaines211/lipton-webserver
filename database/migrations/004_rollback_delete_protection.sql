-- ============================================================================
-- ROLLBACK 004: REMOVE DELETE PROTECTION
-- ============================================================================
-- Purpose: Remove ON DELETE RESTRICT from shared taxonomy foreign keys
-- Date: 2025-11-21
-- Phase: 1.5 - Database Foundation (Rollback)
--
-- WARNING: This rollback removes delete protection!
-- After running this, taxonomy data CAN be accidentally deleted.
-- Only run this if you need to rollback for testing or error recovery.
--
-- Rollback Strategy: Restore default foreign key behavior (NO ACTION)
-- ============================================================================

BEGIN;

-- ============================================================================
-- INTAKE SYSTEM: Remove DELETE RESTRICT
-- ============================================================================

-- Remove RESTRICT from intake_issue_selections → issue_options
ALTER TABLE intake_issue_selections
    DROP CONSTRAINT IF EXISTS intake_issue_selections_issue_option_id_fkey,
    ADD CONSTRAINT intake_issue_selections_issue_option_id_fkey
        FOREIGN KEY (issue_option_id)
        REFERENCES issue_options(id);
        -- Default is NO ACTION (similar to RESTRICT but checked at end of transaction)

RAISE NOTICE 'Removed DELETE RESTRICT from intake_issue_selections.issue_option_id';

-- ============================================================================
-- SHARED TAXONOMY: Remove DELETE RESTRICT
-- ============================================================================

-- Remove RESTRICT from issue_options → issue_categories
ALTER TABLE issue_options
    DROP CONSTRAINT IF EXISTS issue_options_category_id_fkey,
    ADD CONSTRAINT issue_options_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES issue_categories(id);
        -- Default is NO ACTION

RAISE NOTICE 'Removed DELETE RESTRICT from issue_options.category_id';

-- ============================================================================
-- DOC GEN SYSTEM: Remove DELETE RESTRICT (if party_issue_selections exists)
-- ============================================================================

-- Check if doc gen tables exist and remove protection
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'party_issue_selections'
    ) THEN
        -- Remove protection from doc gen system
        EXECUTE '
            ALTER TABLE party_issue_selections
                DROP CONSTRAINT IF EXISTS party_issue_selections_issue_option_id_fkey,
                ADD CONSTRAINT party_issue_selections_issue_option_id_fkey
                    FOREIGN KEY (issue_option_id)
                    REFERENCES issue_options(id)
        ';
        RAISE NOTICE 'Delete protection removed from party_issue_selections';
    ELSE
        RAISE NOTICE 'party_issue_selections table not found (skipping)';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify constraints no longer use RESTRICT
DO $$
DECLARE
    restrict_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO restrict_count
    FROM pg_constraint
    WHERE conname LIKE '%issue%fkey'
    AND confdeltype = 'r';  -- 'r' means RESTRICT

    SELECT COUNT(*) INTO total_count
    FROM pg_constraint
    WHERE conname LIKE '%issue%fkey';

    RAISE NOTICE '';
    RAISE NOTICE 'Rollback 004 Complete:';
    RAISE NOTICE '  Total issue-related foreign keys: %', total_count;
    RAISE NOTICE '  Foreign keys still using DELETE RESTRICT: %', restrict_count;
    RAISE NOTICE '';

    IF restrict_count > 0 THEN
        RAISE WARNING 'Some constraints still have DELETE RESTRICT - rollback may be incomplete';
    ELSE
        RAISE NOTICE '✅ All DELETE RESTRICT constraints removed successfully';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Taxonomy data is no longer protected from deletion';
    RAISE NOTICE '   Consider re-applying migration 004 to restore protection';
END $$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION QUERIES
-- ============================================================================

-- Verify constraints exist without RESTRICT delete action
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

-- Expected output should show 'NO ACTION' for all issue-related foreign keys
-- (NO ACTION is the default and allows deletions to be checked at transaction end)

-- ============================================================================
-- NOTE ON DELETE BEHAVIOR AFTER ROLLBACK
-- ============================================================================

-- After this rollback:
-- - Deletions will be checked at END of transaction (NO ACTION) instead of immediately (RESTRICT)
-- - In practice, for single-statement transactions, this behaves similarly
-- - However, multi-statement transactions could allow temporary constraint violations
-- - This is less safe than RESTRICT, which was the whole point of migration 004

-- To restore protection, re-run: 004_add_delete_protection.sql
