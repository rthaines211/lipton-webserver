-- ============================================================================
-- Migration 011: Dashboard List View
-- ============================================================================
-- Date: 2025-12-11
-- Phase: 7A.2 - Dashboard View for CRM List Display
--
-- Creates a unified view for dashboard listing that combines data from:
-- - case_dashboard (workflow status, assignments)
-- - client_intakes (client info, property address)
-- - attorneys (assigned attorney name)
-- - cases/parties (plaintiff counts when case is linked)
-- - case_activities/case_notes/generated_documents (counts)
--
-- NOTE: This view works correctly even when case_id is NULL (intake not yet
-- loaded into doc gen). Client name comes from client_intakes table.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Main Dashboard List View
-- ============================================================================
-- NOTE: client_intakes stores addresses in JSONB (property_address, current_address)
-- with keys: street, unit, city, state, zip, county
-- Tenancy info is also JSONB with camelCase keys: leaseStartDate, monthlyRent, etc.
-- ============================================================================
CREATE OR REPLACE VIEW v_dashboard_list AS
WITH activity_summary AS (
    SELECT
        dashboard_id,
        COUNT(*) AS activity_count,
        MAX(performed_at) AS last_activity_at
    FROM case_activities
    GROUP BY dashboard_id
),
note_summary AS (
    SELECT
        dashboard_id,
        COUNT(*) FILTER (WHERE is_deleted = false) AS note_count,
        COUNT(*) FILTER (WHERE is_pinned = true AND is_deleted = false) AS pinned_note_count
    FROM case_notes
    GROUP BY dashboard_id
),
doc_summary AS (
    SELECT
        intake_id,
        COUNT(*) AS document_count
    FROM generated_documents
    GROUP BY intake_id
)
SELECT
    cd.id AS dashboard_id,
    cd.intake_id,
    cd.case_id,
    cd.status,
    cd.status_changed_at,
    cd.is_priority,
    cd.is_archived,
    cd.created_at,
    cd.updated_at,
    cd.docs_generated_at,
    cd.last_doc_gen_count,

    -- Attorney info
    a.id AS attorney_id,
    a.full_name AS attorney_name,

    -- Intake info (primary client and property)
    ci.intake_number,
    ci.first_name || ' ' || ci.last_name AS primary_client_name,
    ci.first_name AS client_first_name,
    ci.last_name AS client_last_name,
    ci.email_address AS client_email,
    ci.primary_phone AS client_phone,
    COALESCE(ci.submitted_at, ci.created_at) AS intake_submitted_at,

    -- Property address from intake (extracted from JSONB)
    ci.property_address->>'street' AS property_street_address,
    ci.property_address->>'city' AS property_city,
    ci.property_address->>'state' AS property_state,
    ci.property_address->>'zipCode' AS property_zip_code,
    CONCAT(
        COALESCE(ci.property_address->>'street', ''),
        CASE WHEN ci.property_address->>'unit' IS NOT NULL
            THEN ', Unit ' || (ci.property_address->>'unit')
            ELSE ''
        END,
        ', ', COALESCE(ci.property_address->>'city', ''),
        ', ', COALESCE(ci.property_address->>'state', ''),
        ' ', COALESCE(ci.property_address->>'zipCode', '')
    ) AS property_full_address,

    -- Case info (will be populated when cases table exists)
    -- Note: cases and parties tables may not exist yet
    -- These columns return NULL/0 until doc gen schema is created
    cd.case_id AS linked_case_id,
    0 AS plaintiff_count,  -- Will use parties table when it exists
    0 AS defendant_count,  -- Will use parties table when it exists

    -- Activity summary (from pre-aggregated CTE)
    COALESCE(acts.activity_count, 0) AS activity_count,
    acts.last_activity_at,

    -- Notes summary (from pre-aggregated CTE)
    COALESCE(notes.note_count, 0) AS note_count,
    COALESCE(notes.pinned_note_count, 0) AS pinned_note_count,

    -- Document counts (from pre-aggregated CTE)
    COALESCE(docs.document_count, 0) AS document_count

FROM case_dashboard cd
LEFT JOIN client_intakes ci ON cd.intake_id = ci.id
LEFT JOIN attorneys a ON cd.assigned_attorney_id = a.id
LEFT JOIN activity_summary acts ON acts.dashboard_id = cd.id
LEFT JOIN note_summary notes ON notes.dashboard_id = cd.id
LEFT JOIN doc_summary docs ON docs.intake_id = cd.intake_id
-- Note: LEFT JOIN to cases table removed until that table exists
WHERE cd.is_archived = false
ORDER BY cd.is_priority DESC, cd.updated_at DESC;

COMMENT ON VIEW v_dashboard_list IS 'Unified view for CRM dashboard listing. Combines intake, workflow, and activity data.';

-- ============================================================================
-- 2. Dashboard Detail View (includes more info for single case view)
-- ============================================================================
-- NOTE: Uses JSONB extraction for addresses and tenancy info
-- ============================================================================
CREATE OR REPLACE VIEW v_dashboard_detail AS
WITH activity_counts AS (
    SELECT dashboard_id, COUNT(*) AS activity_count
    FROM case_activities
    GROUP BY dashboard_id
),
note_counts AS (
    SELECT dashboard_id, COUNT(*) AS note_count
    FROM case_notes
    WHERE is_deleted = false
    GROUP BY dashboard_id
),
doc_counts AS (
    SELECT intake_id, COUNT(*) AS document_count
    FROM generated_documents
    GROUP BY intake_id
)
SELECT
    cd.id AS dashboard_id,
    cd.intake_id,
    cd.case_id,
    cd.status,
    cd.status_changed_at,
    cd.status_changed_by,
    cd.is_priority,
    cd.is_archived,
    cd.created_at,
    cd.updated_at,
    cd.docs_generated_at,
    cd.docs_generated_by,
    cd.last_doc_gen_count,

    -- Assignment details
    cd.assigned_attorney_id,
    a.full_name AS attorney_name,
    a.email AS attorney_email,
    cd.assigned_at,
    cd.assigned_by,

    -- Full intake info
    ci.intake_number,
    ci.first_name,
    ci.last_name,
    ci.first_name || ' ' || ci.last_name AS full_name,
    ci.email_address,
    ci.primary_phone,
    ci.secondary_phone,
    ci.preferred_contact_method,
    COALESCE(ci.submitted_at, ci.created_at) AS intake_date,
    ci.intake_status,
    ci.urgency_level,

    -- Current address (from JSONB)
    ci.current_address->>'street' AS current_street_address,
    ci.current_address->>'unit' AS current_unit_number,
    ci.current_address->>'city' AS current_city,
    ci.current_address->>'state' AS current_state,
    ci.current_address->>'zipCode' AS current_zip_code,

    -- Property address (from JSONB)
    ci.property_address->>'street' AS property_street_address,
    ci.property_address->>'unit' AS property_unit_number,
    ci.property_address->>'city' AS property_city,
    ci.property_address->>'state' AS property_state,
    ci.property_address->>'zipCode' AS property_zip_code,
    NULL AS property_type,  -- Not stored in current schema
    (ci.tenancy_info->>'isRentControlled')::boolean AS is_rent_controlled,

    -- Tenancy details (from JSONB with camelCase keys)
    -- Support both old (leaseStartDate) and new (moveInDate) field names
    COALESCE((ci.tenancy_info->>'leaseStartDate')::date, (ci.tenancy_info->>'moveInDate')::date) AS lease_start_date,
    (ci.tenancy_info->>'leaseEndDate')::date AS lease_end_date,
    ci.tenancy_info->>'leaseType' AS lease_type,
    (ci.tenancy_info->>'monthlyRent')::numeric AS monthly_rent,
    (ci.tenancy_info->>'securityDeposit')::numeric AS security_deposit,

    -- Case info (will be populated when cases table exists)
    -- c.internal_name AS case_internal_name,  -- Uncomment when cases table exists
    -- c.filing_location,  -- Uncomment when cases table exists

    -- Counts (from pre-aggregated CTEs)
    COALESCE(acts.activity_count, 0) AS activity_count,
    COALESCE(notes.note_count, 0) AS note_count,
    COALESCE(docs.document_count, 0) AS document_count

FROM case_dashboard cd
LEFT JOIN client_intakes ci ON cd.intake_id = ci.id
LEFT JOIN attorneys a ON cd.assigned_attorney_id = a.id
LEFT JOIN activity_counts acts ON acts.dashboard_id = cd.id
LEFT JOIN note_counts notes ON notes.dashboard_id = cd.id
LEFT JOIN doc_counts docs ON docs.intake_id = cd.intake_id;
-- Note: LEFT JOIN to cases table removed until that table exists

COMMENT ON VIEW v_dashboard_detail IS 'Detailed view for single case display in CRM dashboard.';

-- ============================================================================
-- 3. Status Summary View (for dashboard statistics)
-- ============================================================================
CREATE OR REPLACE VIEW v_dashboard_status_summary AS
SELECT
    status,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE is_priority = true) AS priority_count,
    MAX(updated_at) AS last_updated
FROM case_dashboard
WHERE is_archived = false
GROUP BY status
ORDER BY
    CASE status
        WHEN 'new' THEN 1
        WHEN 'in_review' THEN 2
        WHEN 'docs_in_progress' THEN 3
        WHEN 'docs_generated' THEN 4
        WHEN 'sent_to_client' THEN 5
        WHEN 'filed' THEN 6
        WHEN 'closed' THEN 7
        WHEN 'on_hold' THEN 8
    END;

COMMENT ON VIEW v_dashboard_status_summary IS 'Summary statistics by status for dashboard header cards.';

-- ============================================================================
-- 4. Recent Activity View
-- ============================================================================
CREATE OR REPLACE VIEW v_recent_activities AS
SELECT
    ca.id AS activity_id,
    ca.dashboard_id,
    cd.intake_id,
    ci.intake_number,
    ci.first_name || ' ' || ci.last_name AS client_name,
    ca.activity_type,
    ca.description,
    ca.performed_by,
    ca.performed_at,
    ca.old_value,
    ca.new_value,
    ca.metadata
FROM case_activities ca
JOIN case_dashboard cd ON ca.dashboard_id = cd.id
LEFT JOIN client_intakes ci ON cd.intake_id = ci.id
WHERE cd.is_archived = false
ORDER BY ca.performed_at DESC;

COMMENT ON VIEW v_recent_activities IS 'Recent activities across all cases for dashboard feed.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Views created:
-- 1. v_dashboard_list - Main dashboard listing
-- 2. v_dashboard_detail - Single case detail view
-- 3. v_dashboard_status_summary - Status statistics
-- 4. v_recent_activities - Activity feed
-- ============================================================================

COMMIT;
