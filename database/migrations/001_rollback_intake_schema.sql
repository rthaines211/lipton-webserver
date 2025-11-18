-- ============================================================================
-- CLIENT INTAKE SYSTEM - ROLLBACK MIGRATION
-- ============================================================================
-- Rollback for: 001_create_intake_schema
-- Purpose: Remove all client intake tables if needed
-- Date: 2025-11-18
--
-- WARNING: This will delete ALL client intake data!
-- Only run this if you need to completely remove the intake system.
-- ============================================================================

-- Drop views first
DROP VIEW IF EXISTS v_intake_summary CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_set_intake_number ON client_intakes;
DROP TRIGGER IF EXISTS trigger_update_intake_timestamp ON client_intakes;

-- Drop functions
DROP FUNCTION IF EXISTS set_intake_number() CASCADE;
DROP FUNCTION IF EXISTS update_intake_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_intake_number() CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS intake_number_seq CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS intake_attorney_notes CASCADE;
DROP TABLE IF EXISTS intake_timeline CASCADE;
DROP TABLE IF EXISTS intake_witnesses CASCADE;
DROP TABLE IF EXISTS intake_documentation CASCADE;
DROP TABLE IF EXISTS intake_legal_history CASCADE;
DROP TABLE IF EXISTS intake_financial_details CASCADE;
DROP TABLE IF EXISTS intake_maintenance_requests CASCADE;
DROP TABLE IF EXISTS intake_health_impacts CASCADE;
DROP TABLE IF EXISTS intake_utilities_issues CASCADE;
DROP TABLE IF EXISTS intake_building_issues CASCADE;
DROP TABLE IF EXISTS intake_landlord_info CASCADE;
DROP TABLE IF EXISTS intake_household_members CASCADE;
DROP TABLE IF EXISTS client_intakes CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

COMMENT ON DATABASE CURRENT_DATABASE IS 'Client intake schema rolled back';
