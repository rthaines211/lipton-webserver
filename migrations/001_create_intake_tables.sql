-- =====================================================================
-- Migration: 001_create_intake_tables.sql
-- Purpose: Create all tables for the Client Intake System
-- Author: Ryan Haines
-- Date: November 2025
-- =====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. MAIN INTAKE SUBMISSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS intake_submissions (
    id SERIAL PRIMARY KEY,
    intake_number VARCHAR(20) UNIQUE NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    current_street_address VARCHAR(255),
    current_city VARCHAR(100),
    current_state VARCHAR(2),
    current_zip_code VARCHAR(10),
    intake_status VARCHAR(20) DEFAULT 'new' CHECK (intake_status IN ('new', 'reviewing', 'approved', 'rejected')),
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'urgent', 'emergency')),
    assigned_attorney_id INTEGER,
    assigned_attorney_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE intake_submissions IS 'Main table for client intake form submissions';
COMMENT ON COLUMN intake_submissions.intake_number IS 'Unique identifier in format INT-YYYY-#####';
COMMENT ON COLUMN intake_submissions.intake_status IS 'Current status of the intake: new, reviewing, approved, or rejected';
COMMENT ON COLUMN intake_submissions.urgency_level IS 'Priority level: normal, urgent, or emergency';

-- =====================================================================
-- 2. INTAKE PAGE DATA TABLES (5 separate tables for each page)
-- =====================================================================

-- Page 1: Personal and Contact Information
CREATE TABLE IF NOT EXISTS intake_page_1 (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE intake_page_1 IS 'Page 1 data: Personal and contact information (sections 1-5)';

-- Page 2: Property and Household Information
CREATE TABLE IF NOT EXISTS intake_page_2 (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE intake_page_2 IS 'Page 2 data: Property and household information (sections 6-10)';

-- Page 3: Building and Structural Issues
CREATE TABLE IF NOT EXISTS intake_page_3 (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE intake_page_3 IS 'Page 3 data: Building and structural issues (sections 11-15)';

-- Page 4: Health, Safety, and Harassment Issues
CREATE TABLE IF NOT EXISTS intake_page_4 (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE intake_page_4 IS 'Page 4 data: Health, safety, and harassment issues (sections 16-20)';

-- Page 5: Documentation and Additional Information
CREATE TABLE IF NOT EXISTS intake_page_5 (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE intake_page_5 IS 'Page 5 data: Documentation and additional information (sections 21-25)';

-- =====================================================================
-- 3. SAVED SESSIONS TABLE (for save and resume functionality)
-- =====================================================================
CREATE TABLE IF NOT EXISTS saved_sessions (
    id SERIAL PRIMARY KEY,
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    intake_data JSONB NOT NULL,
    email VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE saved_sessions IS 'Temporary storage for incomplete intake forms with resume tokens';
COMMENT ON COLUMN saved_sessions.token IS 'Unique UUID token sent via email for resuming intake';
COMMENT ON COLUMN saved_sessions.expires_at IS 'Token expiration timestamp (typically 30 days)';
COMMENT ON COLUMN saved_sessions.used IS 'Whether this token has been used to resume and complete an intake';

-- =====================================================================
-- 4. ATTORNEYS TABLE (for authentication and assignment)
-- =====================================================================
CREATE TABLE IF NOT EXISTS attorneys (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'attorney' CHECK (role IN ('attorney', 'admin')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

COMMENT ON TABLE attorneys IS 'Attorney user accounts for portal access';
COMMENT ON COLUMN attorneys.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN attorneys.role IS 'User role: attorney (standard) or admin (full access)';
COMMENT ON COLUMN attorneys.active IS 'Whether the account is active (for soft deletes)';

-- =====================================================================
-- 5. AUDIT LOGS TABLE (for compliance and tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Audit trail for all attorney actions and system events';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., login, view_intake, update_status)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., intake_submission, attorney)';
COMMENT ON COLUMN audit_logs.details IS 'Additional context about the action in JSON format';

-- =====================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

-- Indexes for intake_submissions
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON intake_submissions(intake_status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_created_at ON intake_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_email ON intake_submissions(client_email);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_urgency ON intake_submissions(urgency_level);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_attorney ON intake_submissions(assigned_attorney_id);

-- Indexes for page tables (for faster joins)
CREATE INDEX IF NOT EXISTS idx_intake_page_1_intake_id ON intake_page_1(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_page_2_intake_id ON intake_page_2(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_page_3_intake_id ON intake_page_3(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_page_4_intake_id ON intake_page_4(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_page_5_intake_id ON intake_page_5(intake_id);

-- Indexes for saved_sessions
CREATE INDEX IF NOT EXISTS idx_saved_sessions_token ON saved_sessions(token);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_expires_at ON saved_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_email ON saved_sessions(email);

-- Indexes for attorneys
CREATE INDEX IF NOT EXISTS idx_attorneys_email ON attorneys(email);
CREATE INDEX IF NOT EXISTS idx_attorneys_active ON attorneys(active);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================================
-- CREATE UPDATE TIMESTAMP TRIGGER FUNCTION
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================================
-- ADD UPDATE TRIGGERS TO ALL TABLES WITH updated_at COLUMN
-- =====================================================================

-- Trigger for intake_submissions
DROP TRIGGER IF EXISTS update_intake_submissions_updated_at ON intake_submissions;
CREATE TRIGGER update_intake_submissions_updated_at
    BEFORE UPDATE ON intake_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers for page tables
DROP TRIGGER IF EXISTS update_intake_page_1_updated_at ON intake_page_1;
CREATE TRIGGER update_intake_page_1_updated_at
    BEFORE UPDATE ON intake_page_1
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intake_page_2_updated_at ON intake_page_2;
CREATE TRIGGER update_intake_page_2_updated_at
    BEFORE UPDATE ON intake_page_2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intake_page_3_updated_at ON intake_page_3;
CREATE TRIGGER update_intake_page_3_updated_at
    BEFORE UPDATE ON intake_page_3
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intake_page_4_updated_at ON intake_page_4;
CREATE TRIGGER update_intake_page_4_updated_at
    BEFORE UPDATE ON intake_page_4
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intake_page_5_updated_at ON intake_page_5;
CREATE TRIGGER update_intake_page_5_updated_at
    BEFORE UPDATE ON intake_page_5
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: No trigger for attorneys table as it doesn't have updated_at in spec

-- =====================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- =====================================================================
/*
-- Check all tables were created:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs')
ORDER BY tablename;

-- Should return:
-- attorneys
-- audit_logs
-- intake_page_1
-- intake_page_2
-- intake_page_3
-- intake_page_4
-- intake_page_5
-- intake_submissions
-- saved_sessions

-- Test the updated_at trigger:
INSERT INTO intake_submissions (intake_number, client_email, first_name, last_name)
VALUES ('INT-2025-TEST1', 'test@example.com', 'Test', 'User');

UPDATE intake_submissions
SET client_phone = '555-1234'
WHERE intake_number = 'INT-2025-TEST1';

SELECT intake_number, created_at, updated_at
FROM intake_submissions
WHERE intake_number = 'INT-2025-TEST1';
-- updated_at should be different from created_at

-- Clean up test data:
DELETE FROM intake_submissions WHERE intake_number = 'INT-2025-TEST1';
*/

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Total objects created:
-- - 9 tables
-- - 23 indexes
-- - 1 function
-- - 6 triggers
-- =====================================================================
