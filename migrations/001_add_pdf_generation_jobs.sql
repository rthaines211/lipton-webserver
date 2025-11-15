-- ============================================
-- PDF Generation Jobs Table
-- Tracks asynchronous PDF generation jobs for court forms
-- ============================================
-- Migration: 001_add_pdf_generation_jobs
-- Date: 2025-11-12
-- Feature: PDF Form Filling (001-pdf-form-filling)
-- ============================================

-- Create pdf_generation_jobs table
CREATE TABLE IF NOT EXISTS pdf_generation_jobs (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Foreign key to form_submissions table
  form_submission_id INTEGER NOT NULL,
  -- FOREIGN KEY (form_submission_id) REFERENCES form_entries(id) ON DELETE CASCADE,

  -- Job status: pending, processing, retrying, completed, failed
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'retrying', 'completed', 'failed')),

  -- Retry tracking (0-3 retries allowed)
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),

  -- Error information (populated on failure)
  error_message TEXT NULL,

  -- Dropbox file information (populated on success)
  dropbox_file_id VARCHAR(255) NULL,
  dropbox_file_path TEXT NULL,
  generated_filename VARCHAR(255) NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for lookup by form submission ID
CREATE INDEX IF NOT EXISTS idx_pdf_gen_jobs_form_submission_id
  ON pdf_generation_jobs(form_submission_id);

-- Index for job queue processing (fetch pending/retrying jobs)
CREATE INDEX IF NOT EXISTS idx_pdf_gen_jobs_status_created
  ON pdf_generation_jobs(status, created_at);

-- ============================================
-- Trigger to Update updated_at Timestamp
-- ============================================

-- Create or replace function to update updated_at
CREATE OR REPLACE FUNCTION update_pdf_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotent migration)
DROP TRIGGER IF EXISTS pdf_generation_jobs_updated_at_trigger ON pdf_generation_jobs;

-- Create trigger to automatically update updated_at
CREATE TRIGGER pdf_generation_jobs_updated_at_trigger
  BEFORE UPDATE ON pdf_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_generation_jobs_updated_at();

-- ============================================
-- Rollback Script (Comment Out for Apply)
-- ============================================

/*
-- To rollback this migration, run:
DROP TRIGGER IF EXISTS pdf_generation_jobs_updated_at_trigger ON pdf_generation_jobs;
DROP FUNCTION IF EXISTS update_pdf_generation_jobs_updated_at();
DROP INDEX IF EXISTS idx_pdf_gen_jobs_status_created;
DROP INDEX IF EXISTS idx_pdf_gen_jobs_form_submission_id;
DROP TABLE IF EXISTS pdf_generation_jobs;
*/

-- ============================================
-- Migration Complete
-- ============================================
