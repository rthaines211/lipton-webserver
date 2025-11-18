-- Migration: Remove duplicate pest columns with old naming convention
-- Date: 2025-11-18
-- Purpose: Remove old 'pests_*' columns that conflict with new 'pest_*' columns

-- The database has both old naming (pests_cockroaches) and new naming (pest_cockroaches)
-- We're using the new 'pest_*' naming in the code, so drop the old 'pests_*' columns

ALTER TABLE intake_building_issues
DROP COLUMN IF EXISTS pests_rodents,
DROP COLUMN IF EXISTS pests_cockroaches,
DROP COLUMN IF EXISTS pests_bedbugs,
DROP COLUMN IF EXISTS pests_termites,
DROP COLUMN IF EXISTS pests_ants,
DROP COLUMN IF EXISTS pests_other,
DROP COLUMN IF EXISTS pests_other_details,
DROP COLUMN IF EXISTS pests_details,
DROP COLUMN IF EXISTS pests_first_noticed,
DROP COLUMN IF EXISTS pests_reported_date;
