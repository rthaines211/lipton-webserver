-- ============================================================
-- Migration: Add Regeneration Tracking Columns
-- ============================================================
-- Purpose: Track when and how many times documents have been regenerated
-- Date: 2025-01-03
-- Feature: Document Regeneration

BEGIN;

-- ============================================================
-- STEP 1: ADD COLUMNS
-- ============================================================

-- Last regeneration timestamp
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMP;

-- Count of regenerations performed
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS regeneration_count INTEGER DEFAULT 0;

-- Store document selection history (optional - for advanced analytics)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS regeneration_history JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN cases.last_regenerated_at IS 'Timestamp of most recent document regeneration';
COMMENT ON COLUMN cases.regeneration_count IS 'Total number of times documents have been regenerated';
COMMENT ON COLUMN cases.regeneration_history IS 'Array of regeneration events with timestamp and document types';

-- ============================================================
-- STEP 2: ADD INDEXES
-- ============================================================

-- Index for querying recently regenerated cases
CREATE INDEX IF NOT EXISTS idx_cases_last_regenerated_at
ON cases (last_regenerated_at DESC)
WHERE last_regenerated_at IS NOT NULL;

-- Index for querying cases by regeneration count
CREATE INDEX IF NOT EXISTS idx_cases_regeneration_count
ON cases (regeneration_count)
WHERE regeneration_count > 0;

-- GIN index for regeneration history JSONB queries
CREATE INDEX IF NOT EXISTS idx_cases_regeneration_history
ON cases USING GIN (regeneration_history);

-- ============================================================
-- STEP 3: ADD CONSTRAINTS
-- ============================================================

-- Ensure regeneration_count is non-negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cases_regeneration_count_check'
    ) THEN
        ALTER TABLE cases
        ADD CONSTRAINT cases_regeneration_count_check
        CHECK (regeneration_count >= 0);
    END IF;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify columns added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cases'
    AND column_name IN ('last_regenerated_at', 'regeneration_count', 'regeneration_history')
ORDER BY column_name;

-- Verify indexes created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'cases'
    AND indexname LIKE '%regenerat%'
ORDER BY indexname;

-- Verify constraints
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%regeneration%'
    AND conrelid = 'cases'::regclass;
