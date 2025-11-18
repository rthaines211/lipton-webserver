-- ============================================================================
-- CLIENT INTAKE SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Migration: 001_create_intake_schema
-- Purpose: Create all client intake tables for Week 3
-- Date: 2025-11-18
--
-- This schema creates 13 new tables to support the client intake system.
-- These tables are separate from the existing document generation tables
-- (cases, parties, etc.) and will be mapped when attorneys load intakes.
--
-- Tables Created:
-- 1. client_intakes (main intake record)
-- 2. intake_household_members (household composition)
-- 3. intake_landlord_info (landlord & property manager)
-- 4. intake_building_issues (structural issues)
-- 5. intake_utilities_issues (utilities problems)
-- 6. intake_health_impacts (health effects)
-- 7. intake_maintenance_requests (repair history)
-- 8. intake_financial_details (income, expenses, damages)
-- 9. intake_legal_history (prior cases, notices)
-- 10. intake_documentation (uploaded files)
-- 11. intake_witnesses (potential witnesses)
-- 12. intake_timeline (event chronology)
-- 13. intake_attorney_notes (review notes)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: client_intakes
-- Main intake record containing basic client and property information
-- ============================================================================
CREATE TABLE client_intakes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tracking Fields
    intake_number VARCHAR(20) UNIQUE NOT NULL, -- Format: INT-2025-00001
    intake_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    intake_status VARCHAR(50) DEFAULT 'pending',
    intake_source VARCHAR(100), -- website, referral, phone, walk-in
    referral_details TEXT,

    -- Section 1: Personal Information (10 fields)
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    ssn_last_four VARCHAR(4), -- Only last 4 digits for identification
    gender VARCHAR(20),
    marital_status VARCHAR(30),
    language_preference VARCHAR(50) DEFAULT 'English',
    requires_interpreter BOOLEAN DEFAULT FALSE,

    -- Section 2: Contact Information (12 fields)
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    work_phone VARCHAR(20),
    email_address VARCHAR(255) NOT NULL,
    preferred_contact_method VARCHAR(50), -- phone, email, text
    preferred_contact_time VARCHAR(100), -- morning, afternoon, evening, weekends
    emergency_contact_name VARCHAR(100),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(20),
    can_text_primary BOOLEAN DEFAULT TRUE,
    can_leave_voicemail BOOLEAN DEFAULT TRUE,
    communication_restrictions TEXT,

    -- Section 3: Current Address (8 fields)
    current_street_address VARCHAR(255) NOT NULL,
    current_unit_number VARCHAR(50),
    current_city VARCHAR(100) NOT NULL,
    current_state VARCHAR(2) NOT NULL,
    current_zip_code VARCHAR(10) NOT NULL,
    current_county VARCHAR(100),
    years_at_current_address INTEGER,
    months_at_current_address INTEGER,

    -- Section 4: Property Information (12 fields)
    property_street_address VARCHAR(255) NOT NULL,
    property_unit_number VARCHAR(50),
    property_city VARCHAR(100) NOT NULL,
    property_state VARCHAR(2) NOT NULL,
    property_zip_code VARCHAR(10) NOT NULL,
    property_county VARCHAR(100),
    property_type VARCHAR(50), -- apartment, house, condo, mobile_home
    number_of_units_in_building INTEGER,
    floor_number INTEGER,
    total_floors_in_building INTEGER,
    property_age_years INTEGER,
    is_rent_controlled BOOLEAN,

    -- Section 5: Tenancy Details (10 fields)
    lease_start_date DATE,
    lease_end_date DATE,
    lease_type VARCHAR(50), -- month_to_month, fixed_term, verbal
    monthly_rent DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    last_rent_increase_date DATE,
    last_rent_increase_amount DECIMAL(10,2),
    rent_current BOOLEAN DEFAULT TRUE,
    months_behind_rent INTEGER DEFAULT 0,
    received_eviction_notice BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_by_ip VARCHAR(45),
    submission_user_agent TEXT,
    form_completion_time_seconds INTEGER,

    -- Assignment & Review
    assigned_attorney_id UUID,
    assigned_attorney_name VARCHAR(255),
    assigned_date TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    reviewed_date TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Urgency & Priority
    urgency_level VARCHAR(20) DEFAULT 'medium',
    priority_score INTEGER, -- 1-100 calculated score
    estimated_case_value DECIMAL(12,2),
    statute_of_limitations_date DATE,

    -- Raw Data Storage (for debugging/audit trail)
    raw_form_data JSONB, -- Complete original submission
    processed_data JSONB, -- Normalized/cleaned data
    validation_errors JSONB,

    -- Constraints
    CONSTRAINT chk_intake_status CHECK (intake_status IN ('pending', 'under_review', 'approved', 'rejected', 'assigned', 'converted')),
    CONSTRAINT chk_urgency CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_state_length CHECK (LENGTH(current_state) = 2 AND LENGTH(property_state) = 2),
    CONSTRAINT chk_priority_score CHECK (priority_score IS NULL OR (priority_score >= 1 AND priority_score <= 100))
);

-- Indexes for common queries
CREATE INDEX idx_intakes_status ON client_intakes(intake_status);
CREATE INDEX idx_intakes_date ON client_intakes(intake_date DESC);
CREATE INDEX idx_intakes_assigned_attorney ON client_intakes(assigned_attorney_id);
CREATE INDEX idx_intakes_email ON client_intakes(email_address);
CREATE INDEX idx_intakes_property_address ON client_intakes(property_street_address, property_city, property_state);

-- ============================================================================
-- TABLE 2: intake_household_members
-- Household composition - people living at the property
-- ============================================================================
CREATE TABLE intake_household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Member Information
    member_type VARCHAR(50), -- spouse, child, parent, sibling, other
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    relationship_to_client VARCHAR(100),
    age INTEGER,
    date_of_birth DATE,
    has_disability BOOLEAN DEFAULT FALSE,
    disability_description TEXT,

    -- Computed field for minor status
    is_minor BOOLEAN GENERATED ALWAYS AS (age < 18) STORED,

    -- Living situation
    in_unit_full_time BOOLEAN DEFAULT TRUE,
    affected_by_issues BOOLEAN DEFAULT TRUE,
    specific_health_impacts TEXT,

    -- Ordering
    display_order INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_age_valid CHECK (age IS NULL OR (age >= 0 AND age <= 120)),
    UNIQUE(intake_id, display_order)
);

CREATE INDEX idx_household_intake ON intake_household_members(intake_id);

-- ============================================================================
-- TABLE 3: intake_landlord_info
-- Landlord and property manager information
-- ============================================================================
CREATE TABLE intake_landlord_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Landlord Information
    landlord_type VARCHAR(50), -- individual, corporation, llc, partnership
    landlord_name VARCHAR(255) NOT NULL,
    landlord_company_name VARCHAR(255),
    landlord_phone VARCHAR(20),
    landlord_email VARCHAR(255),
    landlord_address VARCHAR(255),
    landlord_city VARCHAR(100),
    landlord_state VARCHAR(2),
    landlord_zip VARCHAR(10),
    landlord_attorney_name VARCHAR(255),

    -- Property Management
    has_property_manager BOOLEAN DEFAULT FALSE,
    manager_company_name VARCHAR(255),
    manager_contact_name VARCHAR(255),
    manager_phone VARCHAR(20),
    manager_email VARCHAR(255),
    manager_address VARCHAR(255),
    manager_response_time VARCHAR(100), -- same_day, next_day, 2-3_days, week_or_more, never
    manager_is_responsive BOOLEAN,

    -- Communication History
    last_contact_date DATE,
    last_contact_method VARCHAR(50),
    last_contact_subject TEXT,
    contact_log TEXT, -- JSON array of contact attempts

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One landlord record per intake
    CONSTRAINT unique_intake_landlord UNIQUE(intake_id)
);

CREATE INDEX idx_landlord_intake ON intake_landlord_info(intake_id);

-- ============================================================================
-- TABLE 4: intake_building_issues
-- Structural and building-related issues
-- ============================================================================
CREATE TABLE intake_building_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Structural Issues (checkbox fields)
    has_structural_issues BOOLEAN DEFAULT FALSE,
    structural_ceiling_damage BOOLEAN DEFAULT FALSE,
    structural_wall_cracks BOOLEAN DEFAULT FALSE,
    structural_floor_damage BOOLEAN DEFAULT FALSE,
    structural_foundation_issues BOOLEAN DEFAULT FALSE,
    structural_roof_leaks BOOLEAN DEFAULT FALSE,
    structural_window_damage BOOLEAN DEFAULT FALSE,
    structural_door_damage BOOLEAN DEFAULT FALSE,
    structural_stairs_unsafe BOOLEAN DEFAULT FALSE,
    structural_balcony_unsafe BOOLEAN DEFAULT FALSE,
    structural_railing_missing BOOLEAN DEFAULT FALSE,
    structural_other BOOLEAN DEFAULT FALSE,
    structural_other_details TEXT,
    structural_details TEXT,
    structural_first_noticed DATE,
    structural_reported_date DATE,

    -- Pest Issues
    has_pest_issues BOOLEAN DEFAULT FALSE,
    pests_rodents BOOLEAN DEFAULT FALSE,
    pests_cockroaches BOOLEAN DEFAULT FALSE,
    pests_bedbugs BOOLEAN DEFAULT FALSE,
    pests_termites BOOLEAN DEFAULT FALSE,
    pests_ants BOOLEAN DEFAULT FALSE,
    pests_other BOOLEAN DEFAULT FALSE,
    pests_other_details TEXT,
    pests_details TEXT,
    pests_first_noticed DATE,
    pests_reported_date DATE,

    -- Mold and Environmental
    has_mold BOOLEAN DEFAULT FALSE,
    mold_bathroom BOOLEAN DEFAULT FALSE,
    mold_bedroom BOOLEAN DEFAULT FALSE,
    mold_kitchen BOOLEAN DEFAULT FALSE,
    mold_living_area BOOLEAN DEFAULT FALSE,
    mold_walls BOOLEAN DEFAULT FALSE,
    mold_ceiling BOOLEAN DEFAULT FALSE,
    mold_other BOOLEAN DEFAULT FALSE,
    mold_other_details TEXT,
    mold_details TEXT,
    mold_first_noticed DATE,
    mold_reported_date DATE,

    -- Water Issues
    has_water_issues BOOLEAN DEFAULT FALSE,
    water_leaks_roof BOOLEAN DEFAULT FALSE,
    water_leaks_plumbing BOOLEAN DEFAULT FALSE,
    water_flooding BOOLEAN DEFAULT FALSE,
    water_sewer_backup BOOLEAN DEFAULT FALSE,
    water_standing_water BOOLEAN DEFAULT FALSE,
    water_other BOOLEAN DEFAULT FALSE,
    water_other_details TEXT,
    water_details TEXT,
    water_first_noticed DATE,
    water_reported_date DATE,

    -- Security Issues
    has_security_issues BOOLEAN DEFAULT FALSE,
    security_broken_locks BOOLEAN DEFAULT FALSE,
    security_broken_windows BOOLEAN DEFAULT FALSE,
    security_broken_doors BOOLEAN DEFAULT FALSE,
    security_inadequate_lighting BOOLEAN DEFAULT FALSE,
    security_no_cameras BOOLEAN DEFAULT FALSE,
    security_other BOOLEAN DEFAULT FALSE,
    security_other_details TEXT,
    security_details TEXT,
    security_first_noticed DATE,
    security_reported_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One issue record per intake
    CONSTRAINT unique_intake_issues UNIQUE(intake_id)
);

CREATE INDEX idx_building_issues_intake ON intake_building_issues(intake_id);

-- ============================================================================
-- TABLE 5: intake_utilities_issues
-- Utilities and heating/cooling problems
-- ============================================================================
CREATE TABLE intake_utilities_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Heating Issues
    has_heating_issues BOOLEAN DEFAULT FALSE,
    heating_no_heat BOOLEAN DEFAULT FALSE,
    heating_insufficient BOOLEAN DEFAULT FALSE,
    heating_broken_heater BOOLEAN DEFAULT FALSE,
    heating_details TEXT,
    heating_first_noticed DATE,
    heating_reported_date DATE,

    -- Cooling Issues
    has_cooling_issues BOOLEAN DEFAULT FALSE,
    cooling_no_ac BOOLEAN DEFAULT FALSE,
    cooling_insufficient BOOLEAN DEFAULT FALSE,
    cooling_broken_ac BOOLEAN DEFAULT FALSE,
    cooling_details TEXT,
    cooling_first_noticed DATE,
    cooling_reported_date DATE,

    -- Hot Water Issues
    has_hot_water_issues BOOLEAN DEFAULT FALSE,
    hot_water_none BOOLEAN DEFAULT FALSE,
    hot_water_insufficient BOOLEAN DEFAULT FALSE,
    hot_water_inconsistent BOOLEAN DEFAULT FALSE,
    hot_water_details TEXT,
    hot_water_first_noticed DATE,
    hot_water_reported_date DATE,

    -- Electricity Issues
    has_electricity_issues BOOLEAN DEFAULT FALSE,
    electricity_outages BOOLEAN DEFAULT FALSE,
    electricity_flickering BOOLEAN DEFAULT FALSE,
    electricity_insufficient_outlets BOOLEAN DEFAULT FALSE,
    electricity_dangerous_wiring BOOLEAN DEFAULT FALSE,
    electricity_details TEXT,
    electricity_first_noticed DATE,
    electricity_reported_date DATE,

    -- Gas Issues
    has_gas_issues BOOLEAN DEFAULT FALSE,
    gas_leaks BOOLEAN DEFAULT FALSE,
    gas_no_service BOOLEAN DEFAULT FALSE,
    gas_smell BOOLEAN DEFAULT FALSE,
    gas_details TEXT,
    gas_first_noticed DATE,
    gas_reported_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One utilities record per intake
    CONSTRAINT unique_intake_utilities UNIQUE(intake_id)
);

CREATE INDEX idx_utilities_issues_intake ON intake_utilities_issues(intake_id);

-- ============================================================================
-- TABLE 6: intake_health_impacts
-- Health effects on residents
-- ============================================================================
CREATE TABLE intake_health_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,
    household_member_id UUID REFERENCES intake_household_members(id) ON DELETE SET NULL,

    -- If null, applies to primary client
    affected_person_name VARCHAR(255),

    -- Health Impact Types
    has_respiratory_issues BOOLEAN DEFAULT FALSE,
    has_allergies BOOLEAN DEFAULT FALSE,
    has_asthma BOOLEAN DEFAULT FALSE,
    has_skin_conditions BOOLEAN DEFAULT FALSE,
    has_mental_health_impacts BOOLEAN DEFAULT FALSE,
    has_sleep_disturbance BOOLEAN DEFAULT FALSE,
    has_stress_anxiety BOOLEAN DEFAULT FALSE,
    has_other_impacts BOOLEAN DEFAULT FALSE,

    -- Details
    impact_description TEXT,
    symptoms TEXT,
    medical_treatment_received BOOLEAN DEFAULT FALSE,
    medical_treatment_details TEXT,

    -- Medical Documentation
    has_doctor_note BOOLEAN DEFAULT FALSE,
    doctor_name VARCHAR(255),
    doctor_phone VARCHAR(20),
    treatment_start_date DATE,

    -- Severity
    severity_level VARCHAR(20), -- mild, moderate, severe
    impact_on_daily_life TEXT,

    -- Costs
    medical_expenses DECIMAL(10,2),
    lost_work_days INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_severity CHECK (severity_level IS NULL OR severity_level IN ('mild', 'moderate', 'severe'))
);

CREATE INDEX idx_health_impacts_intake ON intake_health_impacts(intake_id);
CREATE INDEX idx_health_impacts_member ON intake_health_impacts(household_member_id);

-- ============================================================================
-- TABLE 7: intake_maintenance_requests
-- History of maintenance requests and responses
-- ============================================================================
CREATE TABLE intake_maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Request Details
    request_date DATE NOT NULL,
    request_method VARCHAR(50), -- phone, email, written, in_person, online_portal
    issue_category VARCHAR(100), -- repair, pest_control, utilities, security, etc.
    issue_description TEXT NOT NULL,
    urgency VARCHAR(20), -- routine, urgent, emergency

    -- Response Details
    landlord_responded BOOLEAN DEFAULT FALSE,
    response_date DATE,
    response_method VARCHAR(50),
    response_description TEXT,

    -- Resolution
    issue_resolved BOOLEAN DEFAULT FALSE,
    resolution_date DATE,
    resolution_description TEXT,
    resolution_satisfactory BOOLEAN,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_count INTEGER DEFAULT 0,

    -- Documentation
    has_documentation BOOLEAN DEFAULT FALSE,
    documentation_type VARCHAR(100), -- email, letter, photo, receipt

    -- Ordering
    display_order INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_intake ON intake_maintenance_requests(intake_id);
CREATE INDEX idx_maintenance_request_date ON intake_maintenance_requests(request_date DESC);

-- ============================================================================
-- TABLE 8: intake_financial_details
-- Financial information - income, expenses, damages
-- ============================================================================
CREATE TABLE intake_financial_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Income Information
    employment_status VARCHAR(50), -- employed, unemployed, self_employed, retired, disabled
    employer_name VARCHAR(255),
    monthly_income DECIMAL(10,2),
    other_income_sources TEXT,
    total_monthly_income DECIMAL(10,2),

    -- Government Assistance
    receives_assistance BOOLEAN DEFAULT FALSE,
    assistance_type VARCHAR(100), -- section_8, snap, ssi, ssdi, tanf
    monthly_assistance_amount DECIMAL(10,2),

    -- Expenses
    monthly_rent_amount DECIMAL(10,2),
    monthly_utilities DECIMAL(10,2),
    monthly_other_expenses DECIMAL(10,2),

    -- Financial Hardship
    financial_hardship BOOLEAN DEFAULT FALSE,
    hardship_description TEXT,

    -- Damages & Losses
    property_damage_estimate DECIMAL(12,2),
    personal_property_loss DECIMAL(12,2),
    relocation_costs DECIMAL(12,2),
    medical_costs DECIMAL(12,2),
    other_damages DECIMAL(12,2),
    total_damages DECIMAL(12,2),

    -- Damages Details
    damages_description TEXT,
    has_receipts BOOLEAN DEFAULT FALSE,
    has_photos BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One financial record per intake
    CONSTRAINT unique_intake_financial UNIQUE(intake_id)
);

CREATE INDEX idx_financial_intake ON intake_financial_details(intake_id);

-- ============================================================================
-- TABLE 9: intake_legal_history
-- Prior legal actions, notices, violations
-- ============================================================================
CREATE TABLE intake_legal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Prior Cases
    has_prior_cases BOOLEAN DEFAULT FALSE,
    prior_case_description TEXT,
    prior_case_outcome VARCHAR(100),
    prior_case_date DATE,

    -- Eviction History
    has_eviction_history BOOLEAN DEFAULT FALSE,
    eviction_notice_date DATE,
    eviction_court_case BOOLEAN DEFAULT FALSE,
    eviction_case_number VARCHAR(100),
    eviction_outcome VARCHAR(100),

    -- Notices Received
    received_3_day_notice BOOLEAN DEFAULT FALSE,
    notice_3_day_date DATE,
    received_30_day_notice BOOLEAN DEFAULT FALSE,
    notice_30_day_date DATE,
    received_60_day_notice BOOLEAN DEFAULT FALSE,
    notice_60_day_date DATE,
    received_other_notice BOOLEAN DEFAULT FALSE,
    notice_other_type VARCHAR(255),
    notice_other_date DATE,

    -- Code Violations
    property_has_violations BOOLEAN DEFAULT FALSE,
    violations_description TEXT,
    violations_date DATE,
    violations_resolved BOOLEAN DEFAULT FALSE,

    -- Current Legal Proceedings
    in_active_litigation BOOLEAN DEFAULT FALSE,
    litigation_description TEXT,
    litigation_court VARCHAR(255),
    litigation_case_number VARCHAR(100),
    litigation_next_hearing_date DATE,

    -- Attorney Representation
    has_attorney BOOLEAN DEFAULT FALSE,
    attorney_name VARCHAR(255),
    attorney_firm VARCHAR(255),
    attorney_phone VARCHAR(20),
    attorney_email VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- One legal history per intake
    CONSTRAINT unique_intake_legal UNIQUE(intake_id)
);

CREATE INDEX idx_legal_history_intake ON intake_legal_history(intake_id);

-- ============================================================================
-- TABLE 10: intake_documentation
-- File uploads - photos, documents, receipts
-- ============================================================================
CREATE TABLE intake_documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- File Information
    file_type VARCHAR(50) NOT NULL, -- photo, document, receipt, medical_record, correspondence, other
    file_category VARCHAR(100), -- damage_photo, mold_photo, repair_receipt, medical_bill, etc.
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),

    -- Storage
    storage_path VARCHAR(500), -- GCS path or local path
    storage_url VARCHAR(1000), -- Public or signed URL

    -- Description
    description TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    uploaded_by VARCHAR(100), -- client, attorney, staff
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_date TIMESTAMP WITH TIME ZONE,

    -- Ordering and Display
    display_order INTEGER,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary photo for gallery

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documentation_intake ON intake_documentation(intake_id);
CREATE INDEX idx_documentation_type ON intake_documentation(file_type);
CREATE INDEX idx_documentation_category ON intake_documentation(file_category);

-- ============================================================================
-- TABLE 11: intake_witnesses
-- Potential witnesses to conditions or events
-- ============================================================================
CREATE TABLE intake_witnesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Witness Information
    witness_type VARCHAR(50), -- neighbor, friend, family, inspector, contractor, other
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    relationship VARCHAR(255), -- neighbor in unit 3B, friend who visited, etc.

    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    address VARCHAR(255),

    -- What they witnessed
    what_witnessed TEXT NOT NULL,
    when_witnessed DATE,
    witness_willing_to_testify BOOLEAN DEFAULT FALSE,
    witness_has_photos BOOLEAN DEFAULT FALSE,
    witness_has_documentation BOOLEAN DEFAULT FALSE,

    -- Additional Details
    notes TEXT,

    -- Ordering
    display_order INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_witnesses_intake ON intake_witnesses(intake_id);

-- ============================================================================
-- TABLE 12: intake_timeline
-- Chronological timeline of key events
-- ============================================================================
CREATE TABLE intake_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Event Details
    event_date DATE NOT NULL,
    event_type VARCHAR(100), -- issue_discovered, repair_requested, notice_received, inspection, other
    event_description TEXT NOT NULL,

    -- Event Impact
    severity VARCHAR(20), -- minor, moderate, major, critical
    impacted_parties TEXT, -- who was affected

    -- Related Documentation
    has_documentation BOOLEAN DEFAULT FALSE,
    documentation_ids TEXT, -- JSON array of related document IDs

    -- Ordering
    display_order INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_timeline_severity CHECK (severity IS NULL OR severity IN ('minor', 'moderate', 'major', 'critical'))
);

CREATE INDEX idx_timeline_intake ON intake_timeline(intake_id);
CREATE INDEX idx_timeline_event_date ON intake_timeline(event_date DESC);

-- ============================================================================
-- TABLE 13: intake_attorney_notes
-- Attorney review notes and case assessment
-- ============================================================================
CREATE TABLE intake_attorney_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Attorney Information
    attorney_name VARCHAR(255) NOT NULL,
    attorney_id UUID, -- If integrated with user management system

    -- Review Details
    review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    review_type VARCHAR(50), -- initial_review, follow_up, case_assessment, final_decision

    -- Assessment
    case_merit_rating INTEGER, -- 1-10 scale
    estimated_case_value DECIMAL(12,2),
    recommended_action VARCHAR(100), -- accept, reject, request_more_info, refer_out
    action_reason TEXT,

    -- Case Strategy Notes
    strengths TEXT,
    weaknesses TEXT,
    key_issues TEXT,
    suggested_next_steps TEXT,

    -- Client Communication
    client_contacted BOOLEAN DEFAULT FALSE,
    contact_date TIMESTAMP WITH TIME ZONE,
    contact_method VARCHAR(50),
    contact_notes TEXT,

    -- Decision
    final_decision VARCHAR(50), -- accepted, rejected, pending
    decision_date TIMESTAMP WITH TIME ZONE,
    decision_notes TEXT,

    -- Notes
    internal_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_merit_rating CHECK (case_merit_rating IS NULL OR (case_merit_rating >= 1 AND case_merit_rating <= 10))
);

CREATE INDEX idx_attorney_notes_intake ON intake_attorney_notes(intake_id);
CREATE INDEX idx_attorney_notes_attorney ON intake_attorney_notes(attorney_id);
CREATE INDEX idx_attorney_notes_review_date ON intake_attorney_notes(review_date DESC);

-- ============================================================================
-- SEQUENCE FOR INTAKE NUMBERS
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS intake_number_seq START 1;

-- Function to generate intake number
CREATE OR REPLACE FUNCTION generate_intake_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR(4);
BEGIN
    next_num := nextval('intake_number_seq');
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR(4);
    RETURN 'INT-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp on client_intakes
CREATE OR REPLACE FUNCTION update_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intake_timestamp
    BEFORE UPDATE ON client_intakes
    FOR EACH ROW
    EXECUTE FUNCTION update_intake_updated_at();

-- Auto-generate intake number if not provided
CREATE OR REPLACE FUNCTION set_intake_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.intake_number IS NULL OR NEW.intake_number = '' THEN
        NEW.intake_number := generate_intake_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_intake_number
    BEFORE INSERT ON client_intakes
    FOR EACH ROW
    EXECUTE FUNCTION set_intake_number();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Intake summary view (frequently used data)
CREATE OR REPLACE VIEW v_intake_summary AS
SELECT
    i.id,
    i.intake_number,
    i.intake_date,
    i.intake_status,
    i.first_name,
    i.last_name,
    i.email_address,
    i.primary_phone,
    i.property_street_address,
    i.property_city,
    i.property_state,
    i.property_zip_code,
    i.monthly_rent,
    i.urgency_level,
    i.assigned_attorney_name,
    i.assigned_date,
    -- Count related records
    (SELECT COUNT(*) FROM intake_household_members WHERE intake_id = i.id) as household_count,
    (SELECT COUNT(*) FROM intake_documentation WHERE intake_id = i.id) as document_count,
    (SELECT COUNT(*) FROM intake_attorney_notes WHERE intake_id = i.id) as note_count
FROM client_intakes i
ORDER BY i.intake_date DESC;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE client_intakes IS 'Main client intake records containing all primary intake form data';
COMMENT ON TABLE intake_household_members IS 'Household members living at the property with the client';
COMMENT ON TABLE intake_landlord_info IS 'Landlord and property manager contact information';
COMMENT ON TABLE intake_building_issues IS 'Structural and building-related issues reported by client';
COMMENT ON TABLE intake_utilities_issues IS 'Utilities problems (heating, cooling, water, electricity, gas)';
COMMENT ON TABLE intake_health_impacts IS 'Health impacts on client and household members';
COMMENT ON TABLE intake_maintenance_requests IS 'History of maintenance requests and landlord responses';
COMMENT ON TABLE intake_financial_details IS 'Client financial information and estimated damages';
COMMENT ON TABLE intake_legal_history IS 'Prior legal actions, notices, and current proceedings';
COMMENT ON TABLE intake_documentation IS 'Uploaded files - photos, documents, receipts';
COMMENT ON TABLE intake_witnesses IS 'Potential witnesses who observed conditions or events';
COMMENT ON TABLE intake_timeline IS 'Chronological timeline of key events in the case';
COMMENT ON TABLE intake_attorney_notes IS 'Attorney review notes and case assessment';

-- ============================================================================
-- GRANT PERMISSIONS (adjust based on your user setup)
-- ============================================================================
-- Example: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
-- Example: GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
