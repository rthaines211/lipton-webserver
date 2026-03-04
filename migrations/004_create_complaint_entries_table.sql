-- Migration: Create Complaint Entries Tables
-- Date: 2026-03-04
-- Description: Database schema for legal complaint generator form submissions

-- Complaint entries main table
CREATE TABLE IF NOT EXISTS complaint_entries (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE NOT NULL,

  -- Case Information
  case_name VARCHAR(500),
  case_number VARCHAR(100),
  filing_date DATE,

  -- Jurisdiction & Venue
  city VARCHAR(255),
  county VARCHAR(255),

  -- Causes of Action (selected checkbox keys)
  causes_of_action JSONB DEFAULT '[]',

  -- Submission metadata
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Document generation status
  document_status VARCHAR(50) DEFAULT 'pending',
  document_paths JSONB DEFAULT '[]',

  -- Raw form data (JSON)
  form_data JSONB NOT NULL,

  -- Constraints
  CONSTRAINT chk_complaint_document_status CHECK (document_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Plaintiffs table for complaints
CREATE TABLE IF NOT EXISTS complaint_plaintiffs (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES complaint_entries(case_id) ON DELETE CASCADE,
  plaintiff_index INTEGER NOT NULL,

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  plaintiff_type VARCHAR(50) DEFAULT 'individual',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, plaintiff_index)
);

-- Defendants table for complaints
CREATE TABLE IF NOT EXISTS complaint_defendants (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES complaint_entries(case_id) ON DELETE CASCADE,
  defendant_index INTEGER NOT NULL,

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  defendant_type VARCHAR(50) DEFAULT 'individual',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, defendant_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaint_entries_case_id ON complaint_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_complaint_entries_submitted_at ON complaint_entries(submitted_at);
CREATE INDEX IF NOT EXISTS idx_complaint_entries_status ON complaint_entries(document_status);
CREATE INDEX IF NOT EXISTS idx_complaint_plaintiffs_case_id ON complaint_plaintiffs(case_id);
CREATE INDEX IF NOT EXISTS idx_complaint_defendants_case_id ON complaint_defendants(case_id);

-- Comments for documentation
COMMENT ON TABLE complaint_entries IS 'Main table for legal complaint form submissions';
COMMENT ON TABLE complaint_plaintiffs IS 'Plaintiff information for legal complaints';
COMMENT ON TABLE complaint_defendants IS 'Defendant information for legal complaints';
COMMENT ON COLUMN complaint_entries.causes_of_action IS 'JSONB array of selected cause-of-action keys';
COMMENT ON COLUMN complaint_plaintiffs.plaintiff_type IS 'individual or minor';
COMMENT ON COLUMN complaint_defendants.defendant_type IS 'individual or corporate';
