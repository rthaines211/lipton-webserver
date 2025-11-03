-- ============================================================================
-- Migration: Add Case Metadata Columns
-- Date: 2025-11-03
-- Purpose: Add case_number, case_title, plaintiff_name for easier querying
-- ============================================================================
-- These columns provide quick access to commonly-needed case information
-- without needing to query into JSONB payload fields
-- ============================================================================

BEGIN;

-- Add case_number column (extracted from payload or auto-generated)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_number VARCHAR(255);

-- Add case_title column (e.g., "Plaintiff v. Defendant")
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_title TEXT;

-- Add plaintiff_name column (primary plaintiff name)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS plaintiff_name VARCHAR(511);

-- Add comments
COMMENT ON COLUMN cases.case_number IS 'Case number/identifier from form submission';
COMMENT ON COLUMN cases.case_title IS 'Case title in format "Plaintiff v. Defendant"';
COMMENT ON COLUMN cases.plaintiff_name IS 'Primary plaintiff name for quick reference';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cases_case_number
ON cases (case_number)
WHERE case_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_plaintiff_name
ON cases (plaintiff_name)
WHERE plaintiff_name IS NOT NULL;

-- Create a function to extract case metadata from payload
CREATE OR REPLACE FUNCTION extract_case_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract case_number from payload (prefer caseNumber field)
    IF NEW.raw_payload ? 'caseNumber' THEN
        NEW.case_number := NEW.raw_payload->>'caseNumber';
    ELSIF NEW.raw_payload ? 'Case Number' THEN
        NEW.case_number := NEW.raw_payload->>'Case Number';
    END IF;

    -- Extract case_title from payload
    IF NEW.raw_payload ? 'caseTitle' THEN
        NEW.case_title := NEW.raw_payload->>'caseTitle';
    ELSIF NEW.raw_payload ? 'Case Title' THEN
        NEW.case_title := NEW.raw_payload->>'Case Title';
    END IF;

    -- Extract plaintiff_name from payload (various possible locations)
    IF NEW.raw_payload ? 'plaintiffName' THEN
        NEW.plaintiff_name := NEW.raw_payload->>'plaintiffName';
    ELSIF NEW.raw_payload ? 'name' THEN
        NEW.plaintiff_name := NEW.raw_payload->>'name';
    ELSIF NEW.raw_payload ? 'PlaintiffDetails' AND
          jsonb_typeof(NEW.raw_payload->'PlaintiffDetails') = 'array' AND
          jsonb_array_length(NEW.raw_payload->'PlaintiffDetails') > 0 THEN
        -- Extract from first plaintiff's name structure
        NEW.plaintiff_name := NEW.raw_payload->'PlaintiffDetails'->0->'PlaintiffItemNumberName'->>'FirstAndLast';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate metadata on insert/update
DROP TRIGGER IF EXISTS trigger_extract_case_metadata ON cases;
CREATE TRIGGER trigger_extract_case_metadata
    BEFORE INSERT OR UPDATE OF raw_payload, latest_payload
    ON cases
    FOR EACH ROW
    EXECUTE FUNCTION extract_case_metadata();

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cases'
  AND column_name IN ('case_number', 'case_title', 'plaintiff_name')
ORDER BY column_name;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'cases'
  AND indexname LIKE 'idx_cases_%'
ORDER BY indexname;

-- ============================================================================
-- End of Migration
-- ============================================================================
