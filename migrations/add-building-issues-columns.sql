-- Migration: Add missing building issue columns to intake_building_issues table
-- Date: 2025-11-17
-- Purpose: Add plumbing, electrical, HVAC, and appliance issue columns to support expanded intake form

-- PLUMBING ISSUES (11 checkboxes + details + dates)
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS has_plumbing_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_no_water boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_low_pressure boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_leaks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_clogged_drains boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_toilet_not_working boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_sink_not_working boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_shower_not_working boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_no_hot_water boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_sewer_backup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_mold_from_leaks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plumbing_other_details text,
ADD COLUMN IF NOT EXISTS plumbing_details text,
ADD COLUMN IF NOT EXISTS plumbing_first_noticed date,
ADD COLUMN IF NOT EXISTS plumbing_reported_date date;

-- ELECTRICAL ISSUES (11 checkboxes + details + dates)
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS has_electrical_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_no_power boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_partial_outages boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_exposed_wiring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_sparking_outlets boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_broken_outlets boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_broken_switches boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_flickering_lights boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_circuit_breaker_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_insufficient_outlets boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_burning_smell boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electrical_other_details text,
ADD COLUMN IF NOT EXISTS electrical_details text,
ADD COLUMN IF NOT EXISTS electrical_first_noticed date,
ADD COLUMN IF NOT EXISTS electrical_reported_date date;

-- HVAC ISSUES (9 checkboxes + details + dates)
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS has_hvac_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_no_heat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_inadequate_heat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_no_air_conditioning boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_inadequate_cooling boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_broken_thermostat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_gas_smell boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_carbon_monoxide_detector_missing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_ventilation_poor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hvac_other_details text,
ADD COLUMN IF NOT EXISTS hvac_details text,
ADD COLUMN IF NOT EXISTS hvac_first_noticed date,
ADD COLUMN IF NOT EXISTS hvac_reported_date date;

-- APPLIANCE ISSUES (8 checkboxes + details, NO dates)
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS has_appliance_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_refrigerator_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_stove_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_oven_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_dishwasher_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_garbage_disposal_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_washer_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_dryer_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS appliance_other_details text,
ADD COLUMN IF NOT EXISTS appliance_details text;

-- Update security issues to match new naming convention
-- Add missing security issue columns
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS security_no_deadbolt boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_broken_gate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_broken_intercom boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_no_smoke_detector boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_break_ins boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS security_other_details text,
ADD COLUMN IF NOT EXISTS security_details text;

-- Update pest issues to match new naming convention
-- Add missing pest issue columns (new detailed breakdown)
ALTER TABLE intake_building_issues
ADD COLUMN IF NOT EXISTS pest_rats boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_mice boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_fleas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_spiders boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_wasps boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_bees boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_other_insects boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_birds boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_raccoons boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_other_vermin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pest_other_details text,
ADD COLUMN IF NOT EXISTS pest_details text,
ADD COLUMN IF NOT EXISTS pest_first_noticed date,
ADD COLUMN IF NOT EXISTS pest_reported_date date;

-- Comments for documentation
COMMENT ON COLUMN intake_building_issues.has_plumbing_issues IS 'Master checkbox: Client has plumbing issues';
COMMENT ON COLUMN intake_building_issues.has_electrical_issues IS 'Master checkbox: Client has electrical issues';
COMMENT ON COLUMN intake_building_issues.has_hvac_issues IS 'Master checkbox: Client has HVAC/heating issues';
COMMENT ON COLUMN intake_building_issues.has_appliance_issues IS 'Master checkbox: Client has appliance issues';
