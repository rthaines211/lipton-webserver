-- ============================================================================
-- MIGRATION 003: CREATE INTAKE-SPECIFIC ISSUE TABLES
-- ============================================================================
-- Purpose: Create intake-only tables for issue tracking
-- Date: 2025-01-21
-- Phase: 1.4 - Database Foundation
--
-- CRITICAL: These tables are COMPLETELY SEPARATE from doc gen tables.
-- - NO foreign keys to parties, cases, or any doc gen tables
-- - These tables reference the shared taxonomy (issue_categories, issue_options)
-- - Intake data will be mapped to doc gen format at READ time only
--
-- Tables Created:
-- 1. intake_issue_selections - Which specific options the client selected
-- 2. intake_issue_metadata - Extra intake-only metadata (details, dates, photos)
--
-- Rollback: See 003_rollback_intake_issue_tables.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: intake_issue_selections
-- Links client intakes to specific issue options they've selected
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_issue_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,
    issue_option_id UUID NOT NULL REFERENCES issue_options(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure no duplicate selections
    CONSTRAINT unique_intake_issue UNIQUE (intake_id, issue_option_id)
);

CREATE INDEX idx_intake_selections_intake ON intake_issue_selections(intake_id);
CREATE INDEX idx_intake_selections_option ON intake_issue_selections(issue_option_id);
CREATE INDEX idx_intake_selections_created ON intake_issue_selections(created_at DESC);

COMMENT ON TABLE intake_issue_selections IS
    'Client intake issue selections. Links intakes to specific issue options from shared taxonomy. SEPARATE from doc gen party_issue_selections table.';

COMMENT ON COLUMN intake_issue_selections.intake_id IS
    'References client_intakes table (intake system only)';

COMMENT ON COLUMN intake_issue_selections.issue_option_id IS
    'References shared issue_options table (used by both systems)';

-- ============================================================================
-- TABLE: intake_issue_metadata
-- Stores extra intake-specific metadata not present in doc gen
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_issue_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,
    category_code VARCHAR(50) NOT NULL,  -- NOT a FK, just a reference string

    -- Extra fields for intake (not in doc gen)
    details TEXT,                        -- Client's detailed description
    first_noticed DATE,                  -- When issue was first noticed
    repair_history TEXT,                 -- History of repair attempts
    photos JSONB DEFAULT '[]'::jsonb,    -- Array of photo metadata (placeholder for future)
    severity VARCHAR(20),                -- mild, moderate, severe

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One metadata record per category per intake
    CONSTRAINT unique_intake_category_metadata UNIQUE (intake_id, category_code),
    CONSTRAINT chk_severity CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe'))
);

CREATE INDEX idx_intake_metadata_intake ON intake_issue_metadata(intake_id);
CREATE INDEX idx_intake_metadata_category ON intake_issue_metadata(category_code);
CREATE INDEX idx_intake_metadata_severity ON intake_issue_metadata(severity) WHERE severity IS NOT NULL;

COMMENT ON TABLE intake_issue_metadata IS
    'Client intake issue metadata. Stores extra fields not present in doc gen system. Examples: detailed descriptions, dates, photos, severity ratings.';

COMMENT ON COLUMN intake_issue_metadata.category_code IS
    'Category code reference (e.g., "vermin", "insects"). NOT a foreign key - allows flexibility. Validated by trigger.';

COMMENT ON COLUMN intake_issue_metadata.photos IS
    'JSONB array of photo metadata. Structure: [{"id": "uuid", "filename": "...", "url": "...", "uploadedAt": "...", "size": 123, "mimeType": "image/jpeg", "caption": "..."}]. Placeholder for future photo upload feature.';

COMMENT ON COLUMN intake_issue_metadata.details IS
    'Client-provided detailed description of the issue. Free-form text field.';

COMMENT ON COLUMN intake_issue_metadata.first_noticed IS
    'Date when client first noticed this issue. Used for timeline tracking.';

COMMENT ON COLUMN intake_issue_metadata.repair_history IS
    'Client-provided history of repair requests and attempts for this category.';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_intake_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intake_metadata_timestamp
    BEFORE UPDATE ON intake_issue_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_intake_metadata_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 003 Complete:';
    RAISE NOTICE '  - intake_issue_selections table created';
    RAISE NOTICE '  - intake_issue_metadata table created';
    RAISE NOTICE '  - Indexes and constraints applied';
    RAISE NOTICE '  - Tables are SEPARATE from doc gen system';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries manually to verify:
-- \d intake_issue_selections
-- \d intake_issue_metadata
-- SELECT COUNT(*) FROM intake_issue_selections; -- Should be 0 (no data yet)
-- SELECT COUNT(*) FROM intake_issue_metadata; -- Should be 0 (no data yet)
