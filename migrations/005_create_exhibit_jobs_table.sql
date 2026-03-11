-- Migration: Create exhibit_jobs table for async exhibit processing
-- Date: 2026-03-11

CREATE TABLE IF NOT EXISTS exhibit_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    case_name VARCHAR(255) NOT NULL,
    total_files INTEGER NOT NULL,
    exhibit_mapping JSONB NOT NULL,
    dropbox_source_path VARCHAR(500),
    dropbox_output_path VARCHAR(500),
    gcs_output_url TEXT,
    email VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Partial index for active jobs (used by jobs dashboard polling)
CREATE INDEX idx_exhibit_jobs_active
    ON exhibit_jobs (status)
    WHERE status NOT IN ('complete', 'failed');

-- Index for cleanup queries
CREATE INDEX idx_exhibit_jobs_created_at ON exhibit_jobs (created_at);

-- Add status constraint
ALTER TABLE exhibit_jobs
    ADD CONSTRAINT chk_exhibit_jobs_status
    CHECK (status IN ('pending', 'downloading', 'processing', 'complete', 'failed'));
