-- ============================================================================
-- Rollback Migration 010: CRM Dashboard Tables
-- ============================================================================
-- Date: 2025-12-11
-- Phase: 7A.1 - Database Foundation for CRM Dashboard (ROLLBACK)
--
-- This script removes all tables and triggers created by migration 010.
-- Execute this script to completely reverse the dashboard tables migration.
-- Note: Does NOT drop attorneys table (it's a pre-existing auth table)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Triggers First (before dropping functions)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_case_dashboard_status_changed ON case_dashboard;
DROP TRIGGER IF EXISTS trigger_case_dashboard_updated ON case_dashboard;
DROP TRIGGER IF EXISTS trigger_case_notes_updated ON case_notes;

-- ============================================================================
-- 2. Drop Functions
-- ============================================================================
DROP FUNCTION IF EXISTS update_status_changed_timestamp();
DROP FUNCTION IF EXISTS update_dashboard_timestamp();

-- ============================================================================
-- 3. Drop Tables (in order respecting foreign key constraints)
-- ============================================================================
-- Drop case_notes first (references case_dashboard)
DROP TABLE IF EXISTS case_notes CASCADE;

-- Drop case_activities (references case_dashboard)
DROP TABLE IF EXISTS case_activities CASCADE;

-- Drop case_dashboard (references attorneys, client_intakes, cases)
DROP TABLE IF EXISTS case_dashboard CASCADE;

-- Drop generated_documents (references client_intakes, cases)
DROP TABLE IF EXISTS generated_documents CASCADE;

-- Note: attorneys table is NOT dropped - it's a pre-existing auth table

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- Tables removed:
-- 1. case_notes
-- 2. case_activities
-- 3. case_dashboard
-- 4. generated_documents
--
-- Functions removed:
-- - update_status_changed_timestamp()
-- - update_dashboard_timestamp()
--
-- Note: attorneys table preserved (pre-existing auth table)
-- ============================================================================

COMMIT;
