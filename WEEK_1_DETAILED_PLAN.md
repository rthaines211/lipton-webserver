# Week 1: Database Setup & Initial Refactoring - Detailed Plan
**Timeline:** November 18-22, 2025
**Goal:** Create all database tables and begin extracting routes from server.js
**Critical Output:** 9 intake tables created, health routes extracted, service structure started

---

## Pre-Week 1 Setup (Sunday Evening, November 17)

### Essential Preparation (30 minutes)
```bash
# 1. Create your dev branch
git checkout -b dev/intake-system

# 2. Create migrations directory
mkdir -p migrations

# 3. Push to establish branch
git push origin dev/intake-system

# 4. Verify dev environment is running
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
# Should return: {"status":"ok"}

# 5. Test database connection
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
# Enter password from Secret Manager
# Then: \q to exit
```

---

## Day 1: Monday, November 18 - Database Migration

### Goal
Create and execute database migration for all 9 intake tables

### Hour-by-Hour Breakdown

#### 9:00-10:00 AM: Create Migration File
**Claude Code Prompt:**
```
Create a PostgreSQL migration file at migrations/001_create_intake_tables.sql that creates these 9 tables:

1. intake_submissions - Main table with columns:
   - id (serial primary key)
   - intake_number (unique varchar, format: INT-YYYY-#####)
   - client_email (varchar 255, required)
   - client_phone (varchar 20)
   - first_name (varchar 100, required)
   - last_name (varchar 100, required)
   - current_street_address (varchar 255)
   - current_city (varchar 100)
   - current_state (varchar 2)
   - current_zip_code (varchar 10)
   - intake_status (enum: 'new', 'reviewing', 'approved', 'rejected')
   - urgency_level (enum: 'normal', 'urgent', 'emergency')
   - assigned_attorney_id (integer)
   - assigned_attorney_name (varchar 255)
   - created_at (timestamp)
   - updated_at (timestamp)

2. intake_page_1 through intake_page_5 - JSONB storage tables with:
   - id (serial primary key)
   - intake_id (foreign key to intake_submissions)
   - page_data (jsonb)
   - created_at (timestamp)
   - updated_at (timestamp)

3. saved_sessions - Resume tokens table:
   - id (serial primary key)
   - token (uuid unique)
   - intake_data (jsonb)
   - email (varchar 255)
   - expires_at (timestamp)
   - used (boolean default false)
   - created_at (timestamp)

4. attorneys - Attorney accounts:
   - id (serial primary key)
   - email (varchar 255 unique)
   - password_hash (varchar 255)
   - full_name (varchar 255)
   - role (enum: 'attorney', 'admin')
   - active (boolean default true)
   - created_at (timestamp)
   - last_login (timestamp)

5. audit_logs - System audit trail:
   - id (serial primary key)
   - user_email (varchar 255)
   - action (varchar 100)
   - resource_type (varchar 50)
   - resource_id (integer)
   - details (jsonb)
   - ip_address (varchar 45)
   - created_at (timestamp)

Include appropriate indexes for search performance and foreign key constraints.
```

**Expected Output:** File `migrations/001_create_intake_tables.sql` created

#### 10:00-10:30 AM: Review and Test Migration Locally
```bash
# Review the migration file
cat migrations/001_create_intake_tables.sql

# Test syntax is valid (dry run)
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Inside psql:
BEGIN;
\i migrations/001_create_intake_tables.sql
# If no errors, continue. If errors, ROLLBACK and fix
ROLLBACK;  # Don't commit yet
\q
```

#### 10:30-11:00 AM: Execute Migration
```bash
# Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Run the migration for real
\i migrations/001_create_intake_tables.sql

# Verify tables were created
\dt
# Should show 9 new tables

# Check table structure
\d intake_submissions
\d intake_page_1
\d saved_sessions
\d attorneys
\d audit_logs

# Test with a simple insert
INSERT INTO intake_submissions (intake_number, client_email, first_name, last_name, intake_status)
VALUES ('INT-2025-00001', 'test@example.com', 'Test', 'User', 'new');

SELECT * FROM intake_submissions;
# Should see your test row

# Exit
\q
```

#### 11:00-11:30 AM: Commit Migration
```bash
# Add migration file to git
git add migrations/001_create_intake_tables.sql

# Create a migration record file
echo "# Database Migrations

## 001_create_intake_tables.sql
- **Date Run:** $(date '+%Y-%m-%d %H:%M')
- **Environment:** dev (legal-forms-db-dev)
- **Status:** ✅ Complete
- **Tables Created:** 9 (intake_submissions, intake_page_1-5, saved_sessions, attorneys, audit_logs)
" > migrations/MIGRATION_LOG.md

git add migrations/MIGRATION_LOG.md

# Commit
git commit -m "feat: add database migration for intake system tables

- Created 9 tables for intake system
- Added indexes for search performance
- Established foreign key relationships
- Implemented audit logging structure"

git push origin dev/intake-system
```

#### 11:30 AM-12:00 PM: Create Rollback Script
**Claude Code Prompt:**
```
Create a rollback script at migrations/001_rollback.sql that safely drops all the tables created by 001_create_intake_tables.sql in the correct order (considering foreign key constraints)
```

```bash
# Test rollback works (but don't execute)
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

BEGIN;
\i migrations/001_rollback.sql
# Should show DROP TABLE commands succeeding
ROLLBACK;  # Don't actually drop them!
\q

# Commit rollback script
git add migrations/001_rollback.sql
git commit -m "feat: add rollback script for intake tables migration"
git push origin dev/intake-system
```

### Afternoon Tasks

#### 1:00-3:00 PM: Create Database Connection Service
**Claude Code Prompt:**
```
Extract the database connection logic from server.js into a new file services/database.js that:
1. Creates a connection pool using pg
2. Uses environment variables for configuration
3. Includes connection retry logic
4. Exports query and getClient methods
5. Includes proper error handling
6. Has a health check function
```

```bash
# Test the new service works
git add services/database.js
git commit -m "refactor: extract database connection to service layer"
git push origin dev/intake-system

# Wait for deployment
# Then test health check still works
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
```

#### 3:00-4:30 PM: Create Intake Service Skeleton
**Claude Code Prompt:**
```
Create a service at services/intake-service.js with skeleton methods for:
1. createIntake(formData) - will save intake submission
2. getIntakeById(id) - will retrieve full intake
3. searchIntakes(filters) - will search with filters
4. updateIntakeStatus(id, status, userId) - will update status
5. generateIntakeNumber() - generates INT-YYYY-##### format
Each method should have JSDoc comments and return placeholder data for now
```

```bash
git add services/intake-service.js
git commit -m "feat: create intake service skeleton with placeholder methods"
git push origin dev/intake-system
```

#### 4:30-5:00 PM: End of Day Verification
```bash
# Verify all tables exist
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Should see:
# audit_logs
# attorneys
# intake_page_1
# intake_page_2
# intake_page_3
# intake_page_4
# intake_page_5
# intake_submissions
# saved_sessions
# (plus existing tables)

# Check deployment is healthy
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# Document progress
echo "Day 1 Complete: Database tables created, connection service extracted" >> WEEK_1_PROGRESS.md
git add WEEK_1_PROGRESS.md
git commit -m "docs: day 1 progress update"
git push origin dev/intake-system
```

---

## Day 2: Tuesday, November 19 - Extract Health Routes

### Goal
Extract health check routes from server.js into modular structure

### Morning Tasks (9:00 AM - 12:00 PM)

#### Step 1: Analyze Current Health Routes
```bash
# First, search for health routes in server.js
grep -n "health" server.js
# Note line numbers where health routes are defined
```

#### Step 2: Extract Health Routes
**Claude Code Prompt:**
```
Look at server.js and find all health-related endpoints (likely /health, /health/ready, /health/detailed).
Extract them into a new file routes/health.js that:
1. Uses Express Router
2. Imports the database service from services/database.js
3. Exports the router
4. Maintains exact same functionality as current endpoints
Then update server.js to use this new router with app.use('/health', healthRoutes)
```

#### Step 3: Test Extraction
```bash
# Commit and deploy
git add routes/health.js server.js
git commit -m "refactor: extract health routes to separate module"
git push origin dev/intake-system

# Wait 3-5 minutes for deployment
# Test all health endpoints still work
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health/ready
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health/detailed
```

### Afternoon Tasks (1:00 PM - 5:00 PM)

#### Create Middleware Directory Structure
**Claude Code Prompt:**
```
Create a middleware/error-handler.js file that:
1. Catches all errors in the application
2. Logs errors with appropriate detail
3. Returns consistent error responses
4. Doesn't leak sensitive information
Include different handling for validation errors (400), auth errors (401), and server errors (500)
```

```bash
git add middleware/error-handler.js
git commit -m "feat: add centralized error handling middleware"
git push origin dev/intake-system
```

---

## Day 3: Wednesday, November 20 - Extract Form Routes

### Goal
Extract existing form submission routes into modular structure

### Tasks
1. Identify all form-related endpoints in server.js
2. Extract to routes/forms.js
3. Create services/form-service.js for business logic
4. Test all existing forms still work

**Claude Code Prompt:**
```
Analyze server.js and find all routes related to form submissions (likely POST routes for /api/form-entries or similar).
Extract them into:
1. routes/forms.js - Express router for endpoints
2. services/form-service.js - Business logic
Maintain 100% backward compatibility - no changes to API contracts
```

---

## Day 4: Thursday, November 21 - Create Service Layer Architecture

### Goal
Establish clean service layer pattern for the application

### Morning: Email Service Enhancement
**Claude Code Prompt:**
```
Look at the existing email sending code in server.js and enhance the email service at services/email-service.js to:
1. Support multiple templates
2. Add template for intake confirmation
3. Include retry logic for failed sends
4. Add method for batch sending
5. Include email validation
```

### Afternoon: Storage Service
**Claude Code Prompt:**
```
Create services/storage-service.js that handles all file operations:
1. Upload files to Cloud Storage
2. Generate signed URLs
3. Delete files
4. List files for a given intake
5. Handle file type validation
```

---

## Day 5: Friday, November 22 - Integration Testing & Documentation

### Goal
Ensure all refactored code works together, document the new structure

### Morning: Integration Tests
```bash
# Create test file
touch test/week1-integration.test.js
```

**Claude Code Prompt:**
```
Create integration tests in test/week1-integration.test.js that verify:
1. Health endpoints return correct status codes
2. Database connection pool works
3. Form routes are accessible
4. Email service can send (mock the actual send)
5. All services are properly exported and importable
```

### Afternoon: Documentation and Cleanup
```bash
# Create architecture documentation
touch ARCHITECTURE.md
```

**Claude Code Prompt:**
```
Create ARCHITECTURE.md that documents:
1. The new modular structure
2. How routes, services, and middleware interact
3. Database schema (the 9 tables we created)
4. API endpoints available
5. Environment variables required
```

### End of Week Verification
```bash
# Run all tests
npm test

# Check all endpoints
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
# Test form endpoints
# Test database queries

# Generate week 1 report
echo "# Week 1 Accomplishments

## Database
- ✅ Created 9 intake tables
- ✅ Added indexes and foreign keys
- ✅ Tested with sample data

## Refactoring
- ✅ Extracted health routes
- ✅ Extracted form routes
- ✅ Created service layer architecture
- ✅ Added error handling middleware

## Services Created
- ✅ database.js - Database connection management
- ✅ intake-service.js - Intake business logic (skeleton)
- ✅ email-service.js - Enhanced email handling
- ✅ storage-service.js - File management

## Documentation
- ✅ Architecture documented
- ✅ Migration log maintained
- ✅ API endpoints documented

## Next Week
Ready to build intake submission functionality
" > WEEK_1_COMPLETE.md

git add -A
git commit -m "feat: complete week 1 - database and refactoring"
git push origin dev/intake-system
```

---

## Troubleshooting Guide

### If Migration Fails
```sql
-- Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

-- Check what tables exist
\dt

-- If partial migration, clean up
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS attorneys CASCADE;
DROP TABLE IF EXISTS intake_page_5 CASCADE;
DROP TABLE IF EXISTS intake_page_4 CASCADE;
DROP TABLE IF EXISTS intake_page_3 CASCADE;
DROP TABLE IF EXISTS intake_page_2 CASCADE;
DROP TABLE IF EXISTS intake_page_1 CASCADE;
DROP TABLE IF EXISTS saved_sessions CASCADE;
DROP TABLE IF EXISTS intake_submissions CASCADE;

-- Try migration again
\i migrations/001_create_intake_tables.sql
```

### If Deployment Fails
```bash
# Check GitHub Actions
https://github.com/[your-repo]/actions

# Check Cloud Build
gcloud builds list --limit=5

# Deploy manually if needed
gcloud run deploy node-server-dev --source=. --region=us-central1
```

### If Routes Don't Work After Extraction
```bash
# Check server.js is importing correctly
grep "require.*health" server.js

# Check the route file exports correctly
grep "module.exports" routes/health.js

# Check logs for errors
gcloud run logs read node-server-dev --region=us-central1 --limit=100 | grep ERROR
```

---

## Success Criteria for Week 1

### Must Complete
- [ ] All 9 database tables created
- [ ] Health routes extracted and working
- [ ] Database service created
- [ ] Basic service architecture established

### Should Complete
- [ ] Form routes extracted
- [ ] Email service enhanced
- [ ] Error handling middleware added
- [ ] Storage service created

### Nice to Have
- [ ] Integration tests written
- [ ] Architecture documented
- [ ] All services have JSDoc comments

---

## Daily Standup Questions

Each day at 9:00 AM, answer:
1. What did I complete yesterday?
2. What will I complete today?
3. Are there any blockers?
4. Am I on track for the week?

---

**Week 1 Importance:** This week lays the foundation. Without the database tables, nothing else can be built. Without refactoring, the code will become unmaintainable. Take time to do this right.

---

*Last Updated: November 17, 2025*
*Next Week: Build intake submission API*