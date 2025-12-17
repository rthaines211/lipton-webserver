-- ============================================================================
-- Migration 011 Patch: Fix JSONB key extraction issues
-- ============================================================================
-- Date: 2025-12-12
-- Issues Fixed:
-- 1. Views were extracting 'zip' but data is stored as 'zipCode' (camelCase)
-- 2. Views were using 'leaseStartDate' but form now submits 'moveInDate'
--
-- This patch updates the dashboard views to use the correct JSONB keys.
-- Run this after migration 011 to fix the data extraction.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Update v_dashboard_list view
-- ============================================================================
DROP VIEW IF EXISTS v_dashboard_list CASCADE;

CREATE OR REPLACE VIEW v_dashboard_list AS
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

    -- Property address from intake (extracted from JSONB) - FIXED: zipCode not zip
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
    cd.case_id AS linked_case_id,
    0 AS plaintiff_count,
    0 AS defendant_count,

    -- Activity summary
    (SELECT COUNT(*) FROM case_activities ca
     WHERE ca.dashboard_id = cd.id) AS activity_count,
    (SELECT MAX(ca.performed_at) FROM case_activities ca
     WHERE ca.dashboard_id = cd.id) AS last_activity_at,

    -- Notes summary
    (SELECT COUNT(*) FROM case_notes cn
     WHERE cn.dashboard_id = cd.id AND cn.is_deleted = false) AS note_count,
    (SELECT COUNT(*) FROM case_notes cn
     WHERE cn.dashboard_id = cd.id AND cn.is_pinned = true AND cn.is_deleted = false) AS pinned_note_count,

    -- Document counts
    (SELECT COUNT(*) FROM generated_documents gd
     WHERE gd.intake_id = cd.intake_id) AS document_count

FROM case_dashboard cd
LEFT JOIN client_intakes ci ON cd.intake_id = ci.id
LEFT JOIN attorneys a ON cd.assigned_attorney_id = a.id
WHERE cd.is_archived = false
ORDER BY cd.is_priority DESC, cd.updated_at DESC;

COMMENT ON VIEW v_dashboard_list IS 'Unified view for CRM dashboard listing. Combines intake, workflow, and activity data.';

-- ============================================================================
-- 2. Update v_dashboard_detail view
-- ============================================================================
DROP VIEW IF EXISTS v_dashboard_detail CASCADE;

CREATE OR REPLACE VIEW v_dashboard_detail AS
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

    -- Current address (from JSONB) - FIXED: zipCode not zip
    ci.current_address->>'street' AS current_street_address,
    ci.current_address->>'unit' AS current_unit_number,
    ci.current_address->>'city' AS current_city,
    ci.current_address->>'state' AS current_state,
    ci.current_address->>'zipCode' AS current_zip_code,

    -- Property address (from JSONB) - FIXED: zipCode not zip
    ci.property_address->>'street' AS property_street_address,
    ci.property_address->>'unit' AS property_unit_number,
    ci.property_address->>'city' AS property_city,
    ci.property_address->>'state' AS property_state,
    ci.property_address->>'zipCode' AS property_zip_code,
    NULL AS property_type,
    (ci.tenancy_info->>'isRentControlled')::boolean AS is_rent_controlled,

    -- Tenancy details (from JSONB with camelCase keys)
    -- Support both old (leaseStartDate) and new (moveInDate) field names
    COALESCE((ci.tenancy_info->>'leaseStartDate')::date, (ci.tenancy_info->>'moveInDate')::date) AS lease_start_date,
    (ci.tenancy_info->>'leaseEndDate')::date AS lease_end_date,
    ci.tenancy_info->>'leaseType' AS lease_type,
    (ci.tenancy_info->>'monthlyRent')::numeric AS monthly_rent,
    (ci.tenancy_info->>'securityDeposit')::numeric AS security_deposit,

    -- Counts
    (SELECT COUNT(*) FROM case_activities ca
     WHERE ca.dashboard_id = cd.id) AS activity_count,
    (SELECT COUNT(*) FROM case_notes cn
     WHERE cn.dashboard_id = cd.id AND cn.is_deleted = false) AS note_count,
    (SELECT COUNT(*) FROM generated_documents gd
     WHERE gd.intake_id = cd.intake_id) AS document_count

FROM case_dashboard cd
LEFT JOIN client_intakes ci ON cd.intake_id = ci.id
LEFT JOIN attorneys a ON cd.assigned_attorney_id = a.id;

COMMENT ON VIEW v_dashboard_detail IS 'Detailed view for single case display in CRM dashboard.';

-- ============================================================================
-- Recreate dependent views that were dropped by CASCADE
-- ============================================================================

-- v_dashboard_status_summary (no dependencies on dropped views)
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

-- v_recent_activities
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
-- PATCH COMPLETE
-- ============================================================================
-- Fixed JSONB key extraction:
-- 1. Changed 'zip' to 'zipCode' in v_dashboard_list and v_dashboard_detail
-- 2. Added fallback from 'leaseStartDate' to 'moveInDate' for lease_start_date
-- ============================================================================

COMMIT;
