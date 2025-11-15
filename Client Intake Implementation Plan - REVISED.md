# Client Intake System - REVISED Implementation Plan
**Version:** 2.0 (Post-Technical Review)
**Project:** Lipton Legal Group - Client Intake Integration
**Timeline:** 9 weeks (1 week prep + 2 weeks refactoring + 6 weeks development)
**Start Date:** [To Be Determined]
**Team:** Solo developer (Ryan)

---

## 📋 Executive Summary

### What Changed from Original Plan
- ✅ Extended timeline from 7 weeks to 9 weeks (realistic buffer)
- ✅ Reduced database schema from 13 tables to 5 tables (JSONB-first approach)
- ✅ Added comprehensive field mapping with edge case handling
- ✅ Increased modal size to 960×720px with split-pane preview
- ✅ Added security hardening (CAPTCHA, input sanitization)
- ✅ Added accessibility compliance tasks
- ✅ Week 3.5 integration testing checkpoint
- ✅ IndexedDB + server-side draft saves
- ✅ Load testing and performance validation

### Timeline Overview
```
┌────────────────────────────────────────────────────────────────┐
│  WEEK 0: PREP & DECISIONS      │  1 week   │  Foundation      │
├────────────────────────────────────────────────────────────────┤
│  WEEK 1-2: REFACTORING         │  2 weeks  │  Modularization  │
├────────────────────────────────────────────────────────────────┤
│  WEEK 2.5: INTEGRATION TEST    │  0.5 week │  Validation      │
├────────────────────────────────────────────────────────────────┤
│  WEEK 3: DATABASE SETUP        │  1 week   │  Schema & Data   │
├────────────────────────────────────────────────────────────────┤
│  WEEK 4-5: INTAKE FORM         │  2 weeks  │  Client UI       │
├────────────────────────────────────────────────────────────────┤
│  WEEK 6: ATTORNEY MODAL        │  1 week   │  Attorney UI     │
├────────────────────────────────────────────────────────────────┤
│  WEEK 7: FIELD MAPPING         │  1 week   │  Integration     │
├────────────────────────────────────────────────────────────────┤
│  WEEK 8-9: TESTING & DEPLOY    │  2 weeks  │  QA & Launch     │
└────────────────────────────────────────────────────────────────┘

Total: 9 weeks to production-ready intake system
```

### Critical Success Factors
- ✅ All HIGH PRIORITY questions answered before Week 1
- ✅ Staging environment with production data sample
- ✅ Modal UI prototype approved before coding
- ✅ Field mapping edge cases documented
- ✅ Security audit completed before public launch
- ✅ Accessibility compliance verified

---

## WEEK 0: PREPARATION & DECISIONS (5 days)

**Goal:** Answer all open questions, create prototypes, set up infrastructure

### Day 1: Architecture Decisions

**Tasks:**
1. ✅ **Finalize Form Structure**: Hybrid approach (5 pages, 5 sections each)
2. ✅ **Finalize Modal Design**: 960×720px centered, split-pane view
3. ✅ **Finalize Upload Strategy**: Upload after submission via emailed link
4. ✅ **Finalize Database Approach**: 5 tables with JSONB (see schema below)
5. ✅ **Finalize Auto-Save Strategy**: IndexedDB primary + localStorage fallback

**Deliverables:**
- Architecture Decision Record (ADR) document
- Signed-off requirements from stakeholders

---

### Day 2: Create Prototypes

**Tasks:**
1. Create clickable **Figma/HTML prototype** of attorney modal
   - Split-pane: List view (460px) + Preview pane (500px)
   - Mobile responsive version (<768px = full screen)
   - All interaction states (hover, selected, loading, error)

2. Create **form navigation prototype**
   - 5-page stepper component
   - Progress indicator with section counts
   - "Save & Continue Later" functionality

**Deliverables:**
- Figma link or HTML prototype
- User flow diagram for client journey
- User flow diagram for attorney journey

---

### Day 3: Field Mapping Specification

**Tasks:**
1. Create **field mapping spreadsheet** (CSV/Google Sheets):
   - All 235+ intake fields
   - Mapped doc gen field (or "N/A" if no mapping)
   - Data type (string, boolean, date, array)
   - Validation rules
   - Edge case notes

2. Document **edge cases**:
   - Multiple tenants (3+ plaintiffs)
   - Missing required doc gen fields
   - Date format mismatches
   - Checkbox consolidation (120 → 40)
   - Household member overflow (5 members → 3 slots)

**Deliverables:**
- `intake-field-mapping.csv` (235+ rows)
- `field-mapping-edge-cases.md` (comprehensive edge case doc)

---

### Day 4: Security & Compliance Audit

**Tasks:**
1. **Security hardening plan**:
   - Add reCAPTCHA v3 to intake form
   - Implement request signing (HMAC tokens)
   - Add honeypot fields for bot detection
   - Configure CSP headers
   - Set up input sanitization (sanitize-html library)

2. **Accessibility audit**:
   - Review WCAG 2.1 AA requirements
   - Plan ARIA labels for all form fields
   - Test color contrast ratios
   - Plan keyboard navigation
   - Plan screen reader support

3. **GDPR/Privacy compliance**:
   - Data retention policy (how long keep intakes?)
   - Data export functionality (client requests their data)
   - Data deletion functionality (right to be forgotten)
   - Privacy policy update needed?

**Deliverables:**
- Security checklist (20+ items)
- Accessibility checklist (15+ items)
- Privacy policy updates

---

### Day 5: Environment Setup

**Tasks:**
1. **Create staging environment**:
   - Duplicate production Cloud Run service
   - Create staging database with sample data
   - Configure staging SendGrid/Dropbox
   - Set up staging URLs

2. **Set up development tools**:
   ```bash
   # Install additional dependencies
   npm install --save recaptcha-v3
   npm install --save sanitize-html validator
   npm install --save redis ioredis
   npm install --save-dev @playwright/test artillery

   # Set up TypeScript for services layer
   npm install --save-dev typescript @types/node @types/express
   npx tsc --init
   ```

3. **Create Git branches**:
   ```bash
   git checkout -b refactor/modular-architecture
   git checkout -b feature/intake-database
   git checkout -b feature/intake-form
   git checkout -b feature/attorney-modal
   ```

**Deliverables:**
- ✅ Staging environment live and accessible
- ✅ Development dependencies installed
- ✅ Git workflow established
- ✅ Week 1 ready to start

---

## WEEK 1-2: REFACTORING (10 days)

**Goal:** Modularize existing server.js (3,076 lines → ~250 lines)

**Key Insight from Review:**
- Dropbox service already extracted (line 66)
- Email service already extracted (line 67)
- Focus on routes and middleware extraction only

### Week 1, Day 1-2: Extract Authentication & Validation

**File: `/middleware/auth.js`**
```javascript
/**
 * Authentication middleware
 * Validates ACCESS_TOKEN header
 */
function requireAuth(req, res, next) {
    const token = req.headers['access-token'] ||
                  req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            error: 'No access token provided',
            code: 'AUTH_REQUIRED'
        });
    }

    if (token !== process.env.ACCESS_TOKEN) {
        return res.status(403).json({
            error: 'Invalid access token',
            code: 'AUTH_INVALID'
        });
    }

    // Attach user info for logging
    req.user = {
        authenticated: true,
        timestamp: new Date().toISOString()
    };

    next();
}

/**
 * Optional authentication (allows both authenticated and public)
 */
function optionalAuth(req, res, next) {
    const token = req.headers['access-token'] ||
                  req.headers['authorization']?.replace('Bearer ', '');

    if (token && token === process.env.ACCESS_TOKEN) {
        req.user = { authenticated: true };
    } else {
        req.user = { authenticated: false };
    }

    next();
}

module.exports = {
    requireAuth,
    optionalAuth
};
```

**File: `/middleware/validation.js`**
```javascript
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Input sanitization helpers
 */
const sanitizers = {
    /**
     * Sanitize text input (strip ALL HTML, prevent XSS)
     */
    text: (input) => {
        if (typeof input !== 'string') return '';
        return sanitizeHtml(input, {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'recursiveEscape'
        }).trim();
    },

    /**
     * Sanitize and validate email
     */
    email: (input) => {
        if (typeof input !== 'string') return null;
        const cleaned = input.trim().toLowerCase();
        return validator.isEmail(cleaned) ? cleaned : null;
    },

    /**
     * Sanitize and validate phone number
     */
    phone: (input) => {
        if (typeof input !== 'string') return null;
        // Remove all non-digits
        const cleaned = input.replace(/\D/g, '');
        // Accept 10-digit US phone numbers
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        return null;
    },

    /**
     * Sanitize and validate ZIP code
     */
    zipCode: (input) => {
        if (typeof input !== 'string') return null;
        const cleaned = input.trim();
        // Accept 5-digit or 9-digit (with hyphen) ZIP
        if (/^\d{5}(-\d{4})?$/.test(cleaned)) {
            return cleaned;
        }
        return null;
    },

    /**
     * Sanitize date input
     */
    date: (input) => {
        if (typeof input !== 'string') return null;
        const parsed = new Date(input);
        if (isNaN(parsed.getTime())) return null;
        return parsed.toISOString().split('T')[0]; // YYYY-MM-DD
    }
};
  I need you to perform a thorough technical review of my client intake system 
implementation plan with a SPECIFIC FOCUS on Google Cloud Platform deployment.

**CRITICAL CONTEXT:** 
- Current production system is ALREADY deployed on GCP Cloud Run
- Database: Cloud SQL PostgreSQL
- I need zero-downtime refactoring and deployment
- Solo developer managing everything
- 7-week timeline includes development AND deployment

## GCP-Specific Review Areas:

### 1. Cloud Run Deployment Strategy
- Is gradual traffic splitting the right approach for refactoring phases?
- Should I use Cloud Run revisions with tagged deployments?
- How many concurrent revisions should I keep?
- Should I set min/max instances for the service?
- Is CPU allocation set correctly (only during requests vs always allocated)?
- Do I need to adjust memory limits for the intake system?
- Should I use Cloud Run's built-in load balancing or add Cloud Load Balancer?
- What's the right concurrency setting per instance?

### 2. Cloud SQL PostgreSQL
- How do I safely run migrations on Cloud SQL without downtime?
- Should I use Cloud SQL Proxy for connections or direct connection?
- Is connection pooling configured correctly for Cloud Run's scaling?
- Should I use the built-in pg connection pool or pgBouncer?
- What's the right Cloud SQL tier for this workload?
- Should I enable High Availability (HA) configuration?
- How do I handle the 13 new tables with proper indexes for Cloud SQL?
- Should I use Cloud SQL Insights for monitoring query performance?
- Are there Cloud SQL-specific PostgreSQL settings I should optimize?

### 3. Cloud Build CI/CD Pipeline
- Should I use Cloud Build triggers on GitHub or Cloud Source Repositories?
- Is my cloudbuild.yaml configuration optimal?
- Should I cache Docker layers to speed up builds?
- How do I handle secrets during the build process?
- Should I use substitution variables for environment-specific configs?
- Do I need separate build configs for staging vs production?
- Should builds run tests before deploying?
- How do I implement manual approval gates for production?

### 4. Secret Manager Integration
- Is Secret Manager the right choice vs environment variables?
- How do I mount secrets to Cloud Run efficiently?
- Should I use Secret Manager API in code or environment variable injection?
- What's the performance impact of reading secrets at runtime?
- How do I rotate secrets without redeploying?
- Should ACCESS_TOKEN, SENDGRID_API_KEY, and DATABASE_URL all be in Secret Manager?

### 5. Cloud Storage vs Current Setup
- The plan mentions file uploads - should I use Cloud Storage or stick with Dropbox?
- If Cloud Storage: signed URLs or direct upload?
- What's the cost comparison for legal document storage?
- Should I use Cloud Storage buckets with lifecycle policies?
- Do I need separate buckets for staging and production?

### 6. Cloud Logging & Monitoring
- What Cloud Logging filters should I set up for the new intake system?
- Should I use structured logging for better querying?
- What Cloud Monitoring metrics are critical to track?
- Should I set up log-based metrics for specific errors?
- What alerting policies do I need before refactoring?
- Should I use Error Reporting for tracking exceptions?
- Do I need Cloud Trace for latency analysis?

### 7. Database Migration on Cloud SQL
- How do I test migrations on a Cloud SQL staging instance?
- Should I use Cloud SQL's point-in-time recovery instead of manual backups?
- Can I run migrations during Cloud SQL's maintenance window?
- How do I minimize connection interruptions during migration?
- Should I use Cloud SQL's read replica for testing?
- What's the rollback strategy if migration corrupts data?

### 8. Staging Environment Setup
- Should staging be a separate Cloud Run service or different project?
- Should I use a Cloud SQL clone for staging database?
- How do I keep staging data in sync with production (anonymized)?
- What's the cost of running staging 24/7 vs on-demand?
- Should staging auto-shutdown when not in use?

### 9. Traffic Management During Refactoring
- Week 1-3 refactoring: How do I validate each phase works before 100% traffic?
- Should I use Cloud Run's traffic splitting 10% → 25% → 50% → 100%?
- How long should I monitor each traffic percentage before increasing?
- What metrics indicate it's safe to increase traffic?
- Can I rollback traffic instantly if errors spike?

### 10. Zero-Downtime Deployment Mechanics
- When I deploy a new Cloud Run revision, does the old one stay alive?
- How long does Cloud Run keep old revisions before pruning?
- If a request is in-flight during deployment, what happens?
- For long-running document generation (30+ seconds), how do I prevent interruption?
- Should I implement graceful shutdown handlers?

### 11. Cost Analysis
- What are the GCP cost implications of:
  - Running staging environment 24/7
  - 13 new database tables with indexes
  - Cloud Build runs on every commit
  - Secret Manager API calls
  - Cloud Logging retention
  - Cloud Run with increased memory/CPU
- Should I set up billing alerts and budgets?
- Are there cost optimization opportunities I'm missing?

### 12. Security & IAM
- What IAM roles does Cloud Run need for:
  - Cloud SQL access
  - Secret Manager access
  - Cloud Storage access (if used)
- Should Cloud Run use default service account or custom one?
- How do I ensure least-privilege access?
- Should I enable VPC Service Controls?
- Do I need Cloud Armor for DDoS protection?

### 13. Disaster Recovery
- What's my RTO (Recovery Time Objective) and RPO (Recovery Point Objective)?
- How do I backup the entire system (code + database + config)?
- Should I enable Cloud SQL automated backups (daily)?
- How do I test disaster recovery procedures?
- Should I have a multi-region failover plan?

### 14. Performance Considerations
- Will 13 new tables slow down Cloud SQL on current tier?
- Should I use Cloud SQL's query insights before/after migration?
- Do I need Cloud CDN for static assets?
- Should I implement Cloud Memorystore (Redis) for caching?
- What's the expected latency for intake searches with filters?

### 15. Specific GCP Gotchas
- Cloud Run cold starts - will this affect user experience?
- Cloud SQL connection limits - am I hitting them with Cloud Run scaling?
- Cloud Build timeout limits - will builds complete in time?
- Cloud Run request timeout (default 5 min) - enough for document generation?
- Cloud SQL storage autoscaling - should I enable it?

### 16. Week-by-Week Deployment Questions
- **Week 1 (Doc Routes):** Can I deploy to Cloud Run without touching Cloud SQL?
- **Week 2 (Form Routes):** Same as Week 1?
- **Week 3 (DB Refactor):** Does extracting db/connection.js require redeployment?
- **Week 4 (Database):** How do I run Cloud SQL migration with zero downtime?
- **Week 5 (Client Form):** Just Cloud Run deployment, right?
- **Week 6 (Attorney Modal):** Just Cloud Run deployment?
- **Week 7 (Testing):** What's the final production deployment checklist?

### 17. Monitoring the Refactoring
- What Cloud Monitoring dashboards should I create?
- Should I track before/after metrics for each phase?
- How do I know if refactoring degraded performance?
- Should I use Cloud Profiler to compare old vs new code?

### 18. Missing GCP Services
- Should I use Cloud Tasks for async document generation?
- Should I use Cloud Scheduler for periodic cleanup jobs?
- Do I need Pub/Sub for event-driven architecture?
- Should I use Cloud Functions for any part of this?

### 19. Code-Level GCP Integration
- Is my database connection pooling correct for Cloud Run?
- Should I use @google-cloud/logging for structured logs?
- Am I handling Cloud Run's SIGTERM signal for graceful shutdown?
- Should I use Cloud Run's health checks endpoint?

### 20. Production Readiness Checklist
- What GCP-specific checks should I do before each deployment?
- How do I validate Cloud Run service is healthy post-deployment?
- Should I implement smoke tests that run after deployment?
- What's the rollback procedure if Cloud Monitoring shows errors?

Please be brutally honest about:
- GCP-specific risks I'm not considering
- Better ways to use GCP services for this use case
- Cost optimization opportunities
- Security vulnerabilities in my GCP setup
- Performance bottlenecks specific to Cloud Run + Cloud SQL
- Any GCP limits or quotas I might hit
- Whether my 7-week timeline accounts for GCP deployment complexity

I want to know if this plan will actually work on GCP or if I'm missing critical pieces!
/**
 * Validation middleware factory
 */
function validateIntake(req, res, next) {
    const errors = [];

    // Required fields validation
    const required = ['first_name', 'last_name', 'email_address', 'primary_phone'];
    for (const field of required) {
        if (!req.body[field] || !String(req.body[field]).trim()) {
            errors.push(`${field} is required`);
        }
    }

    // Email validation
    if (req.body.email_address && !sanitizers.email(req.body.email_address)) {
        errors.push('Invalid email address format');
    }

    // Phone validation
    if (req.body.primary_phone && !sanitizers.phone(req.body.primary_phone)) {
        errors.push('Invalid phone number format (must be 10 digits)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
}

module.exports = {
    sanitizers,
    validateIntake
};
```

**Testing:**
```bash
# Create test file
cat > middleware/validation.test.js << 'EOF'
const { sanitizers } = require('./validation');

console.log('Testing sanitizers...');
console.log('XSS:', sanitizers.text('<script>alert("xss")</script>'));
console.log('Email:', sanitizers.email('  TEST@EXAMPLE.COM  '));
console.log('Phone:', sanitizers.phone('555-123-4567'));
console.log('ZIP:', sanitizers.zipCode('90210'));
EOF

node middleware/validation.test.js
```

**Deliverables:**
- ✅ `/middleware/auth.js` created and tested
- ✅ `/middleware/validation.js` created with sanitizers
- ✅ Unit tests pass

---

### Week 1, Day 3-5: Extract Database Connection

**File: `/db/connection.js`**
```javascript
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    // Increased from 20 to 50 for intake load
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 10000 // 10 seconds
});

// Pool error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Health check helper
async function checkHealth() {
    try {
        const result = await pool.query('SELECT NOW()');
        return { healthy: true, timestamp: result.rows[0].now };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

// Export query methods
module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
    checkHealth
};
```

**File: `/db/migrations/utils.js`**
```javascript
const db = require('../connection');
const fs = require('fs');
const path = require('path');

/**
 * Run migration with transaction and rollback support
 */
async function runMigration(migrationName) {
    console.log(`📦 Running migration: ${migrationName}`);

    const client = await db.getClient();

    try {
        // Start transaction
        await client.query('BEGIN');

        // Read migration file
        const migrationPath = path.join(__dirname, `${migrationName}.sql`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await client.query(sql);

        // Commit transaction
        await client.query('COMMIT');

        console.log(`✅ Migration ${migrationName} completed successfully`);
        return { success: true };

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${migrationName} failed:`, error.message);
        return { success: false, error };

    } finally {
        client.release();
    }
}

/**
 * Create backup of table before migration
 */
async function createBackup(tableName) {
    const backupName = `_backup_${tableName}_${Date.now()}`;
    console.log(`💾 Creating backup: ${backupName}`);

    try {
        await db.query(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableName}`);
        console.log(`✅ Backup created: ${backupName}`);
        return backupName;
    } catch (error) {
        console.error(`❌ Backup failed:`, error.message);
        throw error;
    }
}

/**
 * Restore from backup
 */
async function restoreBackup(backupName, tableName) {
    console.log(`🔄 Restoring ${tableName} from ${backupName}`);

    const client = await db.getClient();

    try {
        await client.query('BEGIN');
        await client.query(`DROP TABLE IF EXISTS ${tableName}`);
        await client.query(`ALTER TABLE ${backupName} RENAME TO ${tableName}`);
        await client.query('COMMIT');

        console.log(`✅ Restored successfully`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Restore failed:`, error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    runMigration,
    createBackup,
    restoreBackup
};
```

**Deliverables:**
- ✅ `/db/connection.js` created with health check
- ✅ Connection pool increased to 50
- ✅ Migration utilities with backup/restore

---

### Week 2, Day 1-3: Extract Routes

**File: `/routes/forms.js`** (existing form submissions)
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Extract existing form submission logic from server.js
// Keep all existing functionality intact

router.post('/', requireAuth, async (req, res) => {
    // Move existing POST /api/form-entries logic here
});

router.get('/', requireAuth, async (req, res) => {
    // Move existing GET /api/form-entries logic here
});

module.exports = router;
```

**File: `/routes/documents.js`** (existing doc generation)
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Extract existing document generation logic from server.js
// Keep Python pipeline integration intact

router.post('/generate', requireAuth, async (req, res) => {
    // Move existing document generation logic here
});

module.exports = router;
```

**Deliverables:**
- ✅ `/routes/forms.js` extracted
- ✅ `/routes/documents.js` extracted
- ✅ All existing tests pass

---

### Week 2, Day 4-5: Refactor server.js

**File: `/server.js` (AFTER refactoring - target: ~250 lines)**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Validation
const envValidator = require('./config/env-validator');
envValidator.validate();

// Services
const dropboxService = require('./dropbox-service');
const emailService = require('./email-service');

// Monitoring
const logger = require('./monitoring/logger');
const { requestLoggingMiddleware, errorLoggingMiddleware } = require('./monitoring/log-middleware');
const { metricsMiddleware } = require('./monitoring/middleware');
const { checkLiveness, checkReadiness, checkDetailed } = require('./monitoring/health-checks');

// Routes
const formRoutes = require('./routes/forms');
const documentRoutes = require('./routes/documents');
// Intake routes will be added in Week 3+

// Middleware
const { optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(compression());
app.use(morgan('combined'));
app.use(requestLoggingMiddleware);
app.use(metricsMiddleware);

// ============================================
// HEALTH CHECKS (No Auth)
// ============================================
app.get('/health', async (req, res) => {
    const health = await checkLiveness();
    res.status(health.healthy ? 200 : 503).json(health);
});

app.get('/health/ready', async (req, res) => {
    const health = await checkReadiness();
    res.status(health.ready ? 200 : 503).json(health);
});

app.get('/health/detailed', async (req, res) => {
    const health = await checkDetailed();
    res.json(health);
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/form-entries', formRoutes);
app.use('/api/documents', documentRoutes);
// app.use('/api/intakes', intakeRoutes); // Week 3+

// ============================================
// STATIC FILES & FRONTEND
// ============================================
app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use(errorLoggingMiddleware);

app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // For testing
```

**Deliverables:**
- ✅ server.js reduced to ~250 lines
- ✅ All routes properly extracted
- ✅ All existing functionality works
- ✅ Zero production downtime

---

## WEEK 2.5: INTEGRATION TESTING CHECKPOINT (3 days)

**Goal:** Validate refactoring didn't break anything

### Day 1: Automated Testing

**Tasks:**
1. Run all existing tests
2. Add integration tests for new routes
3. Test on staging environment

```bash
# Run full test suite
npm test

# Test document generation flow
curl -X POST http://localhost:3000/api/documents/generate \
  -H "Access-Token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-payload.json

# Test form submission
curl -X POST http://localhost:3000/api/form-entries \
  -H "Access-Token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-form.json
```

**Deliverables:**
- ✅ All tests pass
- ✅ No regressions found

---

### Day 2: Manual UAT

**UAT Checklist:**
- [ ] Can access main form (index.html)
- [ ] Can submit form entry
- [ ] Can generate documents
- [ ] Can view submissions
- [ ] Emails send correctly
- [ ] Files upload to Dropbox
- [ ] Python pipeline triggers
- [ ] Health checks respond

**Deliverables:**
- ✅ UAT sign-off
- ✅ Bug list (if any) addressed

---

### Day 3: Performance Baseline

**Tasks:**
1. Measure current performance metrics
2. Document baseline for comparison

```bash
# Install load testing tool
npm install -g artillery

# Create load test config
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/health"
      - post:
          url: "/api/form-entries"
          headers:
            Access-Token: "${ACCESS_TOKEN}"
          json:
            test: "data"
EOF

# Run load test
artillery run load-test.yml
```

**Deliverables:**
- ✅ Baseline metrics documented
- ✅ No performance regressions
- ✅ Ready for Week 3

---

## WEEK 3: DATABASE SETUP (7 days)

**Goal:** Create streamlined 5-table schema with JSONB

### Schema Overview (5 Tables)

```sql
1. client_intakes (main table + JSONB fields)
2. intake_uploaded_files (file metadata)
3. intake_assignments (attorney assignment tracking)
4. intake_drafts (auto-save support)
5. intake_audit_log (status changes, access log)
```

### Day 1-2: Create Migration Script

**File: `/db/migrations/001_create_intake_tables.sql`**

(See next section for full schema)

### Day 3: Test Migration on Staging

**Tasks:**
```bash
# Create backup first
node db/migrations/utils.js backup client_intakes

# Run migration on staging
node db/migrations/run-migration.js 001_create_intake_tables

# Verify tables created
psql $DATABASE_URL -c "\dt intake_*"

# Verify indexes
psql $DATABASE_URL -c "\di intake_*"

# Test insert
psql $DATABASE_URL << 'EOF'
INSERT INTO client_intakes (
    first_name, last_name, email_address, primary_phone,
    current_address, household_members, building_issues
) VALUES (
    'Test', 'Client', 'test@example.com', '555-1234',
    '{"street": "123 Main St", "city": "LA", "state": "CA", "zip": "90001"}'::jsonb,
    '[{"firstName": "Jane", "relationship": "spouse"}]'::jsonb,
    '{"structural": {"ceilingDamage": true}}'::jsonb
);
EOF
```

**Deliverables:**
- ✅ Migration runs successfully on staging
- ✅ Sample data inserted
- ✅ Indexes perform well

---

### Day 4-5: Create Intake Service

**File: `/services/intake-service.js`**

(TypeScript version - see below)

### Day 6-7: Create Validation & Testing

**Deliverables:**
- ✅ Intake service complete
- ✅ CRUD operations tested
- ✅ Unit tests at 80%+ coverage

---

## WEEK 4-5: CLIENT INTAKE FORM (14 days)

**Goal:** Build 5-page hybrid form with 235+ fields

### Week 4, Day 1-3: Form Structure & Navigation

**File: `/public/intake-form.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Intake Form - Lipton Legal</title>
    <link rel="stylesheet" href="css/intake-form.css">
</head>
<body>
    <div class="intake-container">

        <!-- Progress Stepper (5 pages) -->
        <div class="progress-stepper" role="navigation" aria-label="Form progress">
            <div class="step active" data-page="1" aria-current="step">
                <div class="step-number" aria-label="Step 1">1</div>
                <div class="step-label">Personal & Contact</div>
            </div>
            <div class="step" data-page="2">
                <div class="step-number" aria-label="Step 2">2</div>
                <div class="step-label">Building Issues</div>
            </div>
            <div class="step" data-page="3">
                <div class="step-number" aria-label="Step 3">3</div>
                <div class="step-label">Safety & Health</div>
            </div>
            <div class="step" data-page="4">
                <div class="step-number" aria-label="Step 4">4</div>
                <div class="step-label">Landlord & Legal</div>
            </div>
            <div class="step" data-page="5">
                <div class="step-number" aria-label="Step 5">5</div>
                <div class="step-label">Documentation</div>
            </div>
        </div>

        <!-- Auto-save indicator -->
        <div class="auto-save-status" role="status" aria-live="polite">
            <span class="save-icon">💾</span>
            <span class="save-text">All changes saved</span>
        </div>

        <!-- Form Pages -->
        <form id="intake-form" novalidate>

            <!-- Page 1: Personal & Contact -->
            <div class="form-page active" data-page="1" role="region" aria-label="Personal and contact information">
                <h2>Personal & Contact Information</h2>

                <!-- Section 1: Personal Information -->
                <fieldset class="form-section">
                    <legend>1. Personal Information</legend>

                    <div class="form-row">
                        <div class="form-field">
                            <label for="firstName">
                                First Name
                                <span class="required" aria-label="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                required
                                aria-required="true"
                                aria-describedby="firstName-error"
                                autocomplete="given-name"
                            >
                            <span id="firstName-error" class="error-message" role="alert"></span>
                        </div>

                        <div class="form-field">
                            <label for="lastName">
                                Last Name
                                <span class="required" aria-label="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                required
                                aria-required="true"
                                aria-describedby="lastName-error"
                                autocomplete="family-name"
                            >
                            <span id="lastName-error" class="error-message" role="alert"></span>
                        </div>
                    </div>

                    <!-- ... more fields for section 1 ... -->
                </fieldset>

                <!-- Section 2-5 continue... -->

            </div>

            <!-- Pages 2-5 continue with same pattern... -->

            <!-- Navigation Buttons -->
            <div class="form-navigation" role="navigation" aria-label="Form navigation">
                <button
                    type="button"
                    class="btn-secondary"
                    id="btn-previous"
                    style="display: none;"
                    aria-label="Go to previous page"
                >
                    ← Previous
                </button>

                <button
                    type="button"
                    class="btn-outline"
                    id="btn-save-later"
                    aria-label="Save progress and continue later"
                >
                    💾 Save & Continue Later
                </button>

                <button
                    type="button"
                    class="btn-primary"
                    id="btn-next"
                    aria-label="Go to next page"
                >
                    Next →
                </button>

                <button
                    type="submit"
                    class="btn-success"
                    id="btn-submit"
                    style="display: none;"
                    aria-label="Submit intake form"
                >
                    Submit Application
                </button>
            </div>

        </form>

    </div>

    <!-- reCAPTCHA v3 -->
    <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>

    <script src="js/intake-form.js"></script>
</body>
</html>
```

**Deliverables:**
- ✅ HTML structure for all 5 pages
- ✅ All 235+ fields added
- ✅ ARIA labels and accessibility
- ✅ Progress stepper

---

### Week 4, Day 4-5: Auto-Save with IndexedDB

**File: `/public/js/intake-storage.js`**

```javascript
/**
 * Intake Form Storage Manager
 * Uses IndexedDB as primary storage, localStorage as fallback
 */
class IntakeStorage {
    constructor() {
        this.dbName = 'lipton-intake';
        this.storeName = 'drafts';
        this.db = null;
        this.sessionId = this.generateSessionId();
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => {
                console.warn('IndexedDB failed, falling back to localStorage');
                this.db = null;
                resolve(false);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Save draft (auto-save every 5 seconds)
     */
    async saveDraft(formData) {
        const draft = {
            id: 'current',
            sessionId: this.sessionId,
            data: formData,
            timestamp: new Date().toISOString(),
            currentPage: formData._currentPage || 1
        };

        // Try IndexedDB first
        if (this.db) {
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                await store.put(draft);

                this.showSaveStatus('saved');
                return true;
            } catch (error) {
                console.warn('IndexedDB save failed:', error);
            }
        }

        // Fallback to localStorage
        try {
            localStorage.setItem('intake-draft', JSON.stringify(draft));
            this.showSaveStatus('saved');
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            this.showSaveStatus('error');
            return false;
        }
    }

    /**
     * Load saved draft
     */
    async loadDraft() {
        // Try IndexedDB first
        if (this.db) {
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('current');

                return new Promise((resolve) => {
                    request.onsuccess = () => {
                        resolve(request.result || null);
                    };
                    request.onerror = () => {
                        resolve(null);
                    };
                });
            } catch (error) {
                console.warn('IndexedDB load failed:', error);
            }
        }

        // Fallback to localStorage
        try {
            const saved = localStorage.getItem('intake-draft');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Load failed:', error);
            return null;
        }
    }

    /**
     * Clear draft after successful submission
     */
    async clearDraft() {
        if (this.db) {
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                await store.delete('current');
            } catch (error) {
                console.warn('IndexedDB clear failed:', error);
            }
        }

        localStorage.removeItem('intake-draft');
    }

    /**
     * Generate unique session ID (for tracking abandoned forms)
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Show save status indicator
     */
    showSaveStatus(status) {
        const indicator = document.querySelector('.auto-save-status');
        if (!indicator) return;

        const icon = indicator.querySelector('.save-icon');
        const text = indicator.querySelector('.save-text');

        if (status === 'saved') {
            icon.textContent = '✅';
            text.textContent = 'All changes saved';
            indicator.classList.add('success');
            indicator.classList.remove('error', 'saving');
        } else if (status === 'saving') {
            icon.textContent = '⏳';
            text.textContent = 'Saving...';
            indicator.classList.add('saving');
            indicator.classList.remove('error', 'success');
        } else if (status === 'error') {
            icon.textContent = '⚠️';
            text.textContent = 'Save failed';
            indicator.classList.add('error');
            indicator.classList.remove('success', 'saving');
        }
    }
}
```

**Deliverables:**
- ✅ IndexedDB storage implemented
- ✅ Auto-save every 5 seconds
- ✅ Save status indicator
- ✅ Cross-browser tested

---

### Week 5, Day 1-5: Complete All Form Fields

**Tasks:**
1. Implement all 235+ fields across 5 pages
2. Add conditional field logic
3. Implement real-time validation
4. Add accessibility testing

**Field Implementation Priority:**

**Page 1 (47 fields):**
- Personal information (10)
- Contact information (12)
- Current address (8)
- Property information (12)
- Tenancy details (5)

**Page 2 (60 fields):**
- Structural issues (16)
- Plumbing issues (19)
- Electrical issues (16)
- HVAC issues (9)

**Page 3 (54 fields):**
- Security issues (14)
- Pest/vermin issues (25)
- Environmental hazards (15)

**Page 4 (48 fields):**
- Household members (dynamic, 8 fields × N)
- Landlord information (10)
- Property management (8)
- Harassment/retaliation (17)
- Maintenance response (5)

**Page 5 (26 fields):**
- Available documents (16)
- Damages & relief (10)

**Deliverables:**
- ✅ All 5 pages complete
- ✅ 235+ fields implemented
- ✅ Validation working
- ✅ Mobile responsive

---

## WEEK 6: ATTORNEY MODAL (7 days)

**Goal:** Build 960×720px split-pane modal with search

### Day 1-2: Modal Structure

**File: `/public/js/intake-modal.js`**

```javascript
/**
 * Attorney Intake Search Modal
 * 960×720px centered modal with split-pane view
 */
class IntakeModal {
    constructor() {
        this.isOpen = false;
        this.selectedIntake = null;
        this.intakes = [];
        this.currentFilters = {
            search: '',
            status: '',
            dateRange: 30,
            sort: 'newest'
        };
    }

    /**
     * Open modal
     */
    async open() {
        const modal = document.getElementById('intake-search-modal');
        modal.style.display = 'flex'; // Flex for centering
        this.isOpen = true;

        // Load intakes
        await this.loadIntakes();

        // Trap focus in modal
        this.trapFocus(modal);
    }

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById('intake-search-modal');
        modal.style.display = 'none';
        this.isOpen = false;
        this.selectedIntake = null;
    }

    /**
     * Load intakes from API
     */
    async loadIntakes() {
        this.showLoading();

        try {
            // Build query string
            const params = new URLSearchParams();
            if (this.currentFilters.search) {
                params.append('search', this.currentFilters.search);
            }
            if (this.currentFilters.status) {
                params.append('status', this.currentFilters.status);
            }
            if (this.currentFilters.dateRange !== 'all') {
                const dateFrom = new Date();
                dateFrom.setDate(dateFrom.getDate() - parseInt(this.currentFilters.dateRange));
                params.append('dateFrom', dateFrom.toISOString());
            }
            params.append('sort', this.currentFilters.sort === 'newest' ? 'created_at DESC' : 'created_at ASC');
            params.append('limit', '50');

            // Fetch intakes
            const response = await fetch(`/api/intakes?${params}`, {
                headers: {
                    'Access-Token': localStorage.getItem('ACCESS_TOKEN')
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.intakes = await response.json();

            // Render results
            this.renderIntakes();

        } catch (error) {
            console.error('Load intakes failed:', error);
            this.showError('Failed to load intakes. Please try again.');
        }
    }

    /**
     * Render intake list (left pane)
     */
    renderIntakes() {
        const listPane = document.getElementById('intake-list-pane');

        if (this.intakes.length === 0) {
            listPane.innerHTML = `
                <div class="empty-state">
                    <p>No intakes found matching your search.</p>
                    <p>Try adjusting your filters.</p>
                </div>
            `;
            return;
        }

        const rows = this.intakes.map(intake => {
            const statusBadge = this.getStatusBadge(intake.intake_status);
            const submittedDate = new Date(intake.created_at).toLocaleDateString();

            return `
                <div class="intake-row ${this.selectedIntake?.id === intake.id ? 'selected' : ''}"
                     data-id="${intake.id}"
                     role="button"
                     tabindex="0"
                     aria-label="Intake from ${intake.first_name} ${intake.last_name}"
                     onclick="intakeModal.selectIntake('${intake.id}')"
                     onkeypress="if(event.key==='Enter') intakeModal.selectIntake('${intake.id}')">

                    <div class="row-header">
                        <strong>${intake.first_name} ${intake.last_name}</strong>
                        ${statusBadge}
                    </div>

                    <div class="row-details">
                        <span class="address">${intake.property_street_address || intake.current_street_address}</span>
                        <span class="date">${submittedDate}</span>
                    </div>
                </div>
            `;
        }).join('');

        listPane.innerHTML = rows;
    }

    /**
     * Select intake and show preview (right pane)
     */
    async selectIntake(intakeId) {
        this.selectedIntake = this.intakes.find(i => i.id === intakeId);

        // Update list selection state
        this.renderIntakes();

        // Load full details
        this.showPreviewLoading();

        try {
            const response = await fetch(`/api/intakes/${intakeId}`, {
                headers: {
                    'Access-Token': localStorage.getItem('ACCESS_TOKEN')
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load intake details');
            }

            const fullIntake = await response.json();
            this.renderPreview(fullIntake);

        } catch (error) {
            console.error('Load intake details failed:', error);
            this.showPreviewError();
        }
    }

    /**
     * Render preview pane (right side)
     */
    renderPreview(intake) {
        const previewPane = document.getElementById('intake-preview-pane');

        previewPane.innerHTML = `
            <div class="preview-header">
                <h3>${intake.first_name} ${intake.last_name}</h3>
                <span class="intake-number">${intake.intake_number}</span>
            </div>

            <div class="preview-body">
                <!-- Contact -->
                <div class="preview-section">
                    <h4>Contact Information</h4>
                    <p><strong>Email:</strong> ${intake.email_address}</p>
                    <p><strong>Phone:</strong> ${intake.primary_phone}</p>
                </div>

                <!-- Address -->
                <div class="preview-section">
                    <h4>Property Address</h4>
                    <p>${intake.current_address.street}</p>
                    <p>${intake.current_address.city}, ${intake.current_address.state} ${intake.current_address.zip}</p>
                </div>

                <!-- Issues Summary -->
                <div class="preview-section">
                    <h4>Building Issues</h4>
                    <ul>
                        ${this.renderIssuesSummary(intake.building_issues)}
                    </ul>
                </div>

                <!-- Household -->
                ${intake.household_members && intake.household_members.length > 0 ? `
                    <div class="preview-section">
                        <h4>Household Members (${intake.household_members.length})</h4>
                        <ul>
                            ${intake.household_members.map(m => `
                                <li>${m.firstName} ${m.lastName} (${m.relationship})</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>

            <div class="preview-footer">
                <button class="btn-primary" onclick="intakeModal.loadIntoForm('${intake.id}')">
                    Load into Form →
                </button>
            </div>
        `;
    }

    /**
     * Load intake into doc gen form
     */
    async loadIntoForm(intakeId) {
        try {
            // Fetch in doc-gen format
            const response = await fetch(`/api/intakes/${intakeId}/doc-gen-format`, {
                headers: {
                    'Access-Token': localStorage.getItem('ACCESS_TOKEN')
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load intake for doc gen');
            }

            const docGenData = await response.json();

            // Populate form fields
            this.populateDocGenForm(docGenData);

            // Close modal
            this.close();

            // Show success notification
            this.showNotification('Intake loaded successfully! Review and edit as needed.', 'success');

        } catch (error) {
            console.error('Load into form failed:', error);
            alert('Failed to load intake. Please try again.');
        }
    }

    /**
     * Populate doc gen form fields
     */
    populateDocGenForm(data) {
        // Property fields
        const fieldMapping = {
            'property-address': data['property-address'],
            'apartment-unit': data['apartment-unit'],
            'city': data['city'],
            'state': data['state'],
            'zip-code': data['zip-code'],
            'plaintiff-1-firstname': data['plaintiff-1-firstname'],
            'plaintiff-1-lastname': data['plaintiff-1-lastname'],
            'defendant-1-name': data['defendant-1-name']
        };

        // Populate text fields
        for (const [fieldId, value] of Object.entries(fieldMapping)) {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
                // Trigger change event for validation
                field.dispatchEvent(new Event('change'));
            }
        }

        // Populate checkboxes (issue tracking)
        for (const [fieldName, value] of Object.entries(data)) {
            if (fieldName.startsWith('issue-') && value === true) {
                const checkbox = document.querySelector(`input[name="${fieldName}"]`);
                if (checkbox && checkbox.type === 'checkbox') {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        }

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Helper: Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-new">🔴 New</span>',
            'under_review': '<span class="badge badge-review">⚡ Under Review</span>',
            'approved': '<span class="badge badge-approved">✓ Approved</span>',
            'rejected': '<span class="badge badge-rejected">✗ Rejected</span>',
            'assigned': '<span class="badge badge-assigned">📌 Assigned</span>'
        };
        return badges[status] || `<span class="badge">${status}</span>`;
    }

    // ... additional helper methods ...
}

// Initialize global instance
const intakeModal = new IntakeModal();
```

**Deliverables:**
- ✅ Modal opens/closes smoothly
- ✅ Split-pane layout (460px list + 500px preview)
- ✅ Search and filtering work
- ✅ Preview pane shows full details
- ✅ "Load into Form" populates correctly

---

### Day 3-5: Modal Styling

**File: `/public/css/intake-modal.css`**

```css
/* Intake Search Modal */

.modal-overlay {
    display: none; /* Hidden by default */
    position: fixed;
    z-index: 9999;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);

    /* Flex for centering */
    justify-content: center;
    align-items: center;

    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    position: relative;
    background-color: white;
    width: 960px;
    height: 720px;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

    display: flex;
    flex-direction: column;

    /* Prevent overflow */
    overflow: hidden;

    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        transform: translateY(50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Modal Header */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 2px solid #e0e0e0;
    background: linear-gradient(135deg, #1F2A44 0%, #2A3B5A 100%);
    color: white;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.modal-close {
    font-size: 32px;
    font-weight: bold;
    color: rgba(255,255,255,0.8);
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    transition: color 0.2s;
}

.modal-close:hover,
.modal-close:focus {
    color: white;
    outline: 2px solid white;
    outline-offset: 2px;
}

/* Search Controls */
.search-controls {
    padding: 16px 24px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
}

.search-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.search-bar input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.search-bar input:focus {
    outline: none;
    border-color: #00AEEF;
    box-shadow: 0 0 0 2px rgba(0,174,239,0.1);
}

.search-bar button {
    padding: 10px 20px;
    background: #00AEEF;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
}

.search-bar button:hover {
    background: #0098d1;
}

.filter-row {
    display: flex;
    gap: 12px;
}

.filter-row select {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    background: white;
}

/* Split Pane Layout */
.modal-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* Left Pane: Intake List */
.intake-list-pane {
    width: 460px;
    border-right: 1px solid #e0e0e0;
    overflow-y: auto;
    background: white;
}

.intake-row {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background 0.2s;
}

.intake-row:hover {
    background: #f8f9fa;
}

.intake-row:focus {
    outline: 2px solid #00AEEF;
    outline-offset: -2px;
}

.intake-row.selected {
    background: #e3f2fd;
    border-left: 4px solid #00AEEF;
}

.row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.row-header strong {
    font-size: 15px;
    color: #1F2A44;
}

.row-details {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #666;
}

.row-details .address {
    flex: 1;
}

.row-details .date {
    color: #999;
}

/* Status Badges */
.badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-new {
    background: #ffebee;
    color: #c62828;
}

.badge-review {
    background: #fff3e0;
    color: #ef6c00;
}

.badge-approved {
    background: #e8f5e9;
    color: #2e7d32;
}

.badge-rejected {
    background: #fce4ec;
    color: #c2185b;
}

.badge-assigned {
    background: #e3f2fd;
    color: #1976d2;
}

/* Right Pane: Preview */
.intake-preview-pane {
    flex: 1;
    overflow-y: auto;
    background: #fafafa;
    padding: 24px;
}

.preview-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e0e0e0;
}

.preview-header h3 {
    margin: 0 0 8px 0;
    font-size: 22px;
    color: #1F2A44;
}

.intake-number {
    display: inline-block;
    padding: 4px 12px;
    background: #1F2A44;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
}

.preview-section {
    background: white;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.preview-section h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: #1F2A44;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 8px;
}

.preview-section p {
    margin: 8px 0;
    font-size: 14px;
    color: #333;
}

.preview-section ul {
    margin: 8px 0;
    padding-left: 20px;
}

.preview-section li {
    margin: 4px 0;
    font-size: 14px;
    color: #555;
}

.preview-footer {
    position: sticky;
    bottom: 0;
    background: white;
    padding: 16px;
    border-top: 2px solid #e0e0e0;
    text-align: right;
}

.preview-footer .btn-primary {
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
}

/* Mobile Responsive (< 768px) */
@media (max-width: 768px) {
    .modal-content {
        width: 100%;
        height: 100%;
        border-radius: 0;
    }

    .modal-body {
        flex-direction: column;
    }

    .intake-list-pane {
        width: 100%;
        height: 50%;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
    }

    .intake-preview-pane {
        height: 50%;
    }
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
}

.empty-state p {
    margin: 8px 0;
    font-size: 15px;
}

/* Loading State */
.loading-state {
    text-align: center;
    padding: 60px 20px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f0f0f0;
    border-top-color: #00AEEF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

**Deliverables:**
- ✅ Professional modal styling
- ✅ Split-pane layout works
- ✅ Mobile responsive (stacked panes)
- ✅ Smooth animations

---

### Day 6-7: Accessibility & Testing

**Tasks:**
1. Keyboard navigation (Tab, Enter, Escape)
2. Screen reader testing (VoiceOver/NVDA)
3. Color contrast validation (4.5:1 minimum)
4. Focus trap in modal
5. ARIA labels verification

**Accessibility Checklist:**
- [ ] Modal opens on click or Enter key
- [ ] Modal closes on Escape key
- [ ] Focus trapped in modal when open
- [ ] Focus returns to trigger button on close
- [ ] All interactive elements keyboard accessible
- [ ] Status badges have aria-label
- [ ] Selected intake announced to screen reader
- [ ] Loading states announced (aria-live)
- [ ] Color contrast meets WCAG 2.1 AA

**Deliverables:**
- ✅ All accessibility checks pass
- ✅ Keyboard navigation works perfectly
- ✅ Screen reader announces all state changes

---

## WEEK 7: FIELD MAPPING SERVICE (7 days)

**Goal:** Build robust mapping with edge case handling

### Day 1-3: Mapping Configuration

**File: `/config/intake-field-mapping.ts`** (TypeScript for type safety)

```typescript
/**
 * Field Mapping Configuration
 * Maps intake data to doc gen format with validation
 */

export interface IntakeData {
    // Personal
    first_name: string;
    last_name: string;
    middle_name?: string;
    date_of_birth?: string;

    // Contact
    email_address: string;
    primary_phone: string;

    // Address (JSONB)
    current_address: {
        street: string;
        unit?: string;
        city: string;
        state: string;
        zip: string;
        county?: string;
    };

    property_address?: {
        street: string;
        unit?: string;
        city: string;
        state: string;
        zip: string;
        county?: string;
    };

    // Household (JSONB array)
    household_members?: Array<{
        firstName: string;
        lastName: string;
        relationship: string;
        age?: number;
    }>;

    // Landlord
    landlord_name?: string;
    landlord_type?: string;

    // Issues (JSONB)
    building_issues?: {
        structural?: {
            ceilingDamage?: boolean;
            wallCracks?: boolean;
            floorDamage?: boolean;
            // ... 100+ more
        };
        plumbing?: {
            cloggedDrains?: boolean;
            leaks?: boolean;
            // ... more
        };
        // ... more categories
    };
}

export interface DocGenData {
    // Property
    'property-address': string;
    'apartment-unit'?: string;
    'city': string;
    'state': string;
    'zip-code': string;
    'filing-county'?: string;

    // Plaintiffs
    'plaintiff-1-firstname': string;
    'plaintiff-1-lastname': string;
    'plaintiff-2-firstname'?: string;
    'plaintiff-2-lastname'?: string;
    'plaintiff-3-firstname'?: string;
    'plaintiff-3-lastname'?: string;

    // Defendants
    'defendant-1-name': string;
    'defendant-1-entity-type'?: string;

    // Issues (checkboxes)
    'issue-structural-ceiling'?: boolean;
    'issue-structural-walls'?: boolean;
    'issue-plumbing-clogs'?: boolean;
    // ... 40+ more issue fields
}

export interface MappingResult {
    data: Partial<DocGenData>;
    confidence: number; // 0-100
    warnings: string[];
    errors: string[];
    unmapped: string[];
}

/**
 * Simple 1:1 field mappings
 */
export const SIMPLE_MAPPINGS: Record<string, string> = {
    // Personal
    'first_name': 'plaintiff-1-firstname',
    'last_name': 'plaintiff-1-lastname',

    // Contact
    'email_address': 'plaintiff-1-email',
    'primary_phone': 'plaintiff-1-phone',

    // Landlord
    'landlord_name': 'defendant-1-name'
};

/**
 * Address mapping with fallback logic
 */
export function mapAddress(intake: IntakeData): {
    address: Partial<DocGenData>;
    warnings: string[];
} {
    const warnings: string[] = [];

    // Prefer property address, fall back to current address
    const sourceAddress = intake.property_address || intake.current_address;

    if (!sourceAddress) {
        warnings.push('No address provided - manual entry required');
        return {
            address: {},
            warnings
        };
    }

    // Check if same as current address
    if (!intake.property_address && intake.current_address) {
        warnings.push('Using current address as property address (verify with client)');
    }

    return {
        address: {
            'property-address': sourceAddress.street,
            'apartment-unit': sourceAddress.unit,
            'city': sourceAddress.city,
            'state': sourceAddress.state,
            'zip-code': sourceAddress.zip,
            'filing-county': sourceAddress.county
        },
        warnings
    };
}

/**
 * Household member mapping with overflow handling
 */
export function mapHouseholdMembers(intake: IntakeData): {
    plaintiffs: Partial<DocGenData>;
    warnings: string[];
} {
    const warnings: string[] = [];
    const plaintiffs: Partial<DocGenData> = {};

    if (!intake.household_members || intake.household_members.length === 0) {
        return { plaintiffs, warnings };
    }

    // Map first 2 household members as additional plaintiffs
    // (plaintiff-1 is the client themselves)
    const maxAdditionalPlaintiffs = 2;
    const members = intake.household_members.slice(0, maxAdditionalPlaintiffs);

    members.forEach((member, index) => {
        const plaintiffNum = index + 2; // Start at plaintiff-2
        plaintiffs[`plaintiff-${plaintiffNum}-firstname`] = member.firstName;
        plaintiffs[`plaintiff-${plaintiffNum}-lastname`] = member.lastName;
    });

    // Warn if overflow
    if (intake.household_members.length > maxAdditionalPlaintiffs) {
        const overflow = intake.household_members.length - maxAdditionalPlaintiffs;
        warnings.push(
            `${overflow} household member(s) not mapped (doc gen supports max 3 plaintiffs). ` +
            `Additional members: ${intake.household_members.slice(maxAdditionalPlaintiffs).map(m => m.firstName + ' ' + m.lastName).join(', ')}`
        );
    }

    return { plaintiffs, warnings };
}

/**
 * Building issues mapping with consolidation
 */
export function mapBuildingIssues(intake: IntakeData): {
    issues: Partial<DocGenData>;
    warnings: string[];
} {
    const warnings: string[] = [];
    const issues: Partial<DocGenData> = {};

    if (!intake.building_issues) {
        return { issues, warnings };
    }

    // Structural issues
    if (intake.building_issues.structural) {
        const s = intake.building_issues.structural;

        if (s.ceilingDamage) issues['issue-structural-ceiling'] = true;
        if (s.wallCracks) issues['issue-structural-walls'] = true;
        if (s.floorDamage) issues['issue-structural-floors'] = true;
        // ... map all structural fields
    }

    // Plumbing issues
    if (intake.building_issues.plumbing) {
        const p = intake.building_issues.plumbing;

        if (p.cloggedDrains || p.cloggedToilet) {
            issues['issue-plumbing-clogs'] = true;
        }
        if (p.leaks || p.pipingLeaks) {
            issues['issue-plumbing-leaks'] = true;
        }
        // ... map all plumbing fields
    }

    // Count total issues for confidence score
    const issueCount = Object.keys(issues).length;
    if (issueCount === 0) {
        warnings.push('No building issues selected - verify with client');
    }

    return { issues, warnings };
}

/**
 * Calculate mapping confidence score
 */
export function calculateConfidence(result: MappingResult): number {
    let score = 100;

    // Deduct for errors
    score -= result.errors.length * 20;

    // Deduct for warnings
    score -= result.warnings.length * 5;

    // Deduct for unmapped fields
    score -= result.unmapped.length * 2;

    return Math.max(0, score);
}
```

**Deliverables:**
- ✅ TypeScript mapping configuration
- ✅ Address fallback logic
- ✅ Household overflow handling
- ✅ Issue consolidation
- ✅ Confidence scoring

---

### Day 4-5: Mapping Service Implementation

**File: `/services/intake-mapper.ts`**

```typescript
import {
    IntakeData,
    DocGenData,
    MappingResult,
    SIMPLE_MAPPINGS,
    mapAddress,
    mapHouseholdMembers,
    mapBuildingIssues,
    calculateConfidence
} from '../config/intake-field-mapping';

/**
 * Intake Mapper Service
 * Transforms intake data to doc gen format with validation
 */
export class IntakeMapper {
    /**
     * Main mapping function
     */
    static mapToDocGen(intake: IntakeData): MappingResult {
        const result: MappingResult = {
            data: {},
            confidence: 100,
            warnings: [],
            errors: [],
            unmapped: []
        };

        try {
            // 1. Simple 1:1 mappings
            for (const [intakeField, docGenField] of Object.entries(SIMPLE_MAPPINGS)) {
                if (intake[intakeField]) {
                    result.data[docGenField] = intake[intakeField];
                } else if (this.isRequired(docGenField)) {
                    result.errors.push(`Required field missing: ${intakeField}`);
                }
            }

            // 2. Address mapping with fallback
            const { address, warnings: addressWarnings } = mapAddress(intake);
            Object.assign(result.data, address);
            result.warnings.push(...addressWarnings);

            // 3. Household members with overflow
            const { plaintiffs, warnings: householdWarnings } = mapHouseholdMembers(intake);
            Object.assign(result.data, plaintiffs);
            result.warnings.push(...householdWarnings);

            // 4. Building issues with consolidation
            const { issues, warnings: issueWarnings } = mapBuildingIssues(intake);
            Object.assign(result.data, issues);
            result.warnings.push(...issueWarnings);

            // 5. Calculate confidence
            result.confidence = calculateConfidence(result);

        } catch (error) {
            result.errors.push(`Mapping failed: ${error.message}`);
            result.confidence = 0;
        }

        return result;
    }

    /**
     * Check if doc gen field is required
     */
    static isRequired(fieldName: string): boolean {
        const requiredFields = [
            'property-address',
            'city',
            'state',
            'zip-code',
            'plaintiff-1-firstname',
            'plaintiff-1-lastname',
            'defendant-1-name'
        ];

        return requiredFields.includes(fieldName);
    }

    /**
     * Get human-readable mapping report
     */
    static getMappingReport(result: MappingResult): string {
        const lines: string[] = [];

        lines.push(`\n========== MAPPING REPORT ==========`);
        lines.push(`Confidence Score: ${result.confidence}%`);
        lines.push(`Fields Mapped: ${Object.keys(result.data).length}`);

        if (result.errors.length > 0) {
            lines.push(`\n❌ ERRORS (${result.errors.length}):`);
            result.errors.forEach(e => lines.push(`  - ${e}`));
        }

        if (result.warnings.length > 0) {
            lines.push(`\n⚠️  WARNINGS (${result.warnings.length}):`);
            result.warnings.forEach(w => lines.push(`  - ${w}`));
        }

        if (result.unmapped.length > 0) {
            lines.push(`\n📝 UNMAPPED FIELDS (${result.unmapped.length}):`);
            result.unmapped.forEach(u => lines.push(`  - ${u}`));
        }

        lines.push(`\n====================================\n`);

        return lines.join('\n');
    }
}
```

**Deliverables:**
- ✅ Mapping service implemented
- ✅ Error handling robust
- ✅ Mapping report generation
- ✅ Unit tests at 90%+ coverage

---

### Day 6-7: Integration & Testing

**File: `/routes/intake.ts`**

```typescript
import express from 'express';
import { IntakeService } from '../services/intake-service';
import { IntakeMapper } from '../services/intake-mapper';
import { requireAuth } from '../middleware/auth';
import { validateIntake } from '../middleware/validation';

const router = express.Router();

/**
 * Get intake in doc-gen format (with mapping report)
 * GET /api/intakes/:id/doc-gen-format
 */
router.get('/:id/doc-gen-format', requireAuth, async (req, res) => {
    try {
        // Get full intake data
        const intake = await IntakeService.getIntakeById(req.params.id);

        if (!intake) {
            return res.status(404).json({ error: 'Intake not found' });
        }

        // Map to doc gen format
        const mappingResult = IntakeMapper.mapToDocGen(intake);

        // Log mapping report
        console.log(IntakeMapper.getMappingReport(mappingResult));

        // Return data + metadata
        res.json({
            data: mappingResult.data,
            confidence: mappingResult.confidence,
            warnings: mappingResult.warnings,
            errors: mappingResult.errors,
            intakeId: intake.id,
            intakeNumber: intake.intake_number
        });

    } catch (error) {
        console.error('Doc gen format error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
```

**Testing:**
```bash
# Test mapping with real intake data
curl -X GET http://localhost:3000/api/intakes/test-id-123/doc-gen-format \
  -H "Access-Token: $ACCESS_TOKEN"

# Expected response:
# {
#   "data": { "property-address": "123 Main St", ... },
#   "confidence": 85,
#   "warnings": ["Using current address as property address"],
#   "errors": [],
#   "intakeId": "uuid",
#   "intakeNumber": "INT-2025-00001"
# }
```

**Deliverables:**
- ✅ API endpoint works
- ✅ Mapping tested with 10+ sample intakes
- ✅ Edge cases handled correctly
- ✅ Confidence scores accurate

---

## WEEK 8-9: TESTING & DEPLOYMENT (14 days)

**Goal:** Comprehensive testing, security audit, production launch

### Week 8, Day 1-3: Automated Testing

**Create Test Suite:**

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Create test directory
mkdir -p tests/e2e tests/integration tests/unit
```

**File: `/tests/e2e/intake-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Client Intake Flow', () => {
    test('Client can submit intake form successfully', async ({ page }) => {
        // Go to intake form
        await page.goto('http://localhost:3000/intake-form.html');

        // Page 1: Personal & Contact
        await page.fill('#firstName', 'John');
        await page.fill('#lastName', 'Doe');
        await page.fill('#email', 'john@example.com');
        await page.fill('#phone', '555-1234');

        // ... fill more fields ...

        // Navigate to page 2
        await page.click('#btn-next');
        await expect(page.locator('.form-page[data-page="2"]')).toBeVisible();

        // ... fill page 2-5 ...

        // Submit
        await page.click('#btn-submit');

        // Verify success page
        await expect(page.locator('.success-page')).toBeVisible();
        await expect(page.locator('.success-page h2')).toContainText('Thank You');

        // Verify intake number displayed
        const intakeNumber = await page.locator('.intake-number').textContent();
        expect(intakeNumber).toMatch(/INT-\d{4}-\d{5}/);
    });

    test('Client can save draft and resume later', async ({ page }) => {
        // Fill partial form
        await page.goto('http://localhost:3000/intake-form.html');
        await page.fill('#firstName', 'Jane');
        await page.fill('#lastName', 'Smith');

        // Save draft
        await page.click('#btn-save-later');

        // Reload page
        await page.reload();

        // Verify draft loaded
        expect(await page.inputValue('#firstName')).toBe('Jane');
        expect(await page.inputValue('#lastName')).toBe('Smith');
    });
});

test.describe('Attorney Modal Flow', () => {
    test('Attorney can search and load intake', async ({ page, context }) => {
        // Set auth token
        await context.addCookies([{
            name: 'ACCESS_TOKEN',
            value: process.env.ACCESS_TOKEN,
            domain: 'localhost',
            path: '/'
        }]);

        // Go to doc gen form
        await page.goto('http://localhost:3000');

        // Open modal
        await page.click('button:has-text("Load from Intake")');
        await expect(page.locator('#intake-search-modal')).toBeVisible();

        // Search
        await page.fill('#intake-search', 'John Doe');
        await page.click('button:has-text("Search")');

        // Wait for results
        await page.waitForSelector('.intake-row');

        // Select first result
        await page.click('.intake-row:first-child');

        // Verify preview shows
        await expect(page.locator('.preview-header h3')).toContainText('John Doe');

        // Load into form
        await page.click('button:has-text("Load into Form")');

        // Verify modal closed
        await expect(page.locator('#intake-search-modal')).toBeHidden();

        // Verify form populated
        expect(await page.inputValue('#property-address')).toBe('123 Main St');
    });
});
```

**Run tests:**
```bash
npx playwright test
npx playwright show-report
```

**Deliverables:**
- ✅ E2E tests cover all critical paths
- ✅ Integration tests for all API endpoints
- ✅ Unit tests at 85%+ coverage
- ✅ All tests passing

---

### Week 8, Day 4-5: Security Audit

**Security Checklist:**

1. **Input Validation:**
   - [ ] All text inputs sanitized
   - [ ] Email validation working
   - [ ] Phone validation working
   - [ ] No SQL injection vectors
   - [ ] No XSS vulnerabilities

2. **Authentication:**
   - [ ] ACCESS_TOKEN required for attorney endpoints
   - [ ] Public endpoints rate-limited
   - [ ] reCAPTCHA v3 on intake submission
   - [ ] Session management secure

3. **Data Protection:**
   - [ ] PII encrypted in transit (HTTPS)
   - [ ] Database credentials secure
   - [ ] No sensitive data in logs
   - [ ] CORS configured correctly

4. **Infrastructure:**
   - [ ] CSP headers configured
   - [ ] HSTS enabled
   - [ ] No exposed secrets in code
   - [ ] Environment variables secure

**Run security scan:**
```bash
# Install security audit tools
npm install -g retire snyk

# Check for vulnerable dependencies
npm audit
retire --path .
snyk test

# Manual penetration testing
# - Try SQL injection in search
# - Try XSS in text fields
# - Try CSRF attacks
# - Try brute force auth
```

**Deliverables:**
- ✅ All security vulnerabilities fixed
- ✅ Security audit report
- ✅ Penetration test results

---

### Week 9, Day 1-2: Load Testing

**Create Load Test:**

```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > load-test-intake.yml << 'EOF'
config:
  target: 'https://staging.liptonlegal.com'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  variables:
    ACCESS_TOKEN: "your-token-here"

scenarios:
  - name: "Client submits intake"
    weight: 50
    flow:
      - post:
          url: "/api/intakes/submit"
          json:
            firstName: "Load"
            lastName: "Test"
            email: "load{{ $randomNumber() }}@test.com"
            phone: "555-{{ $randomNumber() }}"
            currentAddress: "123 Test St"
            # ... more fields
          capture:
            - json: "$.intake_id"
              as: "intakeId"

  - name: "Attorney searches intakes"
    weight: 30
    flow:
      - get:
          url: "/api/intakes?search=Test&limit=20"
          headers:
            Access-Token: "{{ ACCESS_TOKEN }}"

  - name: "Attorney loads intake"
    weight: 20
    flow:
      - get:
          url: "/api/intakes?limit=1"
          headers:
            Access-Token: "{{ ACCESS_TOKEN }}"
          capture:
            - json: "$[0].id"
              as: "intakeId"
      - get:
          url: "/api/intakes/{{ intakeId }}/doc-gen-format"
          headers:
            Access-Token: "{{ ACCESS_TOKEN }}"
EOF

# Run load test
artillery run load-test-intake.yml
```

**Performance Targets:**
- Intake submission: < 3 seconds (p95)
- Search query: < 500ms (p95)
- Doc gen format: < 1 second (p95)
- Throughput: 10 requests/second sustained

**Deliverables:**
- ✅ Load test results
- ✅ Performance targets met
- ✅ No memory leaks
- ✅ Database handles load

---

### Week 9, Day 3-4: Staging Deployment

**Deployment Checklist:**

1. **Prepare Environment:**
   ```bash
   # Set environment variables on Cloud Run
   gcloud run services update node-server-staging \
     --region us-central1 \
     --set-env-vars="NODE_ENV=production,DATABASE_URL=...,ACCESS_TOKEN=...,RECAPTCHA_SECRET_KEY=..."
   ```

2. **Run Database Migration:**
   ```bash
   # Connect to staging database
   psql $STAGING_DATABASE_URL

   # Create backup
   pg_dump $STAGING_DATABASE_URL > backup_$(date +%Y%m%d).sql

   # Run migration
   node db/migrations/run-migration.js 001_create_intake_tables

   # Verify
   \dt intake_*
   ```

3. **Deploy Application:**
   ```bash
   # Build and deploy
   gcloud run deploy node-server-staging \
     --source . \
     --region us-central1 \
     --allow-unauthenticated

   # Get URL
   gcloud run services describe node-server-staging \
     --region us-central1 \
     --format="value(status.url)"
   ```

4. **Smoke Tests:**
   ```bash
   STAGING_URL="https://node-server-staging-xxx.run.app"

   # Test health
   curl $STAGING_URL/health

   # Test intake submission
   curl -X POST $STAGING_URL/api/intakes/submit \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "Staging",
       "email": "test@staging.com",
       "phone": "555-1234",
       "currentAddress": { "street": "123 Staging St", ... }
     }'

   # Test attorney search
   curl "$STAGING_URL/api/intakes?search=Test" \
     -H "Access-Token: $ACCESS_TOKEN"
   ```

**Deliverables:**
- ✅ Staging environment deployed
- ✅ All smoke tests pass
- ✅ No errors in logs
- ✅ Ready for UAT

---

### Week 9, Day 5: Production Deployment

**Pre-Deployment Checklist:**
- [ ] All staging tests passed
- [ ] Security audit complete
- [ ] Load testing passed
- [ ] Accessibility verified
- [ ] Stakeholder sign-off received
- [ ] Rollback plan documented
- [ ] Monitoring configured

**Production Deployment:**

```bash
# 1. Create database backup
pg_dump $PRODUCTION_DATABASE_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql
gzip prod_backup_*.sql
gsutil cp prod_backup_*.sql.gz gs://lipton-legal-backups/

# 2. Run migration (during low traffic window)
psql $PRODUCTION_DATABASE_URL < db/migrations/001_create_intake_tables.sql

# 3. Deploy code
git checkout main
git merge feature/intake-system
git push origin main

# 4. Deploy to Cloud Run (CI/CD auto-deploys, or manual:)
gcloud run deploy node-server \
  --source . \
  --region us-central1 \
  --allow-unauthenticated

# 5. Verify deployment
PROD_URL="https://node-server-xxx.run.app"
curl $PROD_URL/health

# 6. Monitor logs for 30 minutes
gcloud logging tail "resource.type=cloud_run_revision" --limit=50
```

**Post-Deployment Monitoring:**
- Monitor error rates (target: < 1%)
- Monitor response times (target: p95 < 3s)
- Monitor intake submissions
- Check email delivery
- Watch for security incidents

**Deliverables:**
- ✅ Production deployed successfully
- ✅ Zero downtime achieved
- ✅ Monitoring active
- ✅ No critical errors

---

## 📊 SUCCESS METRICS

### Week 1 Metrics
- ✅ Intake submissions: 5+ per day
- ✅ Form abandonment: < 20%
- ✅ Attorney usage: 3+ loads per day
- ✅ Mapping confidence: > 80% average

### Month 1 Metrics
- ✅ 50+ intake submissions
- ✅ 70% attorney adoption rate
- ✅ < 5 bugs reported
- ✅ Field mapping accuracy: 90%+

### Month 3 Metrics
- ✅ 50% of new cases start with intake
- ✅ 60% reduction in attorney data entry time
- ✅ < 24 hour average response time
- ✅ 95% client satisfaction

---

## 📁 FINAL DELIVERABLES

1. **Code:**
   - Refactored modular server.js (~250 lines)
   - 5 new database tables
   - Client intake form (5 pages, 235+ fields)
   - Attorney search modal (960×720px)
   - Field mapping service (TypeScript)
   - Comprehensive test suite (85%+ coverage)

2. **Documentation:**
   - API documentation (OpenAPI spec)
   - Database schema diagram
   - Field mapping spreadsheet
   - Deployment runbook
   - Incident response plan
   - User training materials

3. **Infrastructure:**
   - Staging environment
   - Production deployment
   - Monitoring dashboards
   - Backup strategy
   - Security audit report

---

## 🚀 LAUNCH CHECKLIST

### Day Before Launch
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Accessibility verified
- [ ] Load testing passed
- [ ] Database backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Team notified

### Launch Day
- [ ] Deploy during low traffic window
- [ ] Run smoke tests
- [ ] Monitor for 2 hours
- [ ] Send announcement email
- [ ] Update documentation
- [ ] Celebrate! 🎉

### Week After Launch
- [ ] Monitor metrics daily
- [ ] Fix critical bugs
- [ [ ] Gather feedback
- [ ] Plan Phase 2 enhancements

---

**Plan Status:** ✅ Ready for execution
**Total Timeline:** 9 weeks (with 2-week buffer built-in)
**Confidence Level:** HIGH
**Next Action:** Begin Week 0 preparation tasks

