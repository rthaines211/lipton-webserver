-- Migration: Create Client Intake Tables
-- Created: 2025-11-17
-- Description: Initial schema for client intake system

-- Table 1: Intake Submissions (main record)
CREATE TABLE IF NOT EXISTS intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_email VARCHAR(255) NOT NULL,
    attorney_id UUID,
    status VARCHAR(50) DEFAULT 'new',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmation_number VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching by email
CREATE INDEX idx_intake_submissions_email ON intake_submissions(client_email);
CREATE INDEX idx_intake_submissions_status ON intake_submissions(status);
CREATE INDEX idx_intake_submissions_submitted_at ON intake_submissions(submitted_at DESC);

-- Table 2-6: Page Data (JSONB for flexibility)
CREATE TABLE IF NOT EXISTS intake_page_1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for page lookups
CREATE INDEX idx_intake_page_1_submission ON intake_page_1(submission_id);
CREATE INDEX idx_intake_page_2_submission ON intake_page_2(submission_id);
CREATE INDEX idx_intake_page_3_submission ON intake_page_3(submission_id);
CREATE INDEX idx_intake_page_4_submission ON intake_page_4(submission_id);
CREATE INDEX idx_intake_page_5_submission ON intake_page_5(submission_id);

-- Table 7: Saved Sessions (for save & resume)
CREATE TABLE IF NOT EXISTS saved_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    session_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup and cleanup
CREATE INDEX idx_saved_sessions_token ON saved_sessions(token);
CREATE INDEX idx_saved_sessions_expires_at ON saved_sessions(expires_at);

-- Table 8: Attorneys (for authentication)
CREATE TABLE IF NOT EXISTS attorneys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'attorney',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookup (login)
CREATE INDEX idx_attorneys_email ON attorneys(email);
CREATE INDEX idx_attorneys_is_active ON attorneys(is_active);

-- Table 9: Audit Logs (for security tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_type VARCHAR(100),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_id, resource_type);

-- Add foreign key for attorney_id after attorneys table is created
ALTER TABLE intake_submissions 
ADD CONSTRAINT fk_intake_submissions_attorney 
FOREIGN KEY (attorney_id) REFERENCES attorneys(id) ON DELETE SET NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_intake_submissions_updated_at BEFORE UPDATE ON intake_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_1_updated_at BEFORE UPDATE ON intake_page_1 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_2_updated_at BEFORE UPDATE ON intake_page_2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_3_updated_at BEFORE UPDATE ON intake_page_3 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_4_updated_at BEFORE UPDATE ON intake_page_4 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_5_updated_at BEFORE UPDATE ON intake_page_5 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attorneys_updated_at BEFORE UPDATE ON attorneys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "app-user-dev";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "app-user-dev";
