-- Migration: Add missing pest columns
-- Date: 2025-11-18
-- Purpose: Add pest columns that are missing from the database

ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS pest_cockroaches boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_bedbugs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_ants boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_termites boolean DEFAULT false;

-- Comments for documentation
COMMENT ON COLUMN intake_building_issues.pest_cockroaches IS 'Checkbox: Cockroaches pest issue';
COMMENT ON COLUMN intake_building_issues.pest_bedbugs IS 'Checkbox: Bed bugs pest issue';
COMMENT ON COLUMN intake_building_issues.pest_ants IS 'Checkbox: Ants pest issue';
COMMENT ON COLUMN intake_building_issues.pest_termites IS 'Checkbox: Termites pest issue';
