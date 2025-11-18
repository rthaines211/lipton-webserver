# Database Migrations - Client Intake System

This directory contains SQL migrations for the client intake system.

## Migration Files

### 001_create_intake_schema.sql
**Purpose:** Create all 13 client intake tables for Week 3

**Tables Created:**
1. `client_intakes` - Main intake record (90+ fields across 5 sections)
2. `intake_household_members` - Household composition
3. `intake_landlord_info` - Landlord & property manager details
4. `intake_building_issues` - Structural and pest issues
5. `intake_utilities_issues` - Utilities problems
6. `intake_health_impacts` - Health effects on residents
7. `intake_maintenance_requests` - Repair request history
8. `intake_financial_details` - Income, expenses, damages
9. `intake_legal_history` - Prior cases and notices
10. `intake_documentation` - File uploads
11. `intake_witnesses` - Potential witnesses
12. `intake_timeline` - Event chronology
13. `intake_attorney_notes` - Review notes

**Features:**
- Comprehensive constraints and data validation
- Indexes for common query patterns
- Auto-generated intake numbers (INT-2025-00001)
- Timestamp triggers for audit trail
- Summary view for dashboard queries
- Full documentation via SQL comments

**Dependencies:**
- PostgreSQL extensions: `pgcrypto`, `uuid-ossp`
- Compatible with existing `cases` and `parties` tables

### 001_rollback_intake_schema.sql
**Purpose:** Remove all intake tables (emergency rollback)

**Warning:** This deletes ALL intake data. Use with caution.

---

## Running Migrations

### Local Development

```bash
# Connect to local database
psql -h localhost -U ryanhaines -d legal_forms_db

# Run migration
\i database/migrations/001_create_intake_schema.sql

# Verify tables created
\dt intake*

# Check sequence
SELECT generate_intake_number();
```

### Cloud SQL (Dev Environment)

```bash
# Option 1: Via gcloud (if psql installed)
gcloud sql connect legal-forms-db-dev --user=app-user-dev < database/migrations/001_create_intake_schema.sql

# Option 2: Via Cloud SQL Proxy
./cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev &
psql -h 127.0.0.1 -U app-user-dev -d legal_forms_db_dev < database/migrations/001_create_intake_schema.sql
```

### Cloud SQL (Production)

```bash
# IMPORTANT: Test in dev first!
# Requires approval from team lead

# Connect via proxy
./cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db &
psql -h 127.0.0.1 -U postgres -d legal_forms < database/migrations/001_create_intake_schema.sql
```

---

## Post-Migration Verification

### 1. Verify Tables Created

```sql
-- Check all intake tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'intake%'
ORDER BY table_name;

-- Should return 13 tables + view
```

### 2. Test Intake Number Generation

```sql
-- Test sequence
SELECT generate_intake_number();
-- Should return: INT-2025-00001

SELECT generate_intake_number();
-- Should return: INT-2025-00002
```

### 3. Create Test Intake

```sql
-- Insert test intake
INSERT INTO client_intakes (
    first_name,
    last_name,
    email_address,
    primary_phone,
    current_street_address,
    current_city,
    current_state,
    current_zip_code,
    property_street_address,
    property_city,
    property_state,
    property_zip_code
) VALUES (
    'John',
    'Test',
    'john.test@example.com',
    '555-0100',
    '123 Test St',
    'Los Angeles',
    'CA',
    '90001',
    '123 Test St',
    'Los Angeles',
    'CA',
    '90001'
);

-- Verify created
SELECT intake_number, first_name, last_name, email_address, intake_status
FROM client_intakes
ORDER BY created_at DESC
LIMIT 1;
```

### 4. Test Relationships

```sql
-- Get the test intake ID
SELECT id FROM client_intakes WHERE email_address = 'john.test@example.com';

-- Add household member
INSERT INTO intake_household_members (
    intake_id,
    member_type,
    first_name,
    last_name,
    relationship_to_client,
    age,
    display_order
) VALUES (
    (SELECT id FROM client_intakes WHERE email_address = 'john.test@example.com'),
    'child',
    'Jane',
    'Test',
    'Daughter',
    10,
    1
);

-- Verify relationship
SELECT
    i.intake_number,
    i.first_name as client_first_name,
    h.first_name as member_first_name,
    h.relationship_to_client,
    h.is_minor
FROM client_intakes i
JOIN intake_household_members h ON h.intake_id = i.id
WHERE i.email_address = 'john.test@example.com';
```

### 5. Test View

```sql
-- Query summary view
SELECT * FROM v_intake_summary
ORDER BY intake_date DESC
LIMIT 5;
```

### 6. Clean Up Test Data

```sql
-- Remove test intake (cascades to household members)
DELETE FROM client_intakes
WHERE email_address = 'john.test@example.com';
```

---

## Rollback Instructions

**WARNING:** This deletes all intake data!

```bash
# Only if you need to completely remove intake system
psql -h localhost -U ryanhaines -d legal_forms_db < database/migrations/001_rollback_intake_schema.sql
```

---

## Schema Documentation

### Client Intakes Table

**Primary Fields:**
- `intake_number`: Auto-generated (INT-2025-00001)
- `intake_status`: pending, under_review, approved, rejected, assigned, converted
- `urgency_level`: low, medium, high, critical
- `priority_score`: 1-100 calculated score

**Key Relationships:**
- One intake → many household members
- One intake → one landlord info
- One intake → one building issues record
- One intake → many maintenance requests
- One intake → many health impacts
- One intake → many documents
- One intake → many witnesses
- One intake → many timeline events
- One intake → many attorney notes

**Indexes:**
- Status, date, assigned attorney (fast queries)
- Email (lookup)
- Property address (search)

### Auto-Generated Features

**Intake Numbers:**
- Format: `INT-YYYY-NNNNN`
- Example: `INT-2025-00001`
- Auto-incremented via sequence

**Timestamps:**
- `created_at`: Set on insert
- `updated_at`: Auto-updated on every change

**Computed Fields:**
- `is_minor`: Automatically true if age < 18

---

## Integration with Existing Schema

The intake tables are completely separate from the existing document generation tables:

**Existing Tables (Document Gen):**
- `cases`
- `parties`
- `issue_categories`
- `issue_options`
- `party_issue_selections`

**New Tables (Client Intake):**
- `client_intakes` (and 12 related tables)

**Future Integration:**
When attorney loads an intake into the doc gen form, the application will:
1. Read data from `client_intakes`
2. Map fields to document generation format
3. Create new record in `cases` table
4. Create `parties` records for plaintiffs
5. Link selected issues to `party_issue_selections`

This keeps the intake system completely independent until conversion.

---

## Performance Considerations

**Expected Volume:**
- 100-500 intakes per month
- Average 2-3 household members per intake
- Average 5-10 documents per intake
- Average 3-5 maintenance requests per intake

**Index Strategy:**
- All foreign keys indexed
- Common query fields indexed (status, date, attorney)
- Full-text search NOT implemented yet (future enhancement)

**Storage Estimates:**
- Average intake: ~50KB (without documents)
- With documents: ~5MB per intake
- 1 year of data: ~30GB (500 intakes/month)

---

## Next Steps

After migration:
1. Update application code to use new tables
2. Create API endpoints for intake submission
3. Build frontend intake form (25 sections)
4. Implement field mapping service (intake → doc gen)
5. Build attorney search modal

---

**Migration Version:** 001
**Created:** 2025-11-18
**Author:** Claude Code
**Status:** Ready for testing
