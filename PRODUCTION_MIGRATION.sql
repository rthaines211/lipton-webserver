-- Production Migration: Create contingency agreement tables
-- Run this in GCP Console SQL Editor for the production database (legal-forms-db)

-- Create contingency_agreements table
CREATE TABLE IF NOT EXISTS contingency_agreements (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE NOT NULL,
  property_address TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Document generation status
  document_status VARCHAR(50) DEFAULT 'pending',
  document_paths JSONB,
  document_url TEXT,
  dropbox_path TEXT,

  -- Email notification fields
  notification_email VARCHAR(255),
  notification_name VARCHAR(255),
  notification_sent BOOLEAN DEFAULT FALSE,

  -- Store complete form data as JSON for reference
  form_data JSONB NOT NULL,

  -- Constraint to ensure valid document status
  CONSTRAINT chk_document_status CHECK (document_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create plaintiffs table
CREATE TABLE IF NOT EXISTS contingency_plaintiffs (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) NOT NULL REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  plaintiff_index INTEGER NOT NULL,

  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  address TEXT,
  unit_number VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Minor plaintiff fields
  is_minor BOOLEAN DEFAULT FALSE,
  guardian_plaintiff_id INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique plaintiff per case
  UNIQUE(case_id, plaintiff_index)
);

-- Create defendants table
CREATE TABLE IF NOT EXISTS contingency_defendants (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) NOT NULL REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  defendant_index INTEGER NOT NULL,

  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique defendant per case
  UNIQUE(case_id, defendant_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_case_id ON contingency_agreements(case_id);
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_submitted_at ON contingency_agreements(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contingency_agreements_document_status ON contingency_agreements(document_status);
CREATE INDEX IF NOT EXISTS idx_contingency_plaintiffs_case_id ON contingency_plaintiffs(case_id);
CREATE INDEX IF NOT EXISTS idx_contingency_defendants_case_id ON contingency_defendants(case_id);

-- Verification query (run this after the migration to confirm)
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
