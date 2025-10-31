-- ============================================================================
-- Migration: Add document_types_to_generate column
-- Phase 2.1: Document Selection Feature
-- Date: 2025-10-31
-- ============================================================================
-- This migration adds support for users to select which legal documents
-- they want to generate (SROGs, PODs, Admissions) from the confirmation modal.
-- ============================================================================

-- Add the document_types_to_generate column to cases table
-- Stores an array of document type codes as JSONB
-- Default: all three document types
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS document_types_to_generate JSONB DEFAULT '["srogs", "pods", "admissions"]'::JSONB;

-- Add a check constraint to ensure only valid document types
ALTER TABLE cases
ADD CONSTRAINT cases_document_types_check
CHECK (
    document_types_to_generate IS NOT NULL
    AND jsonb_typeof(document_types_to_generate) = 'array'
    AND jsonb_array_length(document_types_to_generate) > 0
);

-- Add comment to document the column
COMMENT ON COLUMN cases.document_types_to_generate IS 'Array of document types to generate for this case. Valid values: "srogs", "pods", "admissions"';

-- Create an index for querying by document types
-- This allows efficient queries like "find all cases that generate SROGs"
CREATE INDEX IF NOT EXISTS idx_cases_document_types
ON cases USING GIN (document_types_to_generate);

-- Backfill existing records with all document types (default behavior)
-- This ensures backwards compatibility - existing cases will generate all documents
UPDATE cases
SET document_types_to_generate = '["srogs", "pods", "admissions"]'::JSONB
WHERE document_types_to_generate IS NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify the migration was successful:

-- 1. Check column exists and has correct type
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'cases' AND column_name = 'document_types_to_generate';

-- 2. Check index was created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'cases' AND indexname = 'idx_cases_document_types';

-- 3. Check all existing records have the default value
-- SELECT COUNT(*) as total_cases,
--        COUNT(*) FILTER (WHERE document_types_to_generate IS NOT NULL) as with_document_types
-- FROM cases;

-- 4. Sample query: Find cases that generate SROGs
-- SELECT id, property_address, document_types_to_generate
-- FROM cases
-- WHERE document_types_to_generate @> '["srogs"]'::JSONB
-- LIMIT 10;

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- To rollback this migration, run:
-- ALTER TABLE cases DROP COLUMN IF EXISTS document_types_to_generate CASCADE;
-- DROP INDEX IF EXISTS idx_cases_document_types;
-- ============================================================================
