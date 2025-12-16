-- ============================================================================
-- MIGRATION 006: CREATE INTAKE → DOC GEN VIEW
-- ============================================================================
-- Purpose: Create view that transforms intake data to doc gen format
-- Date: 2025-12-11
-- Phase: 4.1 - Build Intake → Doc Gen Mapper
--
-- CRITICAL: This view is READ-ONLY and does NOT modify any tables.
-- It transforms intake data at READ time for the "Load from Intake" feature.
--
-- Doc Gen Protection:
-- - NO changes to cases, parties, or party_issue_selections tables
-- - NO changes to FormTransformer or any doc gen code
-- - View only reads from intake tables and shared taxonomy
--
-- Rollback: See 006_rollback_intake_to_docgen_view.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- VIEW: v_intake_to_docgen
-- Transforms intake data to doc gen format for attorney "Load from Intake" feature
-- ============================================================================

CREATE OR REPLACE VIEW v_intake_to_docgen AS
SELECT
    -- Primary intake identifier
    i.id AS intake_id,
    i.intake_number,
    i.created_at AS intake_date,
    i.intake_status,

    -- Plaintiff Info (maps to PlaintiffDetails)
    i.first_name,
    i.last_name,
    i.middle_name,
    i.date_of_birth,
    CASE
        WHEN i.date_of_birth IS NULL THEN 'Adult'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, i.date_of_birth)) >= 18 THEN 'Adult'
        ELSE 'Child'
    END AS age_category,

    -- Property Address from JSONB (maps to Full_Address)
    i.property_address->>'street' AS property_street_address,
    i.property_address->>'unit' AS property_unit_number,
    i.property_address->>'city' AS property_city,
    i.property_address->>'state' AS property_state,
    i.property_address->>'zip' AS property_zip_code,
    i.property_address->>'county' AS property_county,

    -- Contact info (for reference)
    i.email_address,
    i.primary_phone,

    -- Filing info (use property county)
    i.property_address->>'county' AS filing_county,

    -- Issue Selections aggregated by category
    -- Returns JSONB: { "vermin": ["Rats/Mice", "Bats"], "insects": ["Ants", "Roaches"] }
    (
        SELECT COALESCE(
            jsonb_object_agg(
                category_data.category_code,
                category_data.selected_options
            ),
            '{}'::jsonb
        )
        FROM (
            SELECT
                ic.category_code,
                jsonb_agg(io.option_name ORDER BY io.display_order) AS selected_options
            FROM intake_issue_selections iis
            JOIN issue_options io ON iis.issue_option_id = io.id
            JOIN issue_categories ic ON io.category_id = ic.id
            WHERE iis.intake_id = i.id
            GROUP BY ic.category_code
        ) AS category_data
    ) AS issue_selections,

    -- Issue Metadata (intake-specific details, dates, photos)
    -- Returns JSONB: { "vermin": { "details": "...", "firstNoticed": "2024-01-15", ... } }
    (
        SELECT COALESCE(
            jsonb_object_agg(
                iim.category_code,
                jsonb_build_object(
                    'details', iim.details,
                    'firstNoticed', iim.first_noticed,
                    'repairHistory', iim.repair_history,
                    'photos', iim.photos,
                    'severity', iim.severity
                )
            ),
            '{}'::jsonb
        )
        FROM intake_issue_metadata iim
        WHERE iim.intake_id = i.id
    ) AS issue_metadata,

    -- Landlord Info directly from JSONB column (for view windows and reference)
    jsonb_build_object(
        'landlordName', i.landlord_info->>'name',
        'landlordCompany', i.landlord_info->>'company',
        'landlordPhone', i.landlord_info->>'phone',
        'landlordEmail', i.landlord_info->>'email',
        'landlordAddress', i.landlord_info->>'address',
        'landlordCity', i.landlord_info->>'city',
        'landlordState', i.landlord_info->>'state',
        'landlordZip', i.landlord_info->>'zip',
        'hasPropertyManager', COALESCE((i.property_manager_info->>'hasManager')::boolean, false),
        'managerCompany', i.property_manager_info->>'company',
        'managerName', i.property_manager_info->>'name',
        'managerPhone', i.property_manager_info->>'phone',
        'managerEmail', i.property_manager_info->>'email'
    ) AS landlord_info,

    -- Count of issues for quick filtering/display
    (
        SELECT COUNT(*)
        FROM intake_issue_selections iis
        WHERE iis.intake_id = i.id
    ) AS total_issues_selected,

    -- Categories with issues (for quick reference)
    (
        SELECT COALESCE(
            jsonb_agg(DISTINCT ic.category_code ORDER BY ic.category_code),
            '[]'::jsonb
        )
        FROM intake_issue_selections iis
        JOIN issue_options io ON iis.issue_option_id = io.id
        JOIN issue_categories ic ON io.category_id = ic.id
        WHERE iis.intake_id = i.id
    ) AS categories_with_issues,

    -- Raw building_issues JSONB for fallback/legacy (if intake_issue_selections empty)
    i.building_issues AS legacy_building_issues

FROM client_intakes i
WHERE i.intake_status != 'rejected'
  AND i.deleted_at IS NULL
ORDER BY i.created_at DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW v_intake_to_docgen IS
    'Transforms client intake data to doc gen format for the attorney "Load from Intake" feature.
     READ-ONLY view - does not modify any tables.
     Returns issue selections aggregated by category and includes intake-specific metadata.';

COMMENT ON COLUMN v_intake_to_docgen.issue_selections IS
    'JSONB object mapping category_code to array of selected option names.
     Example: {"vermin": ["Rats/Mice", "Bats"], "insects": ["Ants", "Roaches"]}';

COMMENT ON COLUMN v_intake_to_docgen.issue_metadata IS
    'JSONB object mapping category_code to metadata object with details, dates, photos, severity.
     Example: {"vermin": {"details": "Rats in kitchen", "firstNoticed": "2024-01-15", ...}}';

COMMENT ON COLUMN v_intake_to_docgen.landlord_info IS
    'JSONB object with landlord and property manager contact information for display in view windows.';

-- ============================================================================
-- PERFORMANCE INDEX
-- ============================================================================

-- Index to speed up the issue selections aggregation
CREATE INDEX IF NOT EXISTS idx_intake_selections_for_docgen_view
    ON intake_issue_selections(intake_id, issue_option_id);

-- Note: idx_intake_status_date already exists on client_intakes (created_at DESC)
-- from original schema, so we don't need to create it again

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    view_exists BOOLEAN;
    index_count INTEGER;
BEGIN
    -- Check view was created
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'v_intake_to_docgen'
    ) INTO view_exists;

    -- Count new indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname IN ('idx_intake_selections_for_docgen_view', 'idx_client_intakes_status_date');

    RAISE NOTICE 'Migration 006 Complete:';
    RAISE NOTICE '  - View v_intake_to_docgen created: %', view_exists;
    RAISE NOTICE '  - Performance indexes created: %', index_count;

    IF NOT view_exists THEN
        RAISE EXCEPTION 'View v_intake_to_docgen was not created!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries manually to verify:

-- 1. Check view exists and structure
-- \d v_intake_to_docgen

-- 2. Test view with sample data (if intakes exist)
-- SELECT intake_number, first_name, last_name, issue_selections, categories_with_issues
-- FROM v_intake_to_docgen
-- LIMIT 5;

-- 3. Check performance with EXPLAIN ANALYZE
-- EXPLAIN ANALYZE SELECT * FROM v_intake_to_docgen WHERE intake_id = '<some-uuid>';

-- 4. Verify issue aggregation works correctly
-- SELECT
--     intake_number,
--     jsonb_pretty(issue_selections) AS selections,
--     jsonb_pretty(issue_metadata) AS metadata
-- FROM v_intake_to_docgen
-- WHERE total_issues_selected > 0
-- LIMIT 1;
