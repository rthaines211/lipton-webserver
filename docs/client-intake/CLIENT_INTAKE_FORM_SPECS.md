# Client Intake Form Specifications & Database Schema

## PART 1: DOCUMENT GENERATION FORM HTML STRUCTURE

The current document generation form has the following structure and fields:

### Form Sections & Fields

```html
<!-- SECTION 1: Property Details -->
<div class="section" id="section-property">
    <input type="text" id="property-address" name="property-address" required>
    <input type="text" id="apartment-unit" name="apartment-unit">
    <input type="text" id="city" name="city" required>
    <select id="state" name="state" required> <!-- All 50 US states -->
    <input type="text" id="zip-code" name="zip-code" pattern="[0-9]{5}(-[0-9]{4})?">
    <input type="text" id="filing-city" name="filing-city" required>
    <input type="text" id="filing-county" name="filing-county" required>
</div>

<!-- SECTION 2: Plaintiff Details (Dynamic/Repeatable) -->
<div class="section" id="section-plaintiff">
    <!-- For each plaintiff (dynamically added): -->
    <input type="text" id="plaintiff-${index}-firstname" placeholder="First Name" required>
    <input type="text" id="plaintiff-${index}-lastname" placeholder="Last Name" required>
    <select id="plaintiff-${index}-type">
        <option value="Individual">Individual</option>
        <option value="Organization">Organization</option>
    </select>
    <input type="text" id="plaintiff-${index}-organization-name"> <!-- If Organization -->
    <select id="plaintiff-${index}-age-category">
        <option value="Adult">Adult</option>
        <option value="Minor">Minor</option>
    </select>
    <input type="text" id="plaintiff-${index}-unit-number">
    <input type="checkbox" id="plaintiff-${index}-head-of-household">

    <!-- If Head of Household is checked, additional issue fields appear: -->
    <!-- Multiple checkbox categories for issues (see below) -->
</div>

<!-- SECTION 3: Defendant Details (Dynamic/Repeatable) -->
<div class="section" id="section-defendant">
    <!-- For each defendant: -->
    <input type="text" id="defendant-${index}-name" placeholder="Defendant Name" required>
    <select id="defendant-${index}-entity-type">
        <option value="Individual">Individual</option>
        <option value="Corporation">Corporation</option>
        <option value="LLC">LLC</option>
        <option value="Partnership">Partnership</option>
        <option value="Other">Other</option>
    </select>
    <select id="defendant-${index}-role">
        <option value="Owner">Owner</option>
        <option value="Manager">Property Manager</option>
        <option value="Both">Owner & Manager</option>
        <option value="Other">Other</option>
    </select>
</div>

<!-- SECTION 4: Document Selection -->
<div class="document-selection-section">
    <!-- Checkboxes for document types to generate: -->
    <input type="checkbox" id="doc-srog" value="SROG"> Special Interrogatories
    <input type="checkbox" id="doc-pod" value="POD"> Request for Production
    <input type="checkbox" id="doc-admissions" value="Admissions"> Request for Admissions
    <input type="checkbox" id="doc-cm110" value="CM110"> CM-110 Court Form
</div>

<!-- SECTION 5: Issue Categories (Appears for Head of Household) -->
<div class="issue-categories">
    <!-- Each category has multiple checkbox options -->

    <!-- Vermin Category -->
    <div class="issue-category" data-category="vermin">
        <input type="checkbox" value="RatsMice"> Rats/Mice
        <input type="checkbox" value="Cockroaches"> Cockroaches
        <input type="checkbox" value="OtherVermin"> Other Vermin
    </div>

    <!-- Insects Category -->
    <div class="issue-category" data-category="insects">
        <input type="checkbox" value="Bedbugs"> Bedbugs
        <input type="checkbox" value="Termites"> Termites
        <input type="checkbox" value="Ants"> Ants
        <input type="checkbox" value="OtherInsects"> Other Insects
    </div>

    <!-- Environmental Category -->
    <div class="issue-category" data-category="environmental">
        <input type="checkbox" value="Mold"> Mold
        <input type="checkbox" value="LeadPaint"> Lead Paint
        <input type="checkbox" value="Asbestos"> Asbestos
        <input type="checkbox" value="ToxicChemicals"> Toxic Chemicals
    </div>

    <!-- Water Damage Category -->
    <div class="issue-category" data-category="water">
        <input type="checkbox" value="Leaks"> Leaks
        <input type="checkbox" value="Flooding"> Flooding
        <input type="checkbox" value="SewerBackup"> Sewer Backup
        <input type="checkbox" value="WaterDamage"> Water Damage
    </div>

    <!-- Utilities Category -->
    <div class="issue-category" data-category="utilities">
        <input type="checkbox" value="NoHeat"> No Heat
        <input type="checkbox" value="NoHotWater"> No Hot Water
        <input type="checkbox" value="NoElectricity"> No Electricity
        <input type="checkbox" value="NoGas"> No Gas
    </div>

    <!-- Security Category -->
    <div class="issue-category" data-category="security">
        <input type="checkbox" value="BrokenLocks"> Broken Locks
        <input type="checkbox" value="BrokenWindows"> Broken Windows
        <input type="checkbox" value="BrokenDoors"> Broken Doors
        <input type="checkbox" value="InadequateSecurity"> Inadequate Security
    </div>

    <!-- Safety Category -->
    <div class="issue-category" data-category="safety">
        <input type="checkbox" value="FireHazards"> Fire Hazards
        <input type="checkbox" value="StructuralIssues"> Structural Issues
        <input type="checkbox" value="ElectricalHazards"> Electrical Hazards
        <input type="checkbox" value="TripHazards"> Trip Hazards
    </div>

    <!-- Common Area Category -->
    <div class="issue-category" data-category="common-areas">
        <input type="checkbox" value="StairwayIssues"> Stairway Issues
        <input type="checkbox" value="ElevatorIssues"> Elevator Issues
        <input type="checkbox" value="HallwayIssues"> Hallway Issues
        <input type="checkbox" value="ParkingIssues"> Parking Issues
    </div>
</div>
```

### Key Features of Current Form:
1. **Dynamic party management** - Add/remove plaintiffs and defendants
2. **Conditional fields** - Head of household triggers issue selection
3. **Multi-section stepper** - Visual progress indicator
4. **Validation** - Required field checking, pattern validation
5. **Document type selection** - Choose which documents to generate
6. **Issue categorization** - 8 categories with multiple checkbox options each

---

## PART 2: CLIENT INTAKE DATABASE SCHEMA (25 SECTIONS, 200+ FIELDS)

Based on your requirement for "25 sections, 200+ fields with hybrid checkbox format" and "10 tables for storing intake data", here's the comprehensive database schema:

### TABLE 1: client_intakes (Main intake record)
```sql
CREATE TABLE client_intakes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tracking Fields
    intake_number VARCHAR(20) UNIQUE NOT NULL, -- Format: INT-2024-00001
    intake_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    intake_status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, rejected, assigned
    intake_source VARCHAR(100), -- website, referral, phone, walk-in
    referral_details TEXT,

    -- Section 1: Personal Information (10 fields)
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    ssn_last_four VARCHAR(4), -- Encrypted
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_by_ip VARCHAR(45),
    submission_user_agent TEXT,
    form_completion_time_seconds INTEGER,

    -- Assignment & Review
    assigned_attorney_id UUID,
    assigned_attorney_name VARCHAR(255),
    assigned_date TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_date TIMESTAMP,
    review_notes TEXT,

    -- Urgency & Priority
    urgency_level VARCHAR(20), -- low, medium, high, critical
    priority_score INTEGER, -- 1-100 calculated score
    estimated_case_value DECIMAL(12,2),
    statute_of_limitations_date DATE,

    -- Raw Data Storage
    raw_form_data JSONB, -- Complete original submission
    processed_data JSONB, -- Normalized/cleaned data
    validation_errors JSONB,

    CONSTRAINT chk_intake_status CHECK (intake_status IN ('pending', 'under_review', 'approved', 'rejected', 'assigned')),
    CONSTRAINT chk_urgency CHECK (urgency_level IN ('low', 'medium', 'high', 'critical'))
);
```

### TABLE 2: intake_household_members (Section 6: Household Composition)
```sql
CREATE TABLE intake_household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Member Information (8 fields per member)
    member_type VARCHAR(50), -- spouse, child, parent, sibling, other
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    relationship_to_client VARCHAR(100),
    age INTEGER,
    date_of_birth DATE,
    has_disability BOOLEAN DEFAULT FALSE,
    disability_description TEXT,
    is_minor BOOLEAN GENERATED ALWAYS AS (age < 18) STORED,

    -- Additional Details
    in_unit_full_time BOOLEAN DEFAULT TRUE,
    affected_by_issues BOOLEAN DEFAULT TRUE,
    specific_health_impacts TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER,

    UNIQUE(intake_id, display_order)
);
```

### TABLE 3: intake_landlord_info (Section 7 & 8: Landlord/Property Manager)
```sql
CREATE TABLE intake_landlord_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 7: Landlord Information (10 fields)
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

    -- Section 8: Property Management (8 fields)
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
    contact_log TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 4: intake_building_issues (Sections 9-14: All Building Issues)
```sql
CREATE TABLE intake_building_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 9: Structural Issues (12 checkboxes + details)
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

    -- Section 10: Plumbing Issues (15 checkboxes + details)
    has_plumbing_issues BOOLEAN DEFAULT FALSE,
    plumbing_no_hot_water BOOLEAN DEFAULT FALSE,
    plumbing_no_water BOOLEAN DEFAULT FALSE,
    plumbing_low_pressure BOOLEAN DEFAULT FALSE,
    plumbing_leaky_pipes BOOLEAN DEFAULT FALSE,
    plumbing_burst_pipes BOOLEAN DEFAULT FALSE,
    plumbing_clogged_drains BOOLEAN DEFAULT FALSE,
    plumbing_toilet_not_working BOOLEAN DEFAULT FALSE,
    plumbing_shower_not_working BOOLEAN DEFAULT FALSE,
    plumbing_sink_not_working BOOLEAN DEFAULT FALSE,
    plumbing_sewage_backup BOOLEAN DEFAULT FALSE,
    plumbing_water_damage BOOLEAN DEFAULT FALSE,
    plumbing_flooding BOOLEAN DEFAULT FALSE,
    plumbing_water_discoloration BOOLEAN DEFAULT FALSE,
    plumbing_other BOOLEAN DEFAULT FALSE,
    plumbing_other_details TEXT,
    plumbing_details TEXT,
    plumbing_first_noticed DATE,
    plumbing_reported_date DATE,

    -- Section 11: Electrical Issues (12 checkboxes + details)
    has_electrical_issues BOOLEAN DEFAULT FALSE,
    electrical_no_power BOOLEAN DEFAULT FALSE,
    electrical_partial_outages BOOLEAN DEFAULT FALSE,
    electrical_exposed_wiring BOOLEAN DEFAULT FALSE,
    electrical_sparking_outlets BOOLEAN DEFAULT FALSE,
    electrical_broken_outlets BOOLEAN DEFAULT FALSE,
    electrical_broken_switches BOOLEAN DEFAULT FALSE,
    electrical_flickering_lights BOOLEAN DEFAULT FALSE,
    electrical_circuit_breaker_issues BOOLEAN DEFAULT FALSE,
    electrical_insufficient_outlets BOOLEAN DEFAULT FALSE,
    electrical_burning_smell BOOLEAN DEFAULT FALSE,
    electrical_other BOOLEAN DEFAULT FALSE,
    electrical_other_details TEXT,
    electrical_details TEXT,
    electrical_first_noticed DATE,
    electrical_reported_date DATE,

    -- Section 12: HVAC Issues (10 checkboxes + details)
    has_hvac_issues BOOLEAN DEFAULT FALSE,
    hvac_no_heat BOOLEAN DEFAULT FALSE,
    hvac_inadequate_heat BOOLEAN DEFAULT FALSE,
    hvac_no_air_conditioning BOOLEAN DEFAULT FALSE,
    hvac_inadequate_cooling BOOLEAN DEFAULT FALSE,
    hvac_broken_thermostat BOOLEAN DEFAULT FALSE,
    hvac_gas_smell BOOLEAN DEFAULT FALSE,
    hvac_carbon_monoxide_detector_missing BOOLEAN DEFAULT FALSE,
    hvac_ventilation_poor BOOLEAN DEFAULT FALSE,
    hvac_other BOOLEAN DEFAULT FALSE,
    hvac_other_details TEXT,
    hvac_details TEXT,
    hvac_first_noticed DATE,
    hvac_reported_date DATE,

    -- Section 13: Appliance Issues (8 checkboxes + details)
    has_appliance_issues BOOLEAN DEFAULT FALSE,
    appliance_refrigerator_broken BOOLEAN DEFAULT FALSE,
    appliance_stove_broken BOOLEAN DEFAULT FALSE,
    appliance_oven_broken BOOLEAN DEFAULT FALSE,
    appliance_dishwasher_broken BOOLEAN DEFAULT FALSE,
    appliance_garbage_disposal_broken BOOLEAN DEFAULT FALSE,
    appliance_washer_broken BOOLEAN DEFAULT FALSE,
    appliance_dryer_broken BOOLEAN DEFAULT FALSE,
    appliance_other BOOLEAN DEFAULT FALSE,
    appliance_other_details TEXT,
    appliance_details TEXT,

    -- Section 14: Security Issues (10 checkboxes + details)
    has_security_issues BOOLEAN DEFAULT FALSE,
    security_broken_locks BOOLEAN DEFAULT FALSE,
    security_broken_windows BOOLEAN DEFAULT FALSE,
    security_broken_doors BOOLEAN DEFAULT FALSE,
    security_no_deadbolt BOOLEAN DEFAULT FALSE,
    security_broken_gate BOOLEAN DEFAULT FALSE,
    security_broken_intercom BOOLEAN DEFAULT FALSE,
    security_inadequate_lighting BOOLEAN DEFAULT FALSE,
    security_no_smoke_detector BOOLEAN DEFAULT FALSE,
    security_break_ins BOOLEAN DEFAULT FALSE,
    security_other BOOLEAN DEFAULT FALSE,
    security_other_details TEXT,
    security_details TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 5: intake_pest_issues (Section 15: Pest/Vermin Issues)
```sql
CREATE TABLE intake_pest_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Pest Types (15 checkboxes)
    has_pest_issues BOOLEAN DEFAULT FALSE,
    pest_rats BOOLEAN DEFAULT FALSE,
    pest_mice BOOLEAN DEFAULT FALSE,
    pest_cockroaches BOOLEAN DEFAULT FALSE,
    pest_bedbugs BOOLEAN DEFAULT FALSE,
    pest_fleas BOOLEAN DEFAULT FALSE,
    pest_ants BOOLEAN DEFAULT FALSE,
    pest_termites BOOLEAN DEFAULT FALSE,
    pest_spiders BOOLEAN DEFAULT FALSE,
    pest_flies BOOLEAN DEFAULT FALSE,
    pest_mosquitoes BOOLEAN DEFAULT FALSE,
    pest_bees_wasps BOOLEAN DEFAULT FALSE,
    pest_birds BOOLEAN DEFAULT FALSE,
    pest_bats BOOLEAN DEFAULT FALSE,
    pest_other BOOLEAN DEFAULT FALSE,
    pest_other_specify TEXT,

    -- Severity & Impact
    pest_severity VARCHAR(20), -- minor, moderate, severe, extreme
    pest_frequency VARCHAR(50), -- daily, weekly, monthly, seasonal
    pest_location TEXT, -- kitchen, bathroom, bedroom, throughout
    pest_health_impacts TEXT,
    pest_property_damage TEXT,

    -- Treatment History
    pest_professional_treatment BOOLEAN DEFAULT FALSE,
    pest_treatment_date DATE,
    pest_treatment_effective BOOLEAN,
    pest_self_treatment_attempted BOOLEAN,

    -- Timeline
    pest_first_noticed DATE,
    pest_reported_to_landlord DATE,
    pest_landlord_response TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 6: intake_health_safety (Section 16 & 17: Environmental & Health Hazards)
```sql
CREATE TABLE intake_health_safety (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 16: Environmental Hazards (12 checkboxes)
    has_environmental_hazards BOOLEAN DEFAULT FALSE,
    hazard_mold BOOLEAN DEFAULT FALSE,
    hazard_mold_location TEXT,
    hazard_lead_paint BOOLEAN DEFAULT FALSE,
    hazard_lead_paint_peeling BOOLEAN DEFAULT FALSE,
    hazard_asbestos BOOLEAN DEFAULT FALSE,
    hazard_asbestos_location TEXT,
    hazard_chemical_odors BOOLEAN DEFAULT FALSE,
    hazard_gas_leak BOOLEAN DEFAULT FALSE,
    hazard_sewage BOOLEAN DEFAULT FALSE,
    hazard_contaminated_water BOOLEAN DEFAULT FALSE,
    hazard_toxic_materials BOOLEAN DEFAULT FALSE,
    hazard_other BOOLEAN DEFAULT FALSE,
    hazard_other_details TEXT,

    -- Section 17: Health Impacts (10 fields)
    health_impacts_reported BOOLEAN DEFAULT FALSE,
    health_respiratory_issues BOOLEAN DEFAULT FALSE,
    health_skin_conditions BOOLEAN DEFAULT FALSE,
    health_allergies_worsened BOOLEAN DEFAULT FALSE,
    health_headaches BOOLEAN DEFAULT FALSE,
    health_nausea BOOLEAN DEFAULT FALSE,
    health_sleep_disruption BOOLEAN DEFAULT FALSE,
    health_stress_anxiety BOOLEAN DEFAULT FALSE,
    health_injuries BOOLEAN DEFAULT FALSE,
    health_other BOOLEAN DEFAULT FALSE,
    health_other_specify TEXT,
    health_medical_documentation BOOLEAN DEFAULT FALSE,
    health_doctor_visits INTEGER,
    health_emergency_visits INTEGER,
    health_hospitalization BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 7: intake_common_areas (Section 18: Common Area Issues)
```sql
CREATE TABLE intake_common_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Common Area Issues (Grid: Location × Issue Type)
    -- Locations: lobby, hallways, stairways, elevator, laundry, parking, yard, pool
    -- Issues: lighting, cleanliness, damage, safety, access

    -- Lobby Issues
    lobby_poor_lighting BOOLEAN DEFAULT FALSE,
    lobby_not_clean BOOLEAN DEFAULT FALSE,
    lobby_damaged BOOLEAN DEFAULT FALSE,
    lobby_unsafe BOOLEAN DEFAULT FALSE,
    lobby_no_access BOOLEAN DEFAULT FALSE,

    -- Hallway Issues
    hallway_poor_lighting BOOLEAN DEFAULT FALSE,
    hallway_not_clean BOOLEAN DEFAULT FALSE,
    hallway_damaged BOOLEAN DEFAULT FALSE,
    hallway_unsafe BOOLEAN DEFAULT FALSE,
    hallway_blocked BOOLEAN DEFAULT FALSE,

    -- Stairway Issues
    stairway_poor_lighting BOOLEAN DEFAULT FALSE,
    stairway_not_clean BOOLEAN DEFAULT FALSE,
    stairway_damaged BOOLEAN DEFAULT FALSE,
    stairway_unsafe BOOLEAN DEFAULT FALSE,
    stairway_no_handrail BOOLEAN DEFAULT FALSE,

    -- Elevator Issues
    elevator_not_working BOOLEAN DEFAULT FALSE,
    elevator_intermittent BOOLEAN DEFAULT FALSE,
    elevator_unsafe BOOLEAN DEFAULT FALSE,
    elevator_no_inspection BOOLEAN DEFAULT FALSE,
    elevator_trapped_incident BOOLEAN DEFAULT FALSE,

    -- Laundry Room Issues
    laundry_machines_broken BOOLEAN DEFAULT FALSE,
    laundry_insufficient_machines BOOLEAN DEFAULT FALSE,
    laundry_not_clean BOOLEAN DEFAULT FALSE,
    laundry_unsafe BOOLEAN DEFAULT FALSE,
    laundry_expensive BOOLEAN DEFAULT FALSE,

    -- Parking Issues
    parking_insufficient BOOLEAN DEFAULT FALSE,
    parking_unsafe BOOLEAN DEFAULT FALSE,
    parking_poor_lighting BOOLEAN DEFAULT FALSE,
    parking_damaged BOOLEAN DEFAULT FALSE,
    parking_unauthorized_use BOOLEAN DEFAULT FALSE,

    -- Yard/Outdoor Issues
    yard_not_maintained BOOLEAN DEFAULT FALSE,
    yard_trash_accumulation BOOLEAN DEFAULT FALSE,
    yard_unsafe_conditions BOOLEAN DEFAULT FALSE,
    yard_no_access BOOLEAN DEFAULT FALSE,

    -- Pool/Amenity Issues
    pool_not_maintained BOOLEAN DEFAULT FALSE,
    pool_closed_improperly BOOLEAN DEFAULT FALSE,
    pool_unsafe BOOLEAN DEFAULT FALSE,
    gym_equipment_broken BOOLEAN DEFAULT FALSE,

    common_area_details TEXT,
    common_area_photos_available BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 8: intake_landlord_conduct (Section 19 & 20: Landlord Behavior)
```sql
CREATE TABLE intake_landlord_conduct (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 19: Harassment & Retaliation (12 checkboxes)
    harassment_verbal_abuse BOOLEAN DEFAULT FALSE,
    harassment_threats BOOLEAN DEFAULT FALSE,
    harassment_intimidation BOOLEAN DEFAULT FALSE,
    harassment_illegal_entry BOOLEAN DEFAULT FALSE,
    harassment_privacy_violation BOOLEAN DEFAULT FALSE,
    harassment_utility_shutoff BOOLEAN DEFAULT FALSE,
    harassment_lock_change BOOLEAN DEFAULT FALSE,
    harassment_property_removal BOOLEAN DEFAULT FALSE,
    harassment_false_accusations BOOLEAN DEFAULT FALSE,
    harassment_discrimination BOOLEAN DEFAULT FALSE,
    harassment_sexual BOOLEAN DEFAULT FALSE,
    harassment_retaliation BOOLEAN DEFAULT FALSE,
    harassment_details TEXT,
    harassment_dates TEXT,
    harassment_witnesses TEXT,
    harassment_police_reports BOOLEAN DEFAULT FALSE,
    harassment_restraining_order BOOLEAN DEFAULT FALSE,

    -- Section 20: Maintenance Response (8 fields)
    maintenance_requests_ignored BOOLEAN DEFAULT FALSE,
    maintenance_requests_count INTEGER,
    maintenance_written_requests BOOLEAN DEFAULT FALSE,
    maintenance_response_time VARCHAR(50), -- never, weeks, months
    maintenance_partial_repairs BOOLEAN DEFAULT FALSE,
    maintenance_improper_repairs BOOLEAN DEFAULT FALSE,
    maintenance_refused_repairs BOOLEAN DEFAULT FALSE,
    maintenance_demanded_payment BOOLEAN DEFAULT FALSE,
    maintenance_details TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 9: intake_documentation (Section 21 & 22: Documents & Evidence)
```sql
CREATE TABLE intake_documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 21: Available Documents (15 checkboxes)
    has_lease_agreement BOOLEAN DEFAULT FALSE,
    has_rent_receipts BOOLEAN DEFAULT FALSE,
    has_repair_requests BOOLEAN DEFAULT FALSE,
    has_correspondence BOOLEAN DEFAULT FALSE,
    has_photos BOOLEAN DEFAULT FALSE,
    has_videos BOOLEAN DEFAULT FALSE,
    has_inspection_reports BOOLEAN DEFAULT FALSE,
    has_medical_records BOOLEAN DEFAULT FALSE,
    has_police_reports BOOLEAN DEFAULT FALSE,
    has_witness_statements BOOLEAN DEFAULT FALSE,
    has_utility_bills BOOLEAN DEFAULT FALSE,
    has_moving_receipts BOOLEAN DEFAULT FALSE,
    has_hotel_receipts BOOLEAN DEFAULT FALSE,
    has_repair_receipts BOOLEAN DEFAULT FALSE,
    has_other_documents BOOLEAN DEFAULT FALSE,
    other_documents_description TEXT,

    -- Section 22: File Uploads
    upload_count INTEGER DEFAULT 0,
    total_file_size_mb DECIMAL(10,2),

    -- Evidence Quality
    photo_count INTEGER,
    video_count INTEGER,
    document_count INTEGER,
    evidence_organized BOOLEAN DEFAULT FALSE,
    evidence_dated BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TABLE 10: intake_case_details (Section 23, 24, 25: Legal & Case Info)
```sql
CREATE TABLE intake_case_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Section 23: Damages & Relief Sought (10 fields)
    damages_rent_reduction BOOLEAN DEFAULT FALSE,
    damages_rent_refund BOOLEAN DEFAULT FALSE,
    damages_relocation_costs BOOLEAN DEFAULT FALSE,
    damages_medical_expenses BOOLEAN DEFAULT FALSE,
    damages_property_damage BOOLEAN DEFAULT FALSE,
    damages_emotional_distress BOOLEAN DEFAULT FALSE,
    damages_punitive BOOLEAN DEFAULT FALSE,
    damages_injunctive_relief BOOLEAN DEFAULT FALSE,
    estimated_damages_amount DECIMAL(12,2),
    relief_description TEXT,

    -- Section 24: Previous Legal Action (8 fields)
    previous_legal_action BOOLEAN DEFAULT FALSE,
    previous_lawsuit_filed BOOLEAN DEFAULT FALSE,
    previous_lawsuit_date DATE,
    previous_lawsuit_outcome TEXT,
    previous_attorney_name VARCHAR(255),
    previous_complaints_filed BOOLEAN DEFAULT FALSE,
    previous_agency_complaints TEXT, -- health dept, building dept, etc
    other_tenants_complaining BOOLEAN DEFAULT FALSE,
    tenant_organization_involved BOOLEAN DEFAULT FALSE,

    -- Section 25: Additional Information (8 fields)
    how_heard_about_us VARCHAR(100),
    referral_source_name VARCHAR(255),
    preferred_outcome TEXT,
    willing_to_relocate BOOLEAN,
    available_for_court BOOLEAN DEFAULT TRUE,
    court_availability_restrictions TEXT,
    additional_comments TEXT,
    urgent_situation BOOLEAN DEFAULT FALSE,
    urgent_situation_details TEXT,

    -- Consent & Authorization
    consent_to_represent BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP,
    electronic_signature VARCHAR(255),
    ip_address_consent VARCHAR(45),

    -- Attorney Notes (Added during review)
    attorney_notes TEXT,
    case_strength VARCHAR(20), -- weak, moderate, strong, very_strong
    recommended_action TEXT,
    estimated_timeline VARCHAR(100),
    potential_challenges TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### SUPPORTING TABLES

### TABLE 11: intake_uploaded_files
```sql
CREATE TABLE intake_uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    file_category VARCHAR(50), -- photo, document, video, other
    document_type VARCHAR(100), -- lease, receipt, correspondence, medical, etc

    storage_path TEXT, -- Cloud storage path
    thumbnail_path TEXT, -- For images

    description TEXT,
    date_taken DATE,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processing_notes TEXT,

    is_primary BOOLEAN DEFAULT FALSE, -- Main evidence
    display_order INTEGER
);
```

### TABLE 12: intake_status_history
```sql
CREATE TABLE intake_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT,
    notes TEXT
);
```

### TABLE 13: intake_communications
```sql
CREATE TABLE intake_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    communication_type VARCHAR(50), -- email, phone, text, meeting
    direction VARCHAR(10), -- inbound, outbound
    subject VARCHAR(255),
    content TEXT,

    sender VARCHAR(255),
    recipient VARCHAR(255),

    sent_at TIMESTAMP,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## DATABASE INDEXES FOR PERFORMANCE

```sql
-- Intake search and filtering
CREATE INDEX idx_intake_status ON client_intakes(intake_status);
CREATE INDEX idx_intake_date ON client_intakes(intake_date);
CREATE INDEX idx_intake_urgency ON client_intakes(urgency_level);
CREATE INDEX idx_intake_attorney ON client_intakes(assigned_attorney_id);
CREATE INDEX idx_intake_email ON client_intakes(email_address);
CREATE INDEX idx_intake_phone ON client_intakes(primary_phone);
CREATE INDEX idx_intake_property ON client_intakes(property_street_address, property_city);

-- Full text search
CREATE INDEX idx_intake_search ON client_intakes USING gin(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(property_street_address, '') || ' ' ||
        coalesce(review_notes, '')
    )
);

-- Issue tracking
CREATE INDEX idx_building_structural ON intake_building_issues(intake_id) WHERE has_structural_issues = true;
CREATE INDEX idx_building_plumbing ON intake_building_issues(intake_id) WHERE has_plumbing_issues = true;
CREATE INDEX idx_pest_issues ON intake_pest_issues(intake_id) WHERE has_pest_issues = true;
CREATE INDEX idx_health_impacts ON intake_health_safety(intake_id) WHERE health_impacts_reported = true;

-- File management
CREATE INDEX idx_files_intake ON intake_uploaded_files(intake_id);
CREATE INDEX idx_files_category ON intake_uploaded_files(file_category);

-- Communication tracking
CREATE INDEX idx_comm_intake ON intake_communications(intake_id);
CREATE INDEX idx_comm_date ON intake_communications(sent_at);
```

## FIELD MAPPING: INTAKE → DOCUMENT GENERATION

```javascript
// Key field mappings from intake form to document generation form
const intakeToDocGenMapping = {
    // Property Information
    'current_street_address': 'property-address',
    'current_unit_number': 'apartment-unit',
    'current_city': 'city',
    'current_state': 'state',
    'current_zip_code': 'zip-code',
    'property_county': 'filing-county',

    // Client → Plaintiff
    'first_name': 'plaintiff-1-firstname',
    'last_name': 'plaintiff-1-lastname',
    'current_unit_number': 'plaintiff-1-unit-number',

    // Landlord → Defendant
    'landlord_name': 'defendant-1-name',
    'landlord_type': 'defendant-1-entity-type',

    // Issues Mapping (Complex - requires transformation)
    'pest_rats': 'issues.vermin.RatsMice',
    'pest_cockroaches': 'issues.vermin.Cockroaches',
    'pest_bedbugs': 'issues.insects.Bedbugs',
    'hazard_mold': 'issues.environmental.Mold',
    'hazard_lead_paint': 'issues.environmental.LeadPaint',
    'plumbing_no_hot_water': 'issues.utilities.NoHotWater',
    'hvac_no_heat': 'issues.utilities.NoHeat',
    'security_broken_locks': 'issues.security.BrokenLocks',
    // ... etc for all issue mappings
};
```

## SUMMARY STATISTICS

### Total Field Count by Section:
1. **Personal Information**: 10 fields
2. **Contact Information**: 12 fields
3. **Current Address**: 8 fields
4. **Property Information**: 12 fields
5. **Tenancy Details**: 10 fields
6. **Household Members**: 8 fields per member (dynamic)
7. **Landlord Information**: 10 fields
8. **Property Management**: 8 fields
9. **Structural Issues**: 16 fields
10. **Plumbing Issues**: 19 fields
11. **Electrical Issues**: 16 fields
12. **HVAC Issues**: 14 fields
13. **Appliance Issues**: 11 fields
14. **Security Issues**: 14 fields
15. **Pest/Vermin Issues**: 25 fields
16. **Environmental Hazards**: 14 fields
17. **Health Impacts**: 15 fields
18. **Common Area Issues**: 40 fields (grid)
19. **Harassment/Retaliation**: 17 fields
20. **Maintenance Response**: 9 fields
21. **Available Documents**: 16 fields
22. **File Uploads**: 5 fields
23. **Damages & Relief**: 10 fields
24. **Previous Legal Action**: 9 fields
25. **Additional Information**: 13 fields

**TOTAL BASE FIELDS: 235+ fields** (not counting dynamic household members)

### Database Statistics:
- **13 Total Tables** (10 main intake tables + 3 supporting tables)
- **235+ Total Fields** across all tables
- **120+ Checkbox Fields** (hybrid checkbox format)
- **15 Text/Detail Fields** for additional information
- **25 Date/Time Fields** for tracking timelines
- **Multiple JSONB Fields** for flexible data storage

This schema provides:
1. ✅ Complete intake data capture (25 sections, 200+ fields)
2. ✅ Hybrid checkbox format for issues (checkbox + details)
3. ✅ Full PostgreSQL compatibility with existing system
4. ✅ Normalized structure to prevent data duplication
5. ✅ JSONB fields for flexibility and future expansion
6. ✅ Complete audit trail and status tracking
7. ✅ Performance indexes for fast searching/filtering
8. ✅ Field mapping to existing document generation form
9. ✅ Support for file uploads and documentation
10. ✅ Attorney assignment and review workflow

The schema integrates seamlessly with your existing PostgreSQL database and can share the same connection pool and authentication system.