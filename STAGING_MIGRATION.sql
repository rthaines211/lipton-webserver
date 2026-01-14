-- ============================================================================
-- STAGING DATABASE MIGRATION
-- Run this SQL in GCP Console → Cloud SQL → legal-forms-db-staging → SQL Editor
-- ============================================================================

-- Create contingency_agreements table
CREATE TABLE IF NOT EXISTS contingency_agreements (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE NOT NULL,

  -- Property Information
  property_address TEXT NOT NULL,

  -- Submission metadata
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Document generation status
  document_status VARCHAR(50) DEFAULT 'pending',
  document_paths JSONB, -- Array of file paths for generated documents
  document_url TEXT,
  dropbox_path TEXT,

  -- Notification settings
  notification_email VARCHAR(255),
  notification_name VARCHAR(255),
  notification_sent BOOLEAN DEFAULT FALSE,

  -- Raw form data (JSON)
  form_data JSONB NOT NULL,

  -- Constraints
  CONSTRAINT chk_document_status CHECK (document_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create contingency_plaintiffs table
CREATE TABLE IF NOT EXISTS contingency_plaintiffs (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  plaintiff_index INTEGER NOT NULL,

  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  address TEXT, -- Optional, derived from property address
  unit_number VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Minor status
  is_minor BOOLEAN DEFAULT FALSE,
  guardian_plaintiff_id INTEGER, -- References another plaintiff in same case

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, plaintiff_index)
);

-- Create contingency_defendants table
CREATE TABLE IF NOT EXISTS contingency_defendants (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  defendant_index INTEGER NOT NULL,

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, defendant_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_case_id ON contingency_agreements(case_id);
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_submitted_at ON contingency_agreements(submitted_at);
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_status ON contingency_agreements(document_status);
CREATE INDEX IF NOT EXISTS idx_contingency_plaintiffs_case_id ON contingency_plaintiffs(case_id);
CREATE INDEX IF NOT EXISTS idx_contingency_defendants_case_id ON contingency_defendants(case_id);

-- Add comments for documentation
COMMENT ON TABLE contingency_agreements IS 'Main table for contingency agreement form submissions';
COMMENT ON TABLE contingency_plaintiffs IS 'Plaintiff information for contingency agreements';
COMMENT ON TABLE contingency_defendants IS 'Defendant information for contingency agreements';
COMMENT ON COLUMN contingency_plaintiffs.guardian_plaintiff_id IS 'References plaintiff_index of guardian (for minors)';

-- ============================================================================
-- Verification Query - Run this to verify tables were created
-- ============================================================================
SELECT
  'contingency_agreements' as table_name,
  COUNT(*) as row_count
FROM contingency_agreements
UNION ALL
SELECT
  'contingency_plaintiffs' as table_name,
  COUNT(*) as row_count
FROM contingency_plaintiffs
UNION ALL
SELECT
  'contingency_defendants' as table_name,
  COUNT(*) as row_count
FROM contingency_defendants;
