-- ============================================================================
-- Rollback Migration 011: Dashboard Views
-- ============================================================================
-- Date: 2025-12-11
-- Phase: 7A.2 - Dashboard Views (ROLLBACK)
--
-- This script removes all views created by migration 011.
-- ============================================================================

BEGIN;

-- Drop all dashboard views
DROP VIEW IF EXISTS v_recent_activities CASCADE;
DROP VIEW IF EXISTS v_dashboard_status_summary CASCADE;
DROP VIEW IF EXISTS v_dashboard_detail CASCADE;
DROP VIEW IF EXISTS v_dashboard_list CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- Views removed:
-- 1. v_dashboard_list
-- 2. v_dashboard_detail
-- 3. v_dashboard_status_summary
-- 4. v_recent_activities
-- ============================================================================

COMMIT;
