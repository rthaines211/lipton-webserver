# Week 1 Action Plan - Day-by-Day Claude Code Prompts
**Your copy-paste guide for Week 1 development**
**Just follow these prompts in order with Claude Code**

---

## 🚀 Quick Start (Before Day 1)

### Setup Your Environment
```bash
# Run these commands first:
git checkout -b dev/intake-system
mkdir -p migrations services routes middleware test
git push origin dev/intake-system
```

---

## 📅 Day 1: Monday - Database Migration

### ✅ Task 1: Create Migration File (9:00 AM)
**Copy and paste this entire prompt to Claude Code:**

```
Create a PostgreSQL migration file at migrations/001_create_intake_tables.sql with these exact tables and structure:

1. intake_submissions table:
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

2. intake_page_1 through intake_page_5 tables (create 5 identical tables):
CREATE TABLE IF NOT EXISTS intake_page_[N] (
    id SERIAL PRIMARY KEY,
    intake_id INTEGER NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

3. saved_sessions table:
CREATE TABLE IF NOT EXISTS saved_sessions (
    id SERIAL PRIMARY KEY,
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    intake_data JSONB NOT NULL,
    email VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

4. attorneys table:
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

5. audit_logs table:
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

Also add these indexes:
- Index on intake_submissions(intake_status)
- Index on intake_submissions(created_at DESC)
- Index on intake_submissions(client_email)
- Index on saved_sessions(token)
- Index on saved_sessions(expires_at)
- Index on attorneys(email)
- Index on audit_logs(created_at DESC)

Add update timestamp triggers for all tables with updated_at columns.
```

### ✅ Task 2: Run the Migration (10:30 AM)
**Run these commands:**

```bash
# Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
# Enter password when prompted

# In psql, run:
\i migrations/001_create_intake_tables.sql
\dt
# Should see 9 new tables
\q

# Commit the migration
git add migrations/001_create_intake_tables.sql
git commit -m "feat: add database migration for 9 intake tables"
git push origin dev/intake-system
```

### ✅ Task 3: Create Rollback Script (11:30 AM)
**Claude Code Prompt:**

```
Create migrations/001_rollback.sql that drops all 9 tables created by the migration in reverse order to handle foreign keys:
- Drop audit_logs
- Drop attorneys
- Drop saved_sessions
- Drop intake_page_5 through intake_page_1
- Drop intake_submissions
Include IF EXISTS to make it safe to run multiple times.
```

### ✅ Task 4: Database Connection Service (1:00 PM)
**Claude Code Prompt:**

```
Look at the database connection code in server.js. Extract it into services/database.js that:
1. Creates a PostgreSQL connection pool using the 'pg' library
2. Uses these environment variables:
   - DB_HOST (or INSTANCE_CONNECTION_NAME for Cloud SQL)
   - DB_NAME
   - DB_USER
   - DB_PASSWORD
3. Exports these methods:
   - query(text, params) - for running queries
   - getClient() - for transactions
   - checkHealth() - returns connection status
4. Includes connection retry logic
5. Handles connection errors gracefully
6. Uses the existing connection pattern from server.js but in a modular way
```

### ✅ Task 5: Intake Service Skeleton (3:00 PM)
**Claude Code Prompt:**

```
Create services/intake-service.js with these skeleton methods (implement later):

class IntakeService {
  // Create new intake from form submission
  static async createIntake(formData) {
    // TODO: Implement
    return { id: 1, intake_number: 'INT-2025-00001' };
  }

  // Get intake by ID with all related data
  static async getIntakeById(id) {
    // TODO: Implement
    return { id, status: 'new' };
  }

  // Search intakes with filters
  static async searchIntakes(filters) {
    // TODO: Implement
    return { results: [], total: 0 };
  }

  // Update intake status
  static async updateIntakeStatus(id, status, userId) {
    // TODO: Implement
    return { success: true };
  }

  // Generate unique intake number (INT-2025-00001 format)
  static async generateIntakeNumber() {
    const year = new Date().getFullYear();
    // TODO: Get next number from database
    return `INT-${year}-00001`;
  }
}

module.exports = IntakeService;

Add JSDoc comments for each method.
```

---

## 📅 Day 2: Tuesday - Extract Health Routes

### ✅ Task 1: Extract Health Routes (9:00 AM)
**Claude Code Prompt:**

```
Find all health check endpoints in server.js (look for routes containing '/health').
Extract them into routes/health.js that:
1. Uses Express Router
2. Imports the database service from ../services/database.js
3. Keeps the exact same endpoint paths and responses
4. Has these endpoints:
   - GET / - basic health check
   - GET /ready - readiness check with database
   - GET /detailed - detailed status with database info

Then update server.js to:
1. Import the health router: const healthRoutes = require('./routes/health');
2. Use it: app.use('/health', healthRoutes);
3. Remove the old health routes from server.js
```

### ✅ Task 2: Error Handler Middleware (1:00 PM)
**Claude Code Prompt:**

```
Create middleware/error-handler.js that:

1. Exports an error handling middleware function: (err, req, res, next)
2. Handles different error types:
   - Validation errors (return 400 with field errors)
   - Authentication errors (return 401)
   - Not found errors (return 404)
   - Database errors (return 503)
   - Default server errors (return 500)
3. Logs errors appropriately (full stack for 500s, message only for 400s)
4. Never leaks sensitive info like passwords or internal paths
5. Returns consistent JSON format: { error: { message, code, details } }

Add it to server.js at the very end (after all routes) with app.use(errorHandler);
```

---

## 📅 Day 3: Wednesday - Extract Form Routes

### ✅ Task 1: Extract Form Routes (9:00 AM)
**Claude Code Prompt:**

```
Find all form submission related routes in server.js (look for POST endpoints with 'form' in the path).
Extract them into:

1. routes/forms.js - Express Router with all form endpoints
2. services/form-service.js - Business logic for form operations

Keep 100% backward compatibility - don't change any API contracts.
The routes should use the form service for business logic.
Update server.js to use the new router: app.use('/api/forms', formRoutes);
```

### ✅ Task 2: Add Validation Middleware (2:00 PM)
**Claude Code Prompt:**

```
Create middleware/validation.js with these validation functions:

1. validateEmail(email) - returns true if valid email format
2. validatePhone(phone) - returns true if valid US phone
3. validateRequired(fields) - middleware that checks required fields exist
4. sanitizeInput(input) - removes/escapes dangerous characters

Example usage:
router.post('/submit',
  validateRequired(['email', 'firstName', 'lastName']),
  async (req, res) => { ... }
);

Include proper error messages for validation failures.
```

---

## 📅 Day 4: Thursday - Service Layer Enhancement

### ✅ Task 1: Email Service Enhancement (9:00 AM)
**Claude Code Prompt:**

```
Look at how emails are sent in server.js (probably using SendGrid).
Create or enhance services/email-service.js to:

1. Configure SendGrid with API key from environment
2. Support multiple email templates:
   - intakeConfirmation(data) - for client confirmations
   - attorneyNotification(data) - for new intake alerts
   - statusUpdate(data) - for status changes
3. Include retry logic (3 attempts with exponential backoff)
4. Validate email addresses before sending
5. Log all email attempts
6. Handle errors gracefully

Export methods:
- sendEmail(to, subject, html)
- sendTemplatedEmail(to, template, data)
- validateEmailAddress(email)
```

### ✅ Task 2: Storage Service (2:00 PM)
**Claude Code Prompt:**

```
Create services/storage-service.js for file handling:

const { Storage } = require('@google-cloud/storage');

class StorageService {
  constructor() {
    this.storage = new Storage();
    this.bucket = process.env.GCS_BUCKET_NAME || 'docmosis-tornado-form-submissions-dev';
  }

  // Upload file to Cloud Storage
  async uploadFile(file, intakeId) {
    // Generate unique filename
    // Upload to bucket
    // Return public URL
  }

  // Generate signed URL for private access
  async getSignedUrl(filename, expiresIn = 3600) {
    // Generate temporary signed URL
  }

  // Delete file
  async deleteFile(filename) {
    // Delete from bucket
  }

  // List all files for an intake
  async listFiles(intakeId) {
    // List files with prefix
  }

  // Validate file type and size
  validateFile(file) {
    const allowedTypes = ['pdf', 'jpg', 'png', 'doc', 'docx'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    // Check type and size
  }
}

module.exports = new StorageService();
```

---

## 📅 Day 5: Friday - Testing & Documentation

### ✅ Task 1: Integration Tests (9:00 AM)
**Claude Code Prompt:**

```
Create test/week1-integration.test.js using Jest that tests:

1. Database connection:
   - Can connect to database
   - Can run a simple query
   - Connection pool works

2. Health endpoints:
   - GET /health returns 200
   - GET /health/ready returns 200
   - GET /health/detailed returns database info

3. Services exist and are importable:
   - require('../services/database') works
   - require('../services/intake-service') works
   - require('../services/email-service') works
   - require('../services/storage-service') works

4. Middleware works:
   - Error handler catches and formats errors
   - Validation middleware validates correctly

Use supertest for HTTP testing and jest for assertions.
```

### ✅ Task 2: Architecture Documentation (2:00 PM)
**Claude Code Prompt:**

```
Create ARCHITECTURE.md that documents our new modular structure:

# Architecture Overview

## Directory Structure
- /routes - Express routers for endpoints
- /services - Business logic and external integrations
- /middleware - Request/response middleware
- /migrations - Database migrations

## Database Schema
Document the 9 tables we created with their relationships

## API Endpoints
List all available endpoints with their methods and purposes

## Service Layer
Explain how services encapsulate business logic

## Environment Variables
List all required environment variables

## Data Flow
Explain request flow: Route -> Middleware -> Service -> Database

Include ASCII diagrams where helpful.
```

---

## 🎯 End of Week Checklist

Run these commands to verify everything works:

```bash
# Test health endpoints
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health/ready
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health/detailed

# Check database tables exist
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev -c "\dt"

# Run tests if available
npm test

# Check logs for errors
gcloud run logs read node-server-dev --region=us-central1 --limit=50 | grep ERROR

# Final commit
git add -A
git commit -m "feat: complete week 1 - database setup and initial refactoring"
git push origin dev/intake-system
```

---

## 🚨 If Something Goes Wrong

### Can't connect to database:
```bash
# Check instance is running
gcloud sql instances describe legal-forms-db-dev --format='value(state)'
# Should say: RUNNABLE
```

### Migration failed:
```bash
# Connect and run rollback
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
\i migrations/001_rollback.sql
# Then try migration again
```

### Deployment failed:
```bash
# Check GitHub Actions
https://github.com/[your-repo]/actions

# Deploy manually
gcloud run deploy node-server-dev --source=. --region=us-central1
```

---

## 📊 Success Metrics for Week 1

You've succeeded if:
- ✅ All 9 database tables exist
- ✅ Health endpoints work at /health/*
- ✅ Database service is modular
- ✅ Services directory has 4+ files
- ✅ Routes directory has 2+ files
- ✅ server.js is smaller than before
- ✅ No errors in logs

---

**Remember:** Just copy each Claude Code prompt exactly as written. Claude Code will handle the implementation details. Your job is to test and commit the changes.

**Tip:** If Claude Code's output doesn't look right, you can say: "That's close, but can you also [specific adjustment]" and it will refine the solution.

---

*Last Updated: November 17, 2025*
*Ready to start? Begin with Day 1, Task 1!*