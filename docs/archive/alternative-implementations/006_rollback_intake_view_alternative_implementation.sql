-- ============================================================================
-- ROLLBACK 006: DROP INTAKE → DOC GEN VIEW
-- ============================================================================
-- Purpose: Remove the v_intake_to_docgen view and related indexes
-- Date: 2025-12-11
-- Phase: 4.1 - Build Intake → Doc Gen Mapper
--
-- Use this script to rollback migration 006 if needed.
-- This will NOT affect any data - only removes the view and indexes.
-- ============================================================================

BEGIN;

-- Drop performance indexes first
DROP INDEX IF EXISTS idx_intake_selections_for_docgen_view;
DROP INDEX IF EXISTS idx_client_intakes_status_date;

-- Drop the view
DROP VIEW IF EXISTS v_intake_to_docgen;

-- Verification
DO $$
DECLARE
    view_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'v_intake_to_docgen'
    ) INTO view_exists;

    RAISE NOTICE 'Rollback 006 Complete:';
    RAISE NOTICE '  - View v_intake_to_docgen dropped: %', NOT view_exists;
    RAISE NOTICE '  - Performance indexes dropped';

    IF view_exists THEN
        RAISE EXCEPTION 'View v_intake_to_docgen still exists after rollback!';
    END IF;
END $$;

COMMIT;
