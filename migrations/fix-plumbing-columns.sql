-- Migration: Add missing plumbing columns
-- Date: 2025-11-17
-- Purpose: Add missing plumbing issue columns (burst pipes, water damage, flooding, water discoloration)

ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS plumbing_burst_pipes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_water_damage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_flooding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_water_discoloration boolean DEFAULT false;

-- Comments for documentation
COMMENT ON COLUMN intake_building_issues.plumbing_burst_pipes IS 'Checkbox: Burst pipes issue';
COMMENT ON COLUMN intake_building_issues.plumbing_water_damage IS 'Checkbox: Water damage from plumbing';
COMMENT ON COLUMN intake_building_issues.plumbing_flooding IS 'Checkbox: Flooding from plumbing';
COMMENT ON COLUMN intake_building_issues.plumbing_water_discoloration IS 'Checkbox: Water discoloration';
