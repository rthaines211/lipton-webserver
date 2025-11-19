-- Phase 1: Add Filing County and Head of Household fields
-- Date: 2025-11-19
-- Purpose: Support critical doc-gen mapping requirements

-- Add filing_county column (required for doc-gen)
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS filing_county TEXT;

-- Add is_head_of_household column (required for Plaintiff #1 logic)
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS is_head_of_household BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN client_intakes.filing_county IS 'County where legal case will be filed - required for doc-gen mapping';
COMMENT ON COLUMN client_intakes.is_head_of_household IS 'Whether the client is the head of household - affects Plaintiff #1 mapping in doc-gen';
