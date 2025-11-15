-- ============================================
-- MIGRATION: Create Client Intake Tables
-- ============================================
-- Version: 2.0 (Streamlined JSONB-first approach)
-- Date: 2025-11-14
-- Description: Creates 5 core intake tables (reduced from 13)
-- Strategy: Use JSONB for flexible data, relational tables only where necessary
--
-- TABLES CREATED:
-- 1. client_intakes (main table with JSONB fields)
-- 2. intake_uploaded_files (file metadata - needs relational structure)
-- 3. intake_assignments (attorney assignment tracking)
-- 4. intake_drafts (auto-save support)
-- 5. intake_audit_log (status changes, access log)
-- ============================================

BEGIN;

-- ============================================
-- TABLE 1: client_intakes (MAIN TABLE)
-- ============================================
-- Uses JSONB extensively to avoid table sprawl
-- Stores 235+ fields in structured JSONB columns

CREATE TABLE IF NOT EXISTS client_intakes (
    -- ========================================
    -- PRIMARY KEY
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- TRACKING FIELDS
    -- ========================================
    intake_number VARCHAR(20) UNIQUE NOT NULL, -- Format: INT-2025-00001
    intake_status VARCHAR(50) DEFAULT 'pending' CHECK (intake_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'assigned', 'completed'
    )),
    intake_source VARCHAR(100) DEFAULT 'web_form', -- web_form, phone, email, referral
    urgency_level INTEGER DEFAULT 1 CHECK (urgency_level BETWEEN 1 AND 5), -- 1=low, 5=urgent

    -- ========================================
    -- TIMESTAMPS
    -- ========================================
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP, -- When client submitted (vs. created draft)

    -- ========================================
    -- PERSONAL INFORMATION (Top-level for indexing)
    -- ========================================
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,

    -- ========================================
    -- CONTACT INFORMATION (Top-level for indexing)
    -- ========================================
    email_address VARCHAR(255) NOT NULL,
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    preferred_contact_method VARCHAR(50) DEFAULT 'email' CHECK (preferred_contact_method IN (
        'email', 'phone', 'text', 'no_preference'
    )),

    -- ========================================
    -- ADDRESS INFORMATION (JSONB)
    -- ========================================
    -- Stores both current and property addresses
    current_address JSONB NOT NULL,
    -- Schema: {
    --   "street": "123 Main St",
    --   "unit": "Apt 4B",
    --   "city": "Los Angeles",
    --   "state": "CA",
    --   "zip": "90001",
    --   "county": "Los Angeles County"
    -- }

    property_address JSONB,
    -- Same schema as current_address
    -- If null, assume property_address === current_address

    -- ========================================
    -- TENANCY DETAILS (JSONB)
    -- ========================================
    tenancy_info JSONB,
    -- Schema: {
    --   "leaseStartDate": "2023-01-01",
    --   "monthlyRent": 2000,
    --   "rentControlled": true,
    --   "subsidizedHousing": false,
    --   "moveInDate": "2023-01-15"
    -- }

    -- ========================================
    -- HOUSEHOLD MEMBERS (JSONB ARRAY)
    -- ========================================
    -- Replaces intake_household_members table
    household_members JSONB DEFAULT '[]'::jsonb,
    -- Schema: [
    --   {
    --     "firstName": "Jane",
    --     "lastName": "Doe",
    --     "relationship": "spouse",
    --     "age": 35,
    --     "hasDisability": false
    --   },
    --   ...
    -- ]

    -- ========================================
    -- LANDLORD INFORMATION (JSONB)
    -- ========================================
    -- Replaces intake_landlord_info table
    landlord_info JSONB,
    -- Schema: {
    --   "name": "Acme Properties LLC",
    --   "type": "corporation", // individual, corporation, llc, partnership
    --   "contactName": "John Smith",
    --   "phone": "555-1234",
    --   "email": "landlord@acme.com",
    --   "address": {
    --     "street": "456 Business Ave",
    --     "city": "Los Angeles",
    --     "state": "CA",
    --     "zip": "90002"
    --   }
    -- }

    property_manager_info JSONB,
    -- Same schema as landlord_info

    -- ========================================
    -- BUILDING ISSUES (JSONB)
    -- ========================================
    -- Replaces 5 separate tables:
    -- - intake_building_issues
    -- - intake_pest_issues
    -- - intake_health_safety
    -- - intake_common_areas
    -- - intake_landlord_conduct
    building_issues JSONB DEFAULT '{}'::jsonb,
    -- Schema: {
    --   "structural": {
    --     "ceilingDamage": true,
    --     "wallCracks": true,
    --     "floorDamage": false,
    --     "description": "Large crack in living room ceiling",
    --     "firstNoticed": "2024-06-01",
    --     "reportedDate": "2024-06-05",
    --     "hasPhotos": true
    --   },
    --   "plumbing": {
    --     "cloggedDrains": true,
    --     "leaks": false,
    --     "description": "Kitchen sink constantly clogged",
    --     "firstNoticed": "2024-05-15",
    --     "reportedDate": "2024-05-20"
    --   },
    --   "electrical": { ... },
    --   "hvac": { ... },
    --   "appliances": { ... },
    --   "security": { ... },
    --   "pests": {
    --     "rats": true,
    --     "cockroaches": true,
    --     "bedbugs": false,
    --     "description": "Rats in kitchen, roaches in bathroom",
    --     "severity": "severe" // minor, moderate, severe
    --   },
    --   "environmental": {
    --     "mold": true,
    --     "leadPaint": false,
    --     "asbestos": false,
    --     "description": "Black mold in bathroom and bedroom closet"
    --   },
    --   "commonAreas": {
    --     "brokenLights": true,
    --     "trashAccumulation": true,
    --     "description": "Hallway lights out for 3 months, trash overflowing"
    --   }
    -- }

    -- ========================================
    -- HEALTH & SAFETY (JSONB)
    -- ========================================
    health_impacts JSONB,
    -- Schema: {
    --   "hasHealthIssues": true,
    --   "affectedMembers": ["self", "child1"],
    --   "conditions": ["asthma", "allergies", "respiratory"],
    --   "description": "Children developed asthma from mold exposure",
    --   "hasMedicalRecords": true,
    --   "seekedMedicalCare": true
    -- }

    -- ========================================
    -- LANDLORD CONDUCT (JSONB)
    -- ========================================
    landlord_conduct JSONB,
    -- Schema: {
    --   "harassment": true,
    --   "retaliation": false,
    --   "illegalEntry": true,
    --   "threatsOfEviction": false,
    --   "description": "Landlord enters without notice, verbally harasses about repairs",
    --   "incidents": [
    --     {
    --       "date": "2024-07-01",
    --       "type": "illegal_entry",
    --       "description": "Entered while I was at work"
    --     }
    --   ]
    -- }

    -- ========================================
    -- MAINTENANCE RESPONSE (JSONB)
    -- ========================================
    maintenance_history JSONB,
    -- Schema: {
    --   "requestsMade": 5,
    --   "requestsCompleted": 1,
    --   "averageResponseTime": "never", // immediate, days, weeks, months, never
    --   "hasWrittenRequests": true,
    --   "hasPhotos": true,
    --   "history": [
    --     {
    --       "date": "2024-06-05",
    --       "issue": "Ceiling crack",
    --       "method": "email", // phone, email, in_person, written
    --       "response": "Ignored",
    --       "resolved": false
    --     }
    --   ]
    -- }

    -- ========================================
    -- DOCUMENTATION AVAILABLE (JSONB)
    -- ========================================
    available_documents JSONB DEFAULT '{}'::jsonb,
    -- Schema: {
    --   "leaseAgreement": true,
    --   "rentReceipts": true,
    --   "photos": true,
    --   "videos": false,
    --   "medicalRecords": true,
    --   "inspectionReports": false,
    --   "communications": true, // emails, texts
    --   "other": "Building code violation notices"
    -- }

    -- ========================================
    -- LEGAL & DAMAGES (JSONB)
    -- ========================================
    legal_info JSONB,
    -- Schema: {
    --   "hasAttorney": false,
    --   "hasPreviousLegalAction": false,
    --   "damagesRequested": ["rent_reduction", "relocation", "repairs"],
    --   "estimatedDamages": 5000,
    --   "relocationNeeded": true,
    --   "hasEvictionNotice": false
    -- }

    -- ========================================
    -- ADDITIONAL INFORMATION
    -- ========================================
    additional_notes TEXT,
    client_goals TEXT, -- What does client want to achieve?

    -- ========================================
    -- ASSIGNMENT
    -- ========================================
    assigned_attorney_id UUID,
    assigned_attorney_name VARCHAR(255),
    assigned_date TIMESTAMP,

    -- ========================================
    -- RAW FORM DATA (BACKUP)
    -- ========================================
    -- Full unprocessed form submission
    -- Acts as source of truth if JSONB schema changes
    raw_form_data JSONB,

    -- ========================================
    -- METADATA
    -- ========================================
    session_id VARCHAR(100), -- For tracking multi-session form fills
    ip_address INET, -- For fraud detection
    user_agent TEXT, -- Browser info
    referral_source VARCHAR(255), -- How did client find us?

    -- ========================================
    -- SOFT DELETE
    -- ========================================
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(255),
    deletion_reason TEXT
);

-- ============================================
-- INDEXES FOR client_intakes
-- ============================================

-- Primary lookup indexes
CREATE INDEX idx_intake_status ON client_intakes(intake_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_date ON client_intakes(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_submitted ON client_intakes(submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_assigned ON client_intakes(assigned_attorney_id) WHERE deleted_at IS NULL;

-- Search indexes
CREATE INDEX idx_intake_email ON client_intakes(email_address) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_phone ON client_intakes(primary_phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_name ON client_intakes(last_name, first_name) WHERE deleted_at IS NULL;

-- Full-text search (for modal search bar)
CREATE INDEX idx_intake_fulltext ON client_intakes USING gin(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(email_address, '') || ' ' ||
        coalesce(current_address->>'street', '') || ' ' ||
        coalesce(current_address->>'city', '')
    )
) WHERE deleted_at IS NULL;

-- JSONB indexes (for querying within JSONB fields)
CREATE INDEX idx_intake_current_address ON client_intakes USING gin(current_address);
CREATE INDEX idx_intake_building_issues ON client_intakes USING gin(building_issues);

-- Composite index for common query (status + date)
CREATE INDEX idx_intake_status_date ON client_intakes(intake_status, created_at DESC)
    WHERE deleted_at IS NULL;

-- ============================================
-- TABLE 2: intake_uploaded_files
-- ============================================
-- Needs separate table for:
-- 1. Multiple files per intake
-- 2. File metadata tracking
-- 3. Storage location references

CREATE TABLE IF NOT EXISTS intake_uploaded_files (
    -- ========================================
    -- PRIMARY KEY
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- FOREIGN KEY
    -- ========================================
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- ========================================
    -- FILE METADATA
    -- ========================================
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- image/jpeg, application/pdf, video/mp4
    file_size BIGINT, -- bytes
    file_category VARCHAR(50), -- photo, video, document, medical, other

    -- ========================================
    -- STORAGE LOCATION
    -- ========================================
    storage_provider VARCHAR(50) DEFAULT 'dropbox', -- dropbox, google_cloud, local
    storage_path TEXT NOT NULL, -- Full path/URL to file
    dropbox_path TEXT, -- Dropbox-specific path
    cloud_storage_url TEXT, -- Google Cloud Storage URL

    -- ========================================
    -- UPLOAD INFO
    -- ========================================
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255), -- 'client' or attorney email
    upload_session_id VARCHAR(100), -- Link to form session

    -- ========================================
    -- DESCRIPTION
    -- ========================================
    description TEXT, -- What does this file show?
    issue_category VARCHAR(100), -- structural, plumbing, pest, etc.

    -- ========================================
    -- PROCESSING STATUS
    -- ========================================
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed
    virus_scan_status VARCHAR(50) DEFAULT 'pending', -- pending, clean, infected
    ocr_text TEXT, -- Extracted text from image/PDF (future enhancement)

    -- ========================================
    -- SOFT DELETE
    -- ========================================
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(255)
);

-- Indexes for intake_uploaded_files
CREATE INDEX idx_files_intake ON intake_uploaded_files(intake_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_category ON intake_uploaded_files(file_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_uploaded ON intake_uploaded_files(uploaded_at DESC);

-- ============================================
-- TABLE 3: intake_assignments
-- ============================================
-- Tracks attorney assignment history
-- Allows for re-assignment, load balancing

CREATE TABLE IF NOT EXISTS intake_assignments (
    -- ========================================
    -- PRIMARY KEY
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- FOREIGN KEY
    -- ========================================
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- ========================================
    -- ASSIGNMENT INFO
    -- ========================================
    attorney_id UUID NOT NULL, -- Links to future attorneys table
    attorney_name VARCHAR(255) NOT NULL,
    attorney_email VARCHAR(255),

    -- ========================================
    -- ASSIGNMENT METADATA
    -- ========================================
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255), -- Who assigned it? (admin, auto-assignment)
    assignment_reason VARCHAR(100), -- manual, auto, reassignment, workload_balance

    -- ========================================
    -- UNASSIGNMENT
    -- ========================================
    unassigned_at TIMESTAMP,
    unassigned_by VARCHAR(255),
    unassignment_reason TEXT,

    -- ========================================
    -- STATUS
    -- ========================================
    is_active BOOLEAN DEFAULT true,

    -- ========================================
    -- NOTES
    -- ========================================
    assignment_notes TEXT
);

-- Indexes for intake_assignments
CREATE INDEX idx_assignments_intake ON intake_assignments(intake_id);
CREATE INDEX idx_assignments_attorney ON intake_assignments(attorney_id, is_active);
CREATE INDEX idx_assignments_date ON intake_assignments(assigned_at DESC);

-- ============================================
-- TABLE 4: intake_drafts
-- ============================================
-- Auto-save support for clients filling out form
-- Allows resume from any device (if we implement server-side drafts)

CREATE TABLE IF NOT EXISTS intake_drafts (
    -- ========================================
    -- PRIMARY KEY
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- SESSION TRACKING
    -- ========================================
    session_id VARCHAR(100) NOT NULL UNIQUE, -- Generated client-side

    -- ========================================
    -- DRAFT DATA
    -- ========================================
    draft_data JSONB NOT NULL, -- Partial form data
    current_page INTEGER DEFAULT 1, -- Which page was user on?

    -- ========================================
    -- TIMESTAMPS
    -- ========================================
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CLIENT INFO (for follow-up)
    -- ========================================
    email_address VARCHAR(255), -- If provided
    phone_number VARCHAR(20),

    -- ========================================
    -- EXPIRATION
    -- ========================================
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),

    -- ========================================
    -- CONVERSION TRACKING
    -- ========================================
    converted_to_intake_id UUID REFERENCES client_intakes(id),
    converted_at TIMESTAMP,

    -- ========================================
    -- METADATA
    -- ========================================
    ip_address INET,
    user_agent TEXT,

    -- ========================================
    -- CLEANUP
    -- ========================================
    deleted_at TIMESTAMP
);

-- Indexes for intake_drafts
CREATE INDEX idx_drafts_session ON intake_drafts(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drafts_email ON intake_drafts(email_address) WHERE deleted_at IS NULL;
CREATE INDEX idx_drafts_expires ON intake_drafts(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_drafts_updated ON intake_drafts(last_saved_at DESC);

-- ============================================
-- TABLE 5: intake_audit_log
-- ============================================
-- Audit trail for all intake changes
-- Tracks status changes, access, modifications

CREATE TABLE IF NOT EXISTS intake_audit_log (
    -- ========================================
    -- PRIMARY KEY
    -- ========================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- FOREIGN KEY
    -- ========================================
    intake_id UUID REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- ========================================
    -- ACTION INFO
    -- ========================================
    action VARCHAR(100) NOT NULL, -- created, updated, status_changed, viewed, assigned, etc.
    entity_type VARCHAR(50) DEFAULT 'intake', -- intake, file, assignment
    entity_id UUID, -- ID of affected entity

    -- ========================================
    -- CHANGE DETAILS
    -- ========================================
    old_value JSONB, -- Previous state
    new_value JSONB, -- New state
    changed_fields TEXT[], -- Array of field names that changed

    -- ========================================
    -- USER INFO
    -- ========================================
    performed_by VARCHAR(255) NOT NULL, -- Email or 'system'
    performed_by_role VARCHAR(50), -- attorney, admin, client, system

    -- ========================================
    -- TIMESTAMP
    -- ========================================
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONTEXT
    -- ========================================
    ip_address INET,
    user_agent TEXT,
    notes TEXT
);

-- Indexes for intake_audit_log
CREATE INDEX idx_audit_intake ON intake_audit_log(intake_id);
CREATE INDEX idx_audit_date ON intake_audit_log(performed_at DESC);
CREATE INDEX idx_audit_user ON intake_audit_log(performed_by);
CREATE INDEX idx_audit_action ON intake_audit_log(action);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_intakes_updated_at
    BEFORE UPDATE ON client_intakes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intake_drafts_updated_at
    BEFORE UPDATE ON intake_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create audit log entries
-- ============================================

CREATE OR REPLACE FUNCTION log_intake_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF (TG_OP = 'UPDATE' AND OLD.intake_status IS DISTINCT FROM NEW.intake_status) THEN
        INSERT INTO intake_audit_log (
            intake_id,
            action,
            entity_type,
            old_value,
            new_value,
            performed_by,
            performed_by_role
        ) VALUES (
            NEW.id,
            'status_changed',
            'intake',
            jsonb_build_object('status', OLD.intake_status),
            jsonb_build_object('status', NEW.intake_status),
            COALESCE(current_setting('app.current_user', true), 'system'),
            'system'
        );
    END IF;

    -- Log assignment changes
    IF (TG_OP = 'UPDATE' AND OLD.assigned_attorney_id IS DISTINCT FROM NEW.assigned_attorney_id) THEN
        INSERT INTO intake_audit_log (
            intake_id,
            action,
            entity_type,
            old_value,
            new_value,
            performed_by,
            performed_by_role
        ) VALUES (
            NEW.id,
            'assigned',
            'intake',
            jsonb_build_object('attorney_id', OLD.assigned_attorney_id, 'attorney_name', OLD.assigned_attorney_name),
            jsonb_build_object('attorney_id', NEW.assigned_attorney_id, 'attorney_name', NEW.assigned_attorney_name),
            COALESCE(current_setting('app.current_user', true), 'system'),
            'system'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_intake_changes
    AFTER UPDATE ON client_intakes
    FOR EACH ROW
    EXECUTE FUNCTION log_intake_changes();

-- ============================================
-- VIEWS: Helpful query views
-- ============================================

-- Active intakes (not deleted, not completed)
CREATE OR REPLACE VIEW active_intakes AS
SELECT *
FROM client_intakes
WHERE deleted_at IS NULL
  AND intake_status NOT IN ('completed', 'rejected');

-- Recent submissions (last 30 days)
CREATE OR REPLACE VIEW recent_submissions AS
SELECT *
FROM client_intakes
WHERE deleted_at IS NULL
  AND submitted_at > (CURRENT_TIMESTAMP - INTERVAL '30 days')
ORDER BY submitted_at DESC;

-- Urgent intakes (high urgency, not assigned)
CREATE OR REPLACE VIEW urgent_unassigned AS
SELECT *
FROM client_intakes
WHERE deleted_at IS NULL
  AND urgency_level >= 4
  AND assigned_attorney_id IS NULL
ORDER BY urgency_level DESC, created_at ASC;

-- Intake with file counts
CREATE OR REPLACE VIEW intakes_with_file_counts AS
SELECT
    i.*,
    COUNT(f.id) AS file_count,
    SUM(f.file_size) AS total_file_size
FROM client_intakes i
LEFT JOIN intake_uploaded_files f ON f.intake_id = i.id AND f.deleted_at IS NULL
WHERE i.deleted_at IS NULL
GROUP BY i.id;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate next intake number
CREATE OR REPLACE FUNCTION generate_intake_number()
RETURNS VARCHAR AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    last_number INT;
    next_number INT;
    new_intake_number VARCHAR;
BEGIN
    -- Get last intake number for current year
    SELECT
        COALESCE(
            MAX(
                CAST(
                    SPLIT_PART(intake_number, '-', 3) AS INT
                )
            ),
            0
        )
    INTO last_number
    FROM client_intakes
    WHERE intake_number LIKE 'INT-' || current_year || '-%';

    -- Increment
    next_number := last_number + 1;

    -- Format: INT-2025-00001
    new_intake_number := 'INT-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN new_intake_number;
END;
$$ LANGUAGE plpgsql;

-- Search intakes (full-text search)
CREATE OR REPLACE FUNCTION search_intakes(search_query TEXT)
RETURNS TABLE (
    id UUID,
    intake_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    email_address VARCHAR,
    intake_status VARCHAR,
    created_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.intake_number,
        i.first_name,
        i.last_name,
        i.email_address,
        i.intake_status,
        i.created_at,
        ts_rank(
            to_tsvector('english',
                coalesce(i.first_name, '') || ' ' ||
                coalesce(i.last_name, '') || ' ' ||
                coalesce(i.email_address, '') || ' ' ||
                coalesce(i.current_address->>'street', '')
            ),
            plainto_tsquery('english', search_query)
        ) AS rank
    FROM client_intakes i
    WHERE i.deleted_at IS NULL
      AND to_tsvector('english',
            coalesce(i.first_name, '') || ' ' ||
            coalesce(i.last_name, '') || ' ' ||
            coalesce(i.email_address, '') || ' ' ||
            coalesce(i.current_address->>'street', '')
          ) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, i.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample intake
INSERT INTO client_intakes (
    intake_number,
    first_name,
    last_name,
    email_address,
    primary_phone,
    current_address,
    household_members,
    building_issues,
    landlord_info
) VALUES (
    generate_intake_number(),
    'John',
    'Doe',
    'john.doe@example.com',
    '(555) 123-4567',
    '{
        "street": "123 Main Street",
        "unit": "Apt 2B",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90001",
        "county": "Los Angeles County"
    }'::jsonb,
    '[
        {
            "firstName": "Jane",
            "lastName": "Doe",
            "relationship": "spouse",
            "age": 35
        },
        {
            "firstName": "Jimmy",
            "lastName": "Doe",
            "relationship": "child",
            "age": 8
        }
    ]'::jsonb,
    '{
        "structural": {
            "ceilingDamage": true,
            "wallCracks": true,
            "description": "Large crack in living room ceiling, water damage visible",
            "firstNoticed": "2024-06-01",
            "reportedDate": "2024-06-05",
            "hasPhotos": true
        },
        "plumbing": {
            "cloggedDrains": true,
            "leaks": false,
            "description": "Kitchen sink constantly clogged, slow drainage in bathroom",
            "firstNoticed": "2024-05-15",
            "reportedDate": "2024-05-20"
        },
        "pests": {
            "rats": true,
            "cockroaches": true,
            "description": "Rats in kitchen at night, roaches in bathroom and bedroom",
            "severity": "severe"
        },
        "environmental": {
            "mold": true,
            "description": "Black mold in bathroom and bedroom closet, strong musty smell"
        }
    }'::jsonb,
    '{
        "name": "Acme Properties LLC",
        "type": "corporation",
        "contactName": "Bob Smith",
        "phone": "(555) 999-8888",
        "email": "manager@acmeproperties.com"
    }'::jsonb
);

-- ============================================
-- GRANTS (adjust based on your user roles)
-- ============================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'intake_%';
-- SELECT count(*) FROM client_intakes;
-- SELECT generate_intake_number(); -- Should return INT-2025-00001 (or next number)
-- SELECT * FROM search_intakes('John Doe');
