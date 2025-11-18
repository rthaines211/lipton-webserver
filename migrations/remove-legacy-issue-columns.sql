-- Migration: Remove legacy mold and water issue columns
-- Date: 2025-11-18
-- Purpose: Remove old mold and water columns that are not used in the new consolidated form

-- Remove old mold issue columns (not used in new form)
ALTER TABLE intake_building_issues
DROP COLUMN IF EXISTS has_mold,
DROP COLUMN IF EXISTS mold_bathroom,
DROP COLUMN IF EXISTS mold_bedroom,
DROP COLUMN IF EXISTS mold_kitchen,
DROP COLUMN IF EXISTS mold_living_area,
DROP COLUMN IF EXISTS mold_walls,
DROP COLUMN IF EXISTS mold_ceiling,
DROP COLUMN IF EXISTS mold_other,
DROP COLUMN IF EXISTS mold_other_details,
DROP COLUMN IF EXISTS mold_details,
DROP COLUMN IF EXISTS mold_first_noticed,
DROP COLUMN IF EXISTS mold_reported_date;

-- Remove old water issue columns (not used in new form)
ALTER TABLE intake_building_issues
DROP COLUMN IF EXISTS has_water_issues,
DROP COLUMN IF EXISTS water_leaks_roof,
DROP COLUMN IF EXISTS water_leaks_plumbing,
DROP COLUMN IF EXISTS water_flooding,
DROP COLUMN IF EXISTS water_sewer_backup,
DROP COLUMN IF EXISTS water_standing_water,
DROP COLUMN IF EXISTS water_other,
DROP COLUMN IF EXISTS water_other_details,
DROP COLUMN IF EXISTS water_details,
DROP COLUMN IF EXISTS water_first_noticed,
DROP COLUMN IF EXISTS water_reported_date;

-- Remove old security columns that have date tracking (not used in new consolidated form)
ALTER TABLE intake_building_issues
DROP COLUMN IF EXISTS security_no_cameras,
DROP COLUMN IF EXISTS security_first_noticed,
DROP COLUMN IF EXISTS security_reported_date;

-- Remove old plumbing column that's been replaced
ALTER TABLE intake_building_issues
DROP COLUMN IF EXISTS plumbing_mold_from_leaks;
