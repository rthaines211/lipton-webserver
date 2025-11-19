-- ============================================
-- MIGRATION: Add preferred_name column
-- ============================================
-- Version: 002
-- Date: 2025-11-18
-- Description: Add preferred_name column to client_intakes table
-- Reason: API code expects this field but it was missing from initial schema
-- ============================================

BEGIN;

-- Add preferred_name column
ALTER TABLE client_intakes
ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'client_intakes'
-- AND column_name = 'preferred_name';
