-- ============================================
-- Pipeline Status Table
-- Cross-instance store for document-generation job status (replaces in-memory Map)
-- ============================================
-- Migration: 005_create_pipeline_status
-- Date: 2026-07-19
-- Feature: Postgres-backed pipeline status
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_status (
  case_id     TEXT PRIMARY KEY,
  status      JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_status_expires
  ON pipeline_status(expires_at);

-- ============================================
-- Rollback (comment out for apply)
-- ============================================
/*
DROP INDEX IF EXISTS idx_pipeline_status_expires;
DROP TABLE IF EXISTS pipeline_status;
*/
