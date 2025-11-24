-- ============================================================================
-- MIGRATION 002: CREATE SHARED ISSUE TAXONOMY
-- ============================================================================
-- Purpose: Create shared taxonomy tables that both intake and doc gen reference
-- Date: 2025-01-21
-- Phase: 1.3 - Database Foundation
--
-- CRITICAL: This migration creates READ-ONLY shared taxonomy.
-- Both intake system and doc gen system will reference these tables.
-- NO modifications to existing doc gen tables.
--
-- Tables Created:
-- 1. issue_categories - 30 categories (vermin, insects, hvac, etc.)
-- 2. issue_options - 158 specific options within categories
--
-- Rollback: See 002_rollback_shared_taxonomy.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: issue_categories
-- Shared taxonomy of issue categories used by both systems
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_category_code_format CHECK (category_code ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
    CONSTRAINT chk_display_order_positive CHECK (display_order > 0)
);

CREATE UNIQUE INDEX idx_issue_categories_code ON issue_categories(category_code);
CREATE INDEX idx_issue_categories_display_order ON issue_categories(display_order);
CREATE INDEX idx_issue_categories_active ON issue_categories(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE issue_categories IS
    'Shared taxonomy of issue categories. Referenced by both intake and doc gen systems. ADDITIVE ONLY - never modify existing rows.';
COMMENT ON COLUMN issue_categories.category_code IS
    'Unique code used in application logic (e.g., vermin, insects, hvac)';
COMMENT ON COLUMN issue_categories.display_order IS
    'Order for consistent UI display across both systems';

-- ============================================================================
-- TABLE: issue_options
-- Specific options within each category
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES issue_categories(id),
    option_code VARCHAR(100) NOT NULL,
    option_name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_category_option UNIQUE (category_id, option_code),
    CONSTRAINT chk_option_display_order_positive CHECK (display_order > 0)
);

CREATE INDEX idx_issue_options_category ON issue_options(category_id);
CREATE INDEX idx_issue_options_display_order ON issue_options(category_id, display_order);
CREATE INDEX idx_issue_options_active ON issue_options(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE issue_options IS
    'Specific options within each issue category. Referenced by both intake and doc gen systems. ADDITIVE ONLY - never modify existing rows.';
COMMENT ON COLUMN issue_options.option_code IS
    'Unique code within category (e.g., RatsMice, Bedbugs, SmokeAlarms)';
COMMENT ON COLUMN issue_options.option_name IS
    'Display name shown to users (e.g., "Rats/Mice", "Bedbugs", "Smoke alarms")';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_taxonomy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_issue_categories_timestamp
    BEFORE UPDATE ON issue_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_taxonomy_timestamp();

CREATE TRIGGER trigger_update_issue_options_timestamp
    BEFORE UPDATE ON issue_options
    FOR EACH ROW
    EXECUTE FUNCTION update_taxonomy_timestamp();

-- ============================================================================
-- SEED DATA: Load from CSV files
-- ============================================================================

-- Note: Data loading will be done via separate script to handle CSV import
-- See: scripts/load-taxonomy-seed-data.js

-- For immediate use, insert data directly:

-- Load issue_categories
\copy issue_categories(category_code, category_name, display_order, is_active) FROM 'database/seed-data/issue-categories.csv' WITH (FORMAT csv, HEADER true);

-- Load issue_options
-- Note: We need to resolve category_id from category_code
-- This will be done in a separate step after categories are loaded

-- Create temporary table for loading
CREATE TEMP TABLE temp_issue_options (
    category_code VARCHAR(50),
    option_code VARCHAR(100),
    option_name VARCHAR(255),
    display_order INTEGER,
    is_active BOOLEAN
);

\copy temp_issue_options FROM 'database/seed-data/issue-options.csv' WITH (FORMAT csv, HEADER true);

-- Insert into issue_options with resolved category_id
INSERT INTO issue_options (category_id, option_code, option_name, display_order, is_active)
SELECT
    ic.id,
    t.option_code,
    t.option_name,
    t.display_order,
    t.is_active
FROM temp_issue_options t
JOIN issue_categories ic ON ic.category_code = t.category_code;

-- Drop temporary table
DROP TABLE temp_issue_options;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify counts
DO $$
DECLARE
    category_count INTEGER;
    option_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM issue_categories;
    SELECT COUNT(*) INTO option_count FROM issue_options;

    RAISE NOTICE 'Migration 002 Complete:';
    RAISE NOTICE '  Categories loaded: %', category_count;
    RAISE NOTICE '  Options loaded: %', option_count;

    IF category_count <> 30 THEN
        RAISE EXCEPTION 'Expected 30 categories, got %', category_count;
    END IF;

    IF option_count <> 158 THEN
        RAISE EXCEPTION 'Expected 158 options, got %', option_count;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries manually to verify:
-- SELECT COUNT(*) FROM issue_categories; -- Should be 30
-- SELECT COUNT(*) FROM issue_options; -- Should be 158
-- SELECT category_code, category_name, display_order FROM issue_categories ORDER BY display_order;
-- SELECT ic.category_code, io.option_code, io.option_name
-- FROM issue_options io
-- JOIN issue_categories ic ON io.category_id = ic.id
-- WHERE ic.category_code = 'vermin'
-- ORDER BY io.display_order;
