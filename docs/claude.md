# Claude Project Memory - Legal Form Application

## ⚠️ CRITICAL RULES FOR CLAUDE

### Context7 Usage Rule
**ALWAYS use Context7 MCP tools when working with:**
- Code generation for any library or framework
- Setup or configuration steps for any technology
- Library/API documentation lookups
- Implementation examples or best practices

**Process:**
1. First call `mcp__context7__resolve-library-id` with the library name
2. Then call `mcp__context7__get-library-docs` with the resolved library ID
3. Use the documentation to inform your implementation

**DO NOT:**
- Guess at API syntax or configuration
- Rely on general knowledge when up-to-date docs are available
- Skip Context7 lookups "to save time"

**Examples requiring Context7:**
- "How do I use React Query?" → Look up `/tanstack/query`
- "Set up Tailwind CSS" → Look up `/tailwindlabs/tailwindcss`
- "Use Vite proxy config" → Look up `/vitejs/vite`
- "Configure PostgreSQL with node-postgres" → Look up `/brianc/node-postgres`

## Project Overview
This is a comprehensive legal form application with two main systems:
1. **Document Generation Form** (legacy) - Original HTML-based form for plaintiff/defendant case intake
2. **Client Intake Form** (new) - Modern React-based multi-step wizard for comprehensive client information collection

The application serves a law firm's workflow for collecting client information, generating legal documents, and tracking housing/tenancy issues.

## Technical Stack
- **Frontend**:
  - Document Generation: HTML, CSS, JavaScript (vanilla)
  - Client Intake: React 18 + TypeScript, Vite, TailwindCSS
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with separate development and production databases
  - Development: `legal_forms_db_dev` (local port 5433)
  - Production: Google Cloud SQL
- **External Services**: Python FastAPI normalization pipeline (5-phase processing)
- **Testing**: Playwright for automated end-to-end testing
- **Data Storage**: Dual storage system - JSON files AND PostgreSQL database
- **Cloud Integration**:
  - ✅ Dropbox API for document storage
  - ✅ Google Cloud Run for production deployment
  - ✅ Google Cloud SQL for production database

## Key Files and Structure

### Client Intake Form (React Application)
- **[client-intake/](client-intake/)** - Modern React-based intake form application
  - **[src/App.tsx](client-intake/src/App.tsx)** - Root React component
  - **[src/components/IntakeFormExpanded.tsx](client-intake/src/components/IntakeFormExpanded.tsx)** - Main 9-step wizard form component
  - **[src/components/BuildingIssuesCompact.tsx](client-intake/src/components/BuildingIssuesCompact.tsx)** - Consolidated building issues UI with 7 categories in compact grid
  - **[vite.config.ts](client-intake/vite.config.ts)** - Vite configuration with proxy to backend API
  - **[package.json](client-intake/package.json)** - React app dependencies (React 18, TypeScript, TailwindCSS, Lucide icons)
  - **[tsconfig.json](client-intake/tsconfig.json)** - TypeScript configuration
  - **[tailwind.config.js](client-intake/tailwind.config.js)** - TailwindCSS configuration

### Document Generation Form (Legacy)
- **[index.html](index.html)** - Original document generation form interface (very large file ~180KB, ~45k tokens)
- **[script.js](script.js)** - Original form logic (currently unused)
- **[styles.css](styles.css)** - Legacy form styling
- **[review.html](review.html)** - Pre-submission review page
- **[success.html](success.html)** - Form submission success page

### Backend
- **[server.js](server.js)** - Express server handling API endpoints, data transformation, and pipeline integration
- **[routes/intakes-expanded.js](routes/intakes-expanded.js)** - API routes for client intake form (122-parameter INSERT for building issues)
- **[routes/intakes.js](routes/intakes.js)** - Legacy API routes for document generation form
- **[middleware/auth.js](middleware/auth.js)** - Authentication middleware

### Database
- **[migrations/](migrations/)** - Database migration files
  - **[add-building-issues-columns.sql](migrations/add-building-issues-columns.sql)** - Added 66 columns for plumbing, electrical, HVAC, appliance, security, pest issues
  - **[fix-plumbing-columns.sql](migrations/fix-plumbing-columns.sql)** - Added 4 missing plumbing columns
  - **[add-missing-pest-columns.sql](migrations/add-missing-pest-columns.sql)** - Added 4 pest columns (cockroaches, bedbugs, ants, termites)
  - **[remove-duplicate-pest-columns.sql](migrations/remove-duplicate-pest-columns.sql)** - Removed duplicate old-style `pests_*` columns
  - **[remove-legacy-issue-columns.sql](migrations/remove-legacy-issue-columns.sql)** - Removed legacy mold and water issue columns

### Documentation Files
- **[README.md](README.md)** - Comprehensive project documentation
- **[docs/claude.md](docs/claude.md)** - This file - Claude's knowledge base
- **[formdesign.md](formdesign.md)** - Form design specifications
- **[goalOutput.md](goalOutput.md)** - Target JSON output structure specification
- **[Transformationinstructions.md](Transformationinstructions.md)** - Data transformation guidelines
- **[styleguide.md](styleguide.md)** - UI/UX styling guidelines
- **[DROPBOX_SETUP.md](DROPBOX_SETUP.md)** - Dropbox integration setup guide
- **[WEEK_3_COMPLETION_SUMMARY.md](WEEK_3_COMPLETION_SUMMARY.md)** - Week 3 database schema completion
- **[WEEK_4_EXPANDED_FORM_COMPLETE.md](WEEK_4_EXPANDED_FORM_COMPLETE.md)** - Week 4 React form completion

### Configuration & Assets
- **[package.json](package.json)** - Backend Node.js dependencies and scripts
- **[playwright.config.js](playwright.config.js)** - Playwright test configuration
- **[logo.png](logo.png)** - Application logo
- **[start-dev.sh](start-dev.sh)** - Development environment startup script

### Directories
- **[data/](data/)** - Form submission storage (JSON files)
- **[tests/](tests/)** - Playwright test files
- **[node_modules/](node_modules/)** - Backend NPM dependencies
- **[playwright-report/](playwright-report/)** - Test execution reports
- **[test-results/](test-results/)** - Test artifacts

## Core Features

## Client Intake Form (React Multi-Step Wizard)
**Status**: ✅ Implemented (Week 4, 2025-11)
**Access**: http://localhost:3002 (development)

### Architecture
- **9-Step Wizard** (reduced from 15 steps by consolidating building issues)
- **Progress Bar** with step indicators
- **Real-time Validation** for required fields
- **Responsive Design** using TailwindCSS
- **Type-Safe** with TypeScript interfaces

### Form Steps
1. **Personal Information** - Name, phone, email, preferred contact method
2. **Contact Information** - Alternative contact details, emergency contacts
3. **Address Information** - Current address, unit number, move-in date
4. **Property & Tenancy Details** - Rent amount, lease type, housing type
5. **Household Composition** - Number of residents, minors, pets, disabilities
6. **Landlord & Property Management** - Landlord info, manager info, contact details
7. **Building & Housing Issues** ⭐ (Consolidated Screen)
   - Structural Issues (12 checkboxes)
   - Plumbing & Water Issues (14 checkboxes)
   - Electrical Issues (11 checkboxes)
   - HVAC Issues (9 checkboxes)
   - Appliance Issues (8 checkboxes)
   - Security Issues (10 checkboxes)
   - Pest Issues (14 checkboxes)
8. **Review & Additional Information** - Summary and additional notes
9. **Submit** - Final submission with confirmation

### Building Issues UI Design
**Implementation**: [BuildingIssuesCompact.tsx](client-intake/src/components/BuildingIssuesCompact.tsx)

**Layout**:
- 7 categories in collapsible sections
- Master checkbox per category (e.g., "Has Plumbing Issues")
- 3-column responsive grid for individual issues (collapses to 2-col/1-col on mobile)
- Text area for details per category
- Date fields for "First Noticed" and "Reported Date"

**Design Pattern**: Matches document selection UI from [index.html](index.html) - compact checkbox grid without emojis

### Data Collection Categories

#### Personal Information
- Full name, phone, email
- Preferred contact method (Phone, Email, Text)
- Alternative contact information

#### Address & Tenancy
- Street address, unit number, city, state, ZIP
- Move-in date, monthly rent, security deposit
- Lease type (Written, Oral, Month-to-Month, Section 8)
- Housing type (Apartment, House, Room, etc.)

#### Household Composition
- Number of adults and minors
- Anyone with disabilities
- Service animals or pets

#### Landlord Information
- Landlord name, phone, email, address
- Property manager name and contact info
- Manager responsiveness and response time

#### Building & Housing Issues (Comprehensive Tracking)
- **Structural**: Ceiling damage, wall cracks, floor damage, foundation issues, roof leaks, etc.
- **Plumbing**: No water, low pressure, leaks, burst pipes, clogged drains, sewer backup, etc.
- **Electrical**: No power, exposed wiring, sparking outlets, flickering lights, circuit breaker issues, etc.
- **HVAC**: No heat, inadequate heat, no A/C, broken thermostat, gas smell, poor ventilation, etc.
- **Appliance**: Broken refrigerator, stove, oven, dishwasher, washer, dryer, etc.
- **Security**: Broken locks, windows, doors, no deadbolt, inadequate lighting, no smoke detector, etc.
- **Pest**: Rats, mice, cockroaches, bedbugs, fleas, ants, termites, spiders, wasps, bees, etc.

## Document Generation Form (Legacy Features)

### 1. Dynamic Form Sections
- Add/remove multiple plaintiffs dynamically
- Add/remove multiple defendants dynamically
- Each plaintiff has comprehensive issue tracking

### 2. Legacy Data Collection

#### Property Information
- Address, city, state, ZIP code
- Filing location details

#### Plaintiff Information
- Name (first, last)
- Type (Individual, Organization, etc.)
- Age category
- Head of household status
- **Comprehensive Discovery/Issue Tracking**:
  - Vermin issues (Rats/Mice, Bedbugs, etc.)
  - Insect issues (Roaches, Ants, etc.)
  - Environmental hazards (Mold, Lead Paint, etc.)
  - Housing conditions (Heat/AC, Plumbing, etc.)
  - Safety issues (Locks, Smoke Detectors, etc.)
  - Legal issues (Retaliation, Discrimination, etc.)

#### Defendant Information
- Name (first, last)
- Entity type (Individual, LLC, Corporation, etc.)
- Role (Manager/Owner)

### 3. Data Transformation
The application performs two-stage transformation of form data:
- **Stage 1**: Raw HTML form → normalized structured format with PascalCase keys
- **Stage 2**: Normalized format → human-readable format (e.g., "FireHazard" → "Fire Hazard")
- Generates unique IDs for each party
- Creates nested objects for discovery information
- Structures full address details
- Formats names (First, Last, FirstAndLast)
- Converts boolean checkboxes to proper data types
- Arrays for multi-select fields (vermin, insects, etc.)
- Array deduplication to prevent duplicate values
- Removed Has_ prefix flags for cleaner output

### 3b. Python Normalization Pipeline Integration
The server integrates with an external Python FastAPI service for advanced document processing:
- **API URL**: Configurable via `PIPELINE_API_URL` (default: http://localhost:8000)
- **Execution**: Runs automatically on form submission (configurable via `EXECUTE_PIPELINE_ON_SUBMIT`)
- **Timeout**: 300 seconds (5 minutes) for complex processing
- **Failure Handling**: Continues on failure (configurable via `CONTINUE_ON_PIPELINE_FAILURE`)
- **Purpose**: 5-phase normalization pipeline for legal document generation

### REST API Endpoints

#### Client Intake Endpoints
- `POST /api/intakes` - Submit client intake form (inserts into `client_intakes`, `intake_landlord_info`, `intake_building_issues` tables)
- `GET /api/intakes` - List all client intake submissions
- `GET /api/intakes/:id` - Get specific intake submission
- `PUT /api/intakes/:id` - Update intake submission
- `DELETE /api/intakes/:id` - Delete intake submission

#### Document Generation (Legacy) Endpoints
- `GET /` - Serve document generation form page
- `GET /review.html` - Review page for submission preview
- `GET /success` - Success confirmation page
- `POST /api/form-entries` - Submit form data (triggers pipeline if enabled)
- `GET /api/form-entries` - List all submissions
- `GET /api/form-entries/:id` - Get specific entry
- `PUT /api/form-entries/:id` - Update form entry
- `DELETE /api/form-entries/:id` - Delete entry
- `DELETE /api/form-entries/clear-all` - Delete all entries (file system + database)

#### System Endpoints
- `GET /api/health` - Health check endpoint

### 5. Submitter Tracking & Notifications
- Optional email notification opt-in modal after form submission
- Captures submitter name and email for document processing notifications
- Skip option available (submits as 'Anonymous' with empty email)
- Stored in database `cases` table (`submitter_name`, `submitter_email` columns)

### 6. Testing Infrastructure
- Comprehensive Playwright test suite
- Tests cover form loading, submission, multi-party addition
- Validates output structure against goalOutput.md specification
- API endpoint testing

## Form Field Naming Conventions
- Property: `property-address`, `city`, `state`, `zip`, etc.
- Plaintiff: `plaintiff-{number}-{field}` (e.g., `plaintiff-1-first-name`)
- Defendant: `defendant-{number}-{field}` (e.g., `defendant-1-entity`)
- Issue checkboxes: `{category}-{item}-{plaintiff-number}` (e.g., `vermin-RatsMice-1`)

## NPM Scripts
- `npm start` - Start the Express server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run build` - Build optimized production files
- `npm run build:prod` - Production build with NODE_ENV=production
- `npm test` - Run Playwright tests
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Debug tests interactively
- `npm run test:report` - View test results report

## Data Storage Pattern

### Dual Storage System
The application uses both file-based and database storage:

#### 1. JSON File Storage (`data/` directory)
- Form submissions saved as JSON files in `data/` directory
- Filename format: `form-entry-{timestamp}-{random}.json`
- Each submission gets unique ID based on timestamp
- Contains complete form data in structured JSON format

#### 2. PostgreSQL Database

**Development Database**: `legal_forms_db_dev` (localhost:5433)
**Production Database**: Google Cloud SQL instance

### Client Intake Schema (New)

**Main Tables**:

- **`client_intakes`**: Core client information
  - Primary key: `id` (UUID)
  - Personal info: `first_name`, `last_name`, `phone`, `email`, `preferred_contact_method`
  - Contact info: `alt_phone`, `alt_email`, `emergency_contact_name`, `emergency_contact_phone`
  - Address: `street_address`, `unit_number`, `city`, `state`, `zip_code`
  - Tenancy: `move_in_date`, `monthly_rent`, `security_deposit`, `lease_type`, `housing_type`
  - Household: `num_adults`, `num_minors`, `has_disabilities`, `disability_details`, `has_service_animal`, `has_pets`, `pet_details`
  - Additional: `additional_notes`, `created_at`

- **`intake_landlord_info`**: Landlord and property manager information
  - Primary key: `id` (UUID)
  - Foreign key: `intake_id` → references `client_intakes(id)` CASCADE DELETE
  - Landlord: `landlord_name`, `landlord_phone`, `landlord_email`, `landlord_address`
  - Manager: `manager_name`, `manager_phone`, `manager_email`, `manager_address`
  - Responsiveness: `manager_response_time`, `manager_is_responsive`

- **`intake_building_issues`**: Comprehensive housing/building issue tracking (111 columns)
  - Primary key: `id` (UUID)
  - Foreign key: `intake_id` → references `client_intakes(id)` CASCADE DELETE
  - **Unique constraint**: `unique_intake_issues` on `intake_id` (one issues record per intake)

  **Issue Categories** (each with master checkbox + specific issues + details + dates):
  - **Structural** (16 fields): `has_structural_issues`, `structural_ceiling_damage`, `structural_wall_cracks`, `structural_floor_damage`, `structural_foundation_issues`, `structural_roof_leaks`, `structural_window_damage`, `structural_door_damage`, `structural_stairs_unsafe`, `structural_balcony_unsafe`, `structural_railing_missing`, `structural_other`, `structural_other_details`, `structural_details`, `structural_first_noticed`, `structural_reported_date`

  - **Plumbing** (19 fields): `has_plumbing_issues`, `plumbing_no_hot_water`, `plumbing_no_water`, `plumbing_low_pressure`, `plumbing_leaks`, `plumbing_burst_pipes`, `plumbing_clogged_drains`, `plumbing_toilet_not_working`, `plumbing_shower_not_working`, `plumbing_sink_not_working`, `plumbing_sewer_backup`, `plumbing_water_damage`, `plumbing_flooding`, `plumbing_water_discoloration`, `plumbing_other`, `plumbing_other_details`, `plumbing_details`, `plumbing_first_noticed`, `plumbing_reported_date`

  - **Electrical** (16 fields): `has_electrical_issues`, `electrical_no_power`, `electrical_partial_outages`, `electrical_exposed_wiring`, `electrical_sparking_outlets`, `electrical_broken_outlets`, `electrical_broken_switches`, `electrical_flickering_lights`, `electrical_circuit_breaker_issues`, `electrical_insufficient_outlets`, `electrical_burning_smell`, `electrical_other`, `electrical_other_details`, `electrical_details`, `electrical_first_noticed`, `electrical_reported_date`

  - **HVAC** (14 fields): `has_hvac_issues`, `hvac_no_heat`, `hvac_inadequate_heat`, `hvac_no_air_conditioning`, `hvac_inadequate_cooling`, `hvac_broken_thermostat`, `hvac_gas_smell`, `hvac_carbon_monoxide_detector_missing`, `hvac_ventilation_poor`, `hvac_other`, `hvac_other_details`, `hvac_details`, `hvac_first_noticed`, `hvac_reported_date`

  - **Appliance** (11 fields): `has_appliance_issues`, `appliance_refrigerator_broken`, `appliance_stove_broken`, `appliance_oven_broken`, `appliance_dishwasher_broken`, `appliance_garbage_disposal_broken`, `appliance_washer_broken`, `appliance_dryer_broken`, `appliance_other`, `appliance_other_details`, `appliance_details`

  - **Security** (13 fields): `has_security_issues`, `security_broken_locks`, `security_broken_windows`, `security_broken_doors`, `security_no_deadbolt`, `security_broken_gate`, `security_broken_intercom`, `security_inadequate_lighting`, `security_no_smoke_detector`, `security_break_ins`, `security_other`, `security_other_details`, `security_details`

  - **Pest** (19 fields): `has_pest_issues`, `pest_rats`, `pest_mice`, `pest_cockroaches`, `pest_bedbugs`, `pest_fleas`, `pest_ants`, `pest_termites`, `pest_spiders`, `pest_wasps`, `pest_bees`, `pest_other_insects`, `pest_birds`, `pest_raccoons`, `pest_other_vermin`, `pest_other_details`, `pest_details`, `pest_first_noticed`, `pest_reported_date`

- **`intake_household_members`**: Individual household member tracking
  - Primary key: `id` (UUID)
  - Foreign key: `intake_id` → references `client_intakes(id)` CASCADE DELETE
  - Fields: `name`, `relationship`, `age`, `has_disability`, `disability_details`

**Database Relationships**:
```
client_intakes (1) → (0-1) intake_landlord_info
client_intakes (1) → (0-1) intake_building_issues
client_intakes (1) → (0-N) intake_household_members
```

### Document Generation Schema (Legacy)

**Legacy Tables**:
- **`cases`**: Stores case-level information (property address, filing location, etc.)
  - Primary key: `id`
  - Contains: address, city, state, zip, filing location details

- **`parties`**: Stores plaintiff and defendant information
  - Primary key: `id`
  - Foreign key: `case_id` → references `cases(id)`
  - Fields: `full_name`, `party_type` (plaintiff/defendant), `party_number`, `role`, `entity_type`, `unit_number`, `is_head_of_household`, `age_category`

- **`party_issue_selections`**: Tracks issue/discovery selections for plaintiffs
  - Primary key: `id`
  - Foreign key: `party_id` → references `parties(id)`
  - Links plaintiffs to their selected issues (vermin, insects, environmental hazards, etc.)

**Database Usage**:
- Enables relational queries (e.g., "Find all clients with plumbing issues")
- Supports reporting and analytics
- Provides normalized data structure vs. nested JSON
- Facilitates multi-case comparison and aggregation

**Clearing Database**:
```sql
-- Client Intake tables
TRUNCATE TABLE intake_household_members CASCADE;
TRUNCATE TABLE intake_building_issues CASCADE;
TRUNCATE TABLE intake_landlord_info CASCADE;
TRUNCATE TABLE client_intakes CASCADE;

-- Legacy tables
TRUNCATE TABLE party_issue_selections CASCADE;
TRUNCATE TABLE parties CASCADE;
TRUNCATE TABLE cases CASCADE;
```

## Development Notes
- **Git Repository**: Yes (initialized Week 3)
  - Main branch: `main`
  - Current branch: `dev/week4-intake-form-poc`
- **Running on**: macOS (Darwin 25.0.0)
- **Backend Server**: Port 3000 (configurable via PORT env variable)
- **React Dev Server**: Port 3002 (Vite) - proxies API calls to port 3000
- **Development Database**: PostgreSQL on localhost:5433 (legal_forms_db_dev)
- **Middleware**: CORS, Morgan (HTTP logging), Compression
- **PostgreSQL Connection Pooling**: 20 max connections, 30s idle timeout, connection rotation at 7500 uses
- **Development Startup**: `./start-dev.sh` - Starts both backend and React dev servers

## Implemented Features

### Dropbox Integration
**Status**: ✅ Implemented (2025-10-20)

The application automatically uploads form submissions to Dropbox for cloud backup and storage:

**Implementation Details**:
- **Module**: `dropbox-service.js` - Comprehensive Dropbox API wrapper
- **Integration Point**: `server.js:1378-1392` - Non-blocking upload after file save
- **Test Script**: `test-dropbox-upload.js` - Verification and diagnostics
- **Documentation**: `DROPBOX_SETUP.md` - Complete setup guide

**Features**:
- ✅ Uses official Dropbox SDK (`dropbox` npm package)
- ✅ Automatic folder creation in Dropbox
- ✅ Path mapping preserves local folder structure
- ✅ Non-blocking uploads (doesn't delay responses)
- ✅ Error resilient with configurable failure handling
- ✅ Comprehensive logging for local and Dropbox paths
- ✅ Cloud-ready with environment variable configuration
- ✅ File overwriting with version preservation in Dropbox

**Configuration**:
- `DROPBOX_ACCESS_TOKEN` - OAuth token for API authentication
- `DROPBOX_ENABLED` - Enable/disable uploads (default: false)
- `DROPBOX_BASE_PATH` - Base folder in Dropbox (default: `/Apps/LegalFormApp`)
- `LOCAL_OUTPUT_PATH` - Local output directory to mirror (default: `/output`)
- `CONTINUE_ON_DROPBOX_FAILURE` - Continue on failure (default: true)

**Example Path Mapping**:
- Local: `/output/Clients/SmithCase/SROGs/Set1.docx`
- Dropbox: `/Apps/LegalFormApp/Clients/SmithCase/SROGs/Set1.docx`

**Testing**:
```bash
node test-dropbox-upload.js
```

See [DROPBOX_SETUP.md](DROPBOX_SETUP.md) for complete setup instructions.

## Output Structure
The application generates JSON matching a specific legal document format with:
- Form metadata (Id, InternalName, Name)
- PlaintiffDetails array with comprehensive discovery objects
- DefendantDetails2 array
- Full_Address object with country, state, city, postal code details
- All plaintiff issues tracked as boolean flags and arrays

## Known Facts
- The legacy HTML file ([index.html](index.html)) is very large (~180KB)
- There's a backup of index.html from an earlier version
- The application has two separate form systems (legacy + new React intake)
- Script.js exists but is currently unused (functionality moved to inline scripts or server)
- Database has both development (local) and production (Cloud SQL) instances
- React form uses Vite dev server with hot module replacement

## Testing Coverage
- Form element visibility and interaction
- Dynamic plaintiff/defendant addition functionality
- Form validation and submission workflow
- Data transformation accuracy
- API response validation
- Output structure compliance with specifications

## Recent Updates & Milestones

### Week 3 (November 2025) - Database Schema ✅
**Documentation**: [WEEK_3_COMPLETION_SUMMARY.md](WEEK_3_COMPLETION_SUMMARY.md)

- Created comprehensive client intake database schema
- Added 4 new tables: `client_intakes`, `intake_landlord_info`, `intake_building_issues`, `intake_household_members`
- Implemented CASCADE DELETE relationships
- Set up development database (legal_forms_db_dev)
- Created initial migrations for schema setup
- Deployed and tested on Google Cloud SQL

### Week 4 (November 2025) - React Intake Form ✅
**Documentation**: [WEEK_4_EXPANDED_FORM_COMPLETE.md](WEEK_4_EXPANDED_FORM_COMPLETE.md)

- Built React 18 + TypeScript intake form with Vite
- Implemented 9-step wizard with progress indicator
- Integrated TailwindCSS for responsive design
- Created API routes in [routes/intakes-expanded.js](routes/intakes-expanded.js)
- Connected form to PostgreSQL database
- Added comprehensive validation and error handling

### November 18, 2025 - UI Consolidation ✅
**Key Changes**:
- **Created** [BuildingIssuesCompact.tsx](client-intake/src/components/BuildingIssuesCompact.tsx) - Consolidated 7 building issue categories into single screen
- **Reduced** form from 15 steps to 9 steps (6-step reduction)
- **Updated** [IntakeFormExpanded.tsx](client-intake/src/components/IntakeFormExpanded.tsx) with new step flow
- **Ran 5 database migrations** to add 70+ building issue columns and remove legacy/duplicate columns:
  - [add-building-issues-columns.sql](migrations/add-building-issues-columns.sql) - Added 66 columns
  - [fix-plumbing-columns.sql](migrations/fix-plumbing-columns.sql) - Added 4 plumbing columns
  - [add-missing-pest-columns.sql](migrations/add-missing-pest-columns.sql) - Added 4 pest columns
  - [remove-duplicate-pest-columns.sql](migrations/remove-duplicate-pest-columns.sql) - Cleaned up duplicates
  - [remove-legacy-issue-columns.sql](migrations/remove-legacy-issue-columns.sql) - Removed unused columns
- **Fixed** [server.js:94](server.js#L94) to use correct route file (`routes/intakes-expanded.js`)
- **Implemented** compact 3-column checkbox grid layout (responsive)
- **Result**: Form successfully submits with all 7 building issue categories saving correctly

---

*This document serves as a knowledge base for Claude to maintain context about the Legal Form Application project. Last updated: 2025-11-18*
