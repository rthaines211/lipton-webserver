# Client Intake System - Implementation Plan

**Project:** Lipton Legal Group - Client Intake Integration  
**Timeline:** 7 weeks (3 weeks refactoring + 4 weeks development)  
**Start Date:** [To Be Determined]  
**Team:** Solo developer (Ryan)

---

## Executive Summary

### Timeline Overview
```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: REFACTORING          │  3 weeks  │  Foundation       │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: DATABASE SETUP       │  1 week   │  Schema & Data    │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: INTAKE DEVELOPMENT   │  2 weeks  │  Core Features    │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4: TESTING & DEPLOYMENT │  1 week   │  QA & Launch      │
└─────────────────────────────────────────────────────────────────┘

Total: 7 weeks to production-ready intake system
```

### Key Decisions Implemented
- ✅ **Intake Form:** 5 pages (5 sections each) with progress stepper
- ✅ **Attorney Interface:** 800px × 600px centered modal overlay
- ✅ **File Uploads:** Optional during intake, upload link sent after submission
- ✅ **Refactoring Strategy:** Gradual extraction from monolithic server.js

### Success Criteria
- ✅ Zero downtime during refactoring
- ✅ Existing doc gen functionality untouched
- ✅ Client intake submission < 3 seconds
- ✅ Attorney can load intake in < 2 seconds
- ✅ 90%+ field mapping accuracy

---

## PHASE 1: REFACTORING (Weeks 1-3)

**Goal:** Modularize monolithic server.js before adding new features

### Week 1: Extract Document Generation Routes

#### Day 1-2: Setup & Planning
**Tasks:**
1. Create new folder structure:
   ```
   mkdir -p routes services middleware config db/migrations
   ```

2. Set up Git branch:
   ```bash
   git checkout -b refactor/modular-architecture
   ```

3. Create base files:
   ```bash
   touch routes/documents.js
   touch services/document-service.js
   touch middleware/auth.js
   touch config/database.js
   ```

4. Install development dependencies:
   ```bash
   npm install --save-dev nodemon jest supertest
   ```

**Deliverables:**
- ✅ Folder structure created
- ✅ Git branch established
- ✅ Dev dependencies installed

---

#### Day 3-4: Extract Document Routes

**Current code in server.js:**
```javascript
// Lines ~1500-1800 (estimated)
app.post('/api/generate-documents', requireAuth, async (req, res) => {
    // Document generation logic
});

app.get('/api/documents/:id', requireAuth, async (req, res) => {
    // Document retrieval logic
});
```

**New structure:**

**File: `/routes/documents.js`**
```javascript
const express = require('express');
const router = express.Router();
const DocumentService = require('../services/document-service');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

/**
 * Generate legal documents
 * POST /api/documents/generate
 */
router.post('/generate', async (req, res) => {
    try {
        const result = await DocumentService.generateDocuments(req.body);
        res.json(result);
    } catch (error) {
        console.error('Document generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get document by ID
 * GET /api/documents/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const document = await DocumentService.getDocumentById(req.params.id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json(document);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * List documents for a case
 * GET /api/documents?case_id=xxx
 */
router.get('/', async (req, res) => {
    try {
        const documents = await DocumentService.listDocuments(req.query);
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

**File: `/services/document-service.js`**
```javascript
const db = require('../db/connection');
const pythonPipeline = require('./python-pipeline'); // Existing integration

class DocumentService {
    /**
     * Generate documents using Docmosis
     */
    static async generateDocuments(formData) {
        // Extract existing document generation logic from server.js
        // Keep all existing functionality intact
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Save case data
            const caseResult = await client.query(`
                INSERT INTO cases (property_address, city, state, zip_code)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [formData.propertyAddress, formData.city, formData.state, formData.zipCode]);
            
            const caseId = caseResult.rows[0].id;
            
            // Save parties, issues, etc. (existing logic)
            
            // Trigger Python pipeline for document generation
            const documents = await pythonPipeline.generate({
                caseId,
                formData
            });
            
            await client.query('COMMIT');
            
            return {
                success: true,
                caseId,
                documents
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * Get document by ID
     */
    static async getDocumentById(id) {
        // Existing document retrieval logic
    }
    
    /**
     * List documents with filters
     */
    static async listDocuments(filters) {
        // Existing document listing logic
    }
}

module.exports = DocumentService;
```

**Update server.js:**
```javascript
// In server.js (around line 100)
const documentRoutes = require('./routes/documents');

// Replace existing document routes with:
app.use('/api/documents', documentRoutes);

// Delete old document route handlers (lines ~1500-1800)
```

**Testing:**
```bash
# Run existing doc gen tests
npm test -- documents.test.js

# Manual test: Generate documents via existing UI
# Verify nothing breaks
```

**Deliverables:**
- ✅ `/routes/documents.js` created
- ✅ `/services/document-service.js` created
- ✅ server.js updated
- ✅ All tests pass
- ✅ Document generation still works

---

#### Day 5: Extract Authentication Middleware

**File: `/middleware/auth.js`**
```javascript
/**
 * Authentication middleware
 * Validates ACCESS_TOKEN header
 */
function requireAuth(req, res, next) {
    const token = req.headers['access-token'] || req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'No access token provided' });
    }
    
    if (token !== process.env.ACCESS_TOKEN) {
        return res.status(403).json({ error: 'Invalid access token' });
    }
    
    // Attach user info if needed (for future enhancement)
    req.user = {
        authenticated: true,
        // Could add: email, role, etc.
    };
    
    next();
}

/**
 * Optional authentication (allows both authenticated and public)
 */
function optionalAuth(req, res, next) {
    const token = req.headers['access-token'] || req.headers['authorization'];
    
    if (token && token === process.env.ACCESS_TOKEN) {
        req.user = { authenticated: true };
    }
    
    next();
}

module.exports = {
    requireAuth,
    optionalAuth
};
```

**Update all route files:**
```javascript
// In routes/documents.js, etc.
const { requireAuth } = require('../middleware/auth');
// Use requireAuth middleware as shown above
```

**Deliverables:**
- ✅ `/middleware/auth.js` created
- ✅ All routes updated to use new middleware
- ✅ Authentication still works

---

### Week 2: Extract Form Submission Routes

#### Day 1-3: Extract Form Routes

**File: `/routes/forms.js`**
```javascript
const express = require('express');
const router = express.Router();
const FormService = require('../services/form-service');
const { requireAuth } = require('../middleware/auth');

/**
 * Submit form entry (existing functionality)
 * POST /api/form-entries
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const entry = await FormService.createFormEntry(req.body);
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get form entries
 * GET /api/form-entries
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const entries = await FormService.listFormEntries(req.query);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update form entry
 * PUT /api/form-entries/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const updated = await FormService.updateFormEntry(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

**File: `/services/form-service.js`**
```javascript
const db = require('../db/connection');

class FormService {
    static async createFormEntry(data) {
        // Existing form entry creation logic
    }
    
    static async listFormEntries(filters) {
        // Existing form listing logic
    }
    
    static async updateFormEntry(id, updates) {
        // Existing form update logic
    }
}

module.exports = FormService;
```

**Update server.js:**
```javascript
const formRoutes = require('./routes/forms');
app.use('/api/form-entries', formRoutes);
```

**Deliverables:**
- ✅ `/routes/forms.js` created
- ✅ `/services/form-service.js` created
- ✅ Existing form submission works

---

#### Day 4-5: Extract Email & Storage Services

**File: `/services/email-service.js`**
```javascript
const sendgrid = require('@sendgrid/mail');

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
    /**
     * Send email using template
     */
    static async send(options) {
        const msg = {
            to: options.to,
            from: process.env.EMAIL_FROM || 'noreply@liptonlegal.com',
            subject: options.subject,
            html: options.html,
            text: options.text
        };
        
        try {
            await sendgrid.send(msg);
            console.log(`Email sent to ${options.to}`);
        } catch (error) {
            console.error('Email send error:', error);
            throw error;
        }
    }
    
    /**
     * Get template by name
     */
    static getTemplate(name) {
        const templates = require('../config/email-templates');
        return templates[name];
    }
}

module.exports = EmailService;
```

**File: `/config/email-templates.js`**
```javascript
/**
 * Email templates
 */
module.exports = {
    'document-completion': require('./templates/document-completion'),
    'intake-confirmation': require('./templates/intake-confirmation'),
    // ... other templates
};
```

**Deliverables:**
- ✅ `/services/email-service.js` extracted
- ✅ `/services/storage-service.js` extracted (Dropbox/Cloud Storage)
- ✅ Email sending still works

---

### Week 3: Extract Database & Utilities

#### Day 1-2: Extract Database Connection

**File: `/db/connection.js`**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 20, // Existing pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

// Export query methods
module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool
};
```

**Update all services:**
```javascript
// Replace direct pool usage with:
const db = require('../db/connection');

// Use db.query() or db.getClient()
```

**Deliverables:**
- ✅ `/db/connection.js` created
- ✅ All services updated to use centralized connection
- ✅ Database queries still work

---

#### Day 3-5: Extract Validation & Error Handling

**File: `/middleware/validation.js`**
```javascript
/**
 * Validation middleware factory
 */
function validate(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        
        next();
    };
}

/**
 * Common validators
 */
const validators = {
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    phone: (val) => /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(val),
    zipCode: (val) => /^\d{5}(-\d{4})?$/.test(val),
    required: (val) => val !== null && val !== undefined && String(val).trim() !== ''
};

module.exports = {
    validate,
    validators
};
```

**File: `/middleware/error-handler.js`**
```javascript
/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    
    // Database errors
    if (err.code && err.code.startsWith('23')) {
        return res.status(400).json({
            error: 'Database constraint violation',
            message: 'Invalid data provided'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
}

module.exports = errorHandler;
```

**Update server.js:**
```javascript
const errorHandler = require('./middleware/error-handler');

// At the end of server.js, after all routes:
app.use(errorHandler);
```

**Deliverables:**
- ✅ `/middleware/validation.js` created
- ✅ `/middleware/error-handler.js` created
- ✅ Global error handling works

---

#### Week 3 Final: Clean Up & Test

**Day 5: Final server.js structure**

After refactoring, server.js should look like:

```javascript
// server.js - AFTER REFACTORING (~200 lines)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const documentRoutes = require('./routes/documents');
const formRoutes = require('./routes/forms');
// Intake routes will be added in Phase 3

// Import middleware
const errorHandler = require('./middleware/error-handler');

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/form-entries', formRoutes);

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing
```

**Testing Checklist:**
- [ ] Document generation works
- [ ] Form submissions work
- [ ] Email sending works
- [ ] File uploads work
- [ ] Authentication works
- [ ] No regressions in existing features

**Deliverables:**
- ✅ server.js reduced from 3,100 lines to ~200 lines
- ✅ All existing features work
- ✅ Clean modular architecture
- ✅ Ready for Phase 2

---

## PHASE 2: DATABASE SETUP (Week 4)

**Goal:** Create 13 new intake tables and indexes

### Day 1: Create Migration Scripts

**File: `/db/migrations/001_create_intake_tables.sql`**

```sql
-- Migration: Create intake tables
-- Date: [Current Date]
-- Description: Add 13 tables for client intake system

BEGIN;

-- ============================================
-- TABLE 1: client_intakes (Main intake record)
-- ============================================
CREATE TABLE IF NOT EXISTS client_intakes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tracking Fields
    intake_number VARCHAR(20) UNIQUE NOT NULL,
    intake_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    intake_status VARCHAR(50) DEFAULT 'pending',
    intake_source VARCHAR(100),
    
    -- Section 1: Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    
    -- Section 2: Contact Information
    primary_phone VARCHAR(20) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    preferred_contact_method VARCHAR(50),
    
    -- Section 3: Current Address
    current_street_address VARCHAR(255) NOT NULL,
    current_unit_number VARCHAR(50),
    current_city VARCHAR(100) NOT NULL,
    current_state VARCHAR(2) NOT NULL,
    current_zip_code VARCHAR(10) NOT NULL,
    
    -- Section 4: Property Information
    property_street_address VARCHAR(255),
    property_unit_number VARCHAR(50),
    property_city VARCHAR(100),
    property_state VARCHAR(2),
    property_zip_code VARCHAR(10),
    property_county VARCHAR(100),
    
    -- Section 5: Tenancy Details
    lease_start_date DATE,
    monthly_rent DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Assignment
    assigned_attorney_id UUID,
    assigned_attorney_name VARCHAR(255),
    
    -- Raw data preservation
    raw_form_data JSONB,
    
    CONSTRAINT chk_intake_status CHECK (intake_status IN ('pending', 'under_review', 'approved', 'rejected', 'assigned'))
);

-- (Continue with all 13 tables - see full schema in attachment)

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_intake_status ON client_intakes(intake_status);
CREATE INDEX idx_intake_date ON client_intakes(intake_date DESC);
CREATE INDEX idx_intake_email ON client_intakes(email_address);
CREATE INDEX idx_intake_search ON client_intakes USING gin(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(property_street_address, '')
    )
);

COMMIT;
```

**File: `/db/migrations/run-migrations.js`**

```javascript
const db = require('../connection');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    console.log('Running database migrations...');
    
    const migrationFile = path.join(__dirname, '001_create_intake_tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    try {
        await db.query(sql);
        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runMigrations;
```

**Run migration:**
```bash
node db/migrations/run-migrations.js
```

**Deliverables:**
- ✅ Migration SQL created
- ✅ 13 tables created in database
- ✅ All indexes created
- ✅ Migration tested on dev database

---

### Day 2-3: Create Intake Service

**File: `/services/intake-service.js`**

```javascript
const db = require('../db/connection');
const emailService = require('./email-service');

class IntakeService {
    /**
     * Create new intake from form submission
     */
    static async createIntake(formData) {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Generate intake number (INT-2025-00001)
            const intakeNumber = await this._generateIntakeNumber(client);
            
            // Insert main intake record
            const result = await client.query(`
                INSERT INTO client_intakes (
                    intake_number,
                    first_name,
                    last_name,
                    email_address,
                    primary_phone,
                    current_street_address,
                    current_city,
                    current_state,
                    current_zip_code,
                    raw_form_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, intake_number
            `, [
                intakeNumber,
                formData.firstName,
                formData.lastName,
                formData.email,
                formData.phone,
                formData.currentAddress,
                formData.currentCity,
                formData.currentState,
                formData.currentZip,
                JSON.stringify(formData)
            ]);
            
            const intakeId = result.rows[0].id;
            
            // Insert related data
            if (formData.household) {
                await this._insertHouseholdMembers(client, intakeId, formData.household);
            }
            
            if (formData.buildingIssues) {
                await this._insertBuildingIssues(client, intakeId, formData.buildingIssues);
            }
            
            // ... insert other related tables
            
            await client.query('COMMIT');
            
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * Search intakes with filters
     */
    static async searchIntakes(filters) {
        let query = `
            SELECT 
                id,
                intake_number,
                first_name,
                last_name,
                email_address,
                property_street_address,
                intake_status,
                intake_date,
                assigned_attorney_name
            FROM client_intakes
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Search filter
        if (filters.search) {
            query += ` AND (
                first_name ILIKE $${paramIndex} OR
                last_name ILIKE $${paramIndex} OR
                email_address ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        
        // Status filter
        if (filters.status) {
            query += ` AND intake_status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }
        
        // Date filters
        if (filters.dateFrom) {
            query += ` AND intake_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }
        
        query += ` ORDER BY intake_date DESC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(filters.limit || 20, filters.offset || 0);
        
        const result = await db.query(query, params);
        return result.rows;
    }
    
    /**
     * Get intake by ID (full details)
     */
    static async getIntakeById(id) {
        // Query all related tables and join
        const result = await db.query(`
            SELECT * FROM client_intakes WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) return null;
        
        const intake = result.rows[0];
        
        // Load related data
        intake.household = await this._getHouseholdMembers(id);
        intake.buildingIssues = await this._getBuildingIssues(id);
        // ... load other related data
        
        return intake;
    }
    
    // Private helper methods
    static async _generateIntakeNumber(client) {
        const year = new Date().getFullYear();
        const result = await client.query(`
            SELECT intake_number 
            FROM client_intakes 
            WHERE intake_number LIKE $1
            ORDER BY intake_number DESC 
            LIMIT 1
        `, [`INT-${year}-%`]);
        
        if (result.rows.length === 0) {
            return `INT-${year}-00001`;
        }
        
        const lastNumber = parseInt(result.rows[0].intake_number.split('-')[2]);
        const nextNumber = String(lastNumber + 1).padStart(5, '0');
        return `INT-${year}-${nextNumber}`;
    }
    
    static async _insertHouseholdMembers(client, intakeId, members) {
        for (const member of members) {
            await client.query(`
                INSERT INTO intake_household_members (
                    intake_id, first_name, last_name, relationship_to_client, age
                ) VALUES ($1, $2, $3, $4, $5)
            `, [intakeId, member.firstName, member.lastName, member.relationship, member.age]);
        }
    }
    
    static async _insertBuildingIssues(client, intakeId, issues) {
        await client.query(`
            INSERT INTO intake_building_issues (
                intake_id,
                has_structural_issues,
                structural_ceiling_damage,
                structural_wall_cracks
                -- ... all other fields
            ) VALUES ($1, $2, $3, $4)
        `, [intakeId, issues.hasStructural, issues.ceilingDamage, issues.wallCracks]);
    }
}

module.exports = IntakeService;
```

**Deliverables:**
- ✅ `/services/intake-service.js` created
- ✅ CRUD operations implemented
- ✅ Unit tests written

---

### Day 4-5: Create Field Mapping Service

**File: `/services/intake-mapper.js`**

```javascript
const fieldMapping = require('../config/intake-field-mapping');

class IntakeMapper {
    /**
     * Map intake data to doc gen format
     */
    static mapToDocGen(intakeData) {
        const docGenData = {};
        
        // Simple 1:1 mappings
        for (const [intakeField, docGenField] of Object.entries(fieldMapping.simple)) {
            if (intakeData[intakeField]) {
                docGenData[docGenField] = intakeData[intakeField];
            }
        }
        
        // Complex transformations
        if (intakeData.buildingIssues) {
            Object.assign(docGenData, this._mapBuildingIssues(intakeData.buildingIssues));
        }
        
        if (intakeData.pestIssues) {
            Object.assign(docGenData, this._mapPestIssues(intakeData.pestIssues));
        }
        
        return docGenData;
    }
    
    static _mapBuildingIssues(issues) {
        const docGenIssues = {};
        
        // Map structural issues
        if (issues.structural_ceiling_damage) {
            docGenIssues['issue-structural-ceiling'] = true;
        }
        
        // ... map all other issue checkboxes
        
        return docGenIssues;
    }
    
    static _mapPestIssues(pests) {
        const docGenPests = {};
        
        if (pests.pest_rats) {
            docGenPests['issue-vermin-rats'] = true;
        }
        
        // ... map all other pest checkboxes
        
        return docGenPests;
    }
}

module.exports = IntakeMapper;
```

**File: `/config/intake-field-mapping.js`**

```javascript
/**
 * Field mapping: Intake → Doc Gen
 */
module.exports = {
    simple: {
        // Personal info
        'first_name': 'plaintiff-1-firstname',
        'last_name': 'plaintiff-1-lastname',
        
        // Address
        'current_street_address': 'property-address',
        'current_unit_number': 'apartment-unit',
        'current_city': 'city',
        'current_state': 'state',
        'current_zip_code': 'zip-code',
        'property_county': 'filing-county',
        
        // Landlord
        'landlord_name': 'defendant-1-name'
    }
};
```

**Deliverables:**
- ✅ Field mapping service created
- ✅ Mapping configuration documented
- ✅ Transformation tested

---

## PHASE 3: INTAKE DEVELOPMENT (Weeks 5-6)

### Week 5: Client Intake Form

#### Day 1-2: Multi-Page Form Structure

**Hybrid Form Design (5 pages, 5 sections each):**

**Page 1: Personal & Contact (Sections 1-5)**
- Section 1: Personal Information
- Section 2: Contact Information
- Section 3: Current Address
- Section 4: Property Information
- Section 5: Tenancy Details

**Page 2: Building Issues (Sections 6-10)**
- Section 6: Structural Issues
- Section 7: Plumbing Issues
- Section 8: Electrical Issues
- Section 9: HVAC Issues
- Section 10: Appliance Issues

**Page 3: Safety & Health (Sections 11-15)**
- Section 11: Security Issues
- Section 12: Pest/Vermin Issues
- Section 13: Environmental Hazards
- Section 14: Health Impacts
- Section 15: Common Area Issues

**Page 4: Landlord & Legal (Sections 16-20)**
- Section 16: Household Members
- Section 17: Landlord Information
- Section 18: Property Management
- Section 19: Harassment/Retaliation
- Section 20: Maintenance Response

**Page 5: Documentation & Final (Sections 21-25)**
- Section 21: Available Documents
- Section 22: File Uploads (Optional)
- Section 23: Damages & Relief
- Section 24: Previous Legal Action
- Section 25: Additional Information

**HTML Structure:**

```html
<!-- intake-form.html -->
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
        
        <!-- Progress Stepper -->
        <div class="progress-stepper">
            <div class="step active" data-page="1">
                <div class="step-number">1</div>
                <div class="step-label">Personal & Contact</div>
            </div>
            <div class="step" data-page="2">
                <div class="step-number">2</div>
                <div class="step-label">Building Issues</div>
            </div>
            <div class="step" data-page="3">
                <div class="step-number">3</div>
                <div class="step-label">Safety & Health</div>
            </div>
            <div class="step" data-page="4">
                <div class="step-number">4</div>
                <div class="step-label">Landlord & Legal</div>
            </div>
            <div class="step" data-page="5">
                <div class="step-number">5</div>
                <div class="step-label">Documentation</div>
            </div>
        </div>
        
        <!-- Form Pages -->
        <form id="intake-form">
            
            <!-- Page 1: Personal & Contact -->
            <div class="form-page active" data-page="1">
                <h2>Personal & Contact Information</h2>
                
                <!-- Section 1: Personal Information -->
                <div class="form-section">
                    <h3>1. Personal Information</h3>
                    
                    <div class="form-row">
                        <div class="form-field">
                            <label for="firstName">First Name *</label>
                            <input type="text" id="firstName" name="firstName" required>
                        </div>
                        <div class="form-field">
                            <label for="lastName">Last Name *</label>
                            <input type="text" id="lastName" name="lastName" required>
                        </div>
                    </div>
                    
                    <!-- ... more personal fields -->
                </div>
                
                <!-- Section 2: Contact Information -->
                <div class="form-section">
                    <h3>2. Contact Information</h3>
                    
                    <div class="form-field">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    
                    <div class="form-field">
                        <label for="phone">Primary Phone *</label>
                        <input type="tel" id="phone" name="phone" required>
                    </div>
                    
                    <!-- ... more contact fields -->
                </div>
                
                <!-- Sections 3-5 continue... -->
            </div>
            
            <!-- Page 2: Building Issues -->
            <div class="form-page" data-page="2">
                <h2>Building Issues</h2>
                
                <!-- Section 6: Structural Issues -->
                <div class="form-section">
                    <h3>6. Structural Issues</h3>
                    
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="structural_ceiling_damage">
                            Ceiling Damage
                        </label>
                        <label>
                            <input type="checkbox" name="structural_wall_cracks">
                            Wall Cracks
                        </label>
                        <!-- ... more structural checkboxes -->
                    </div>
                    
                    <div class="form-field">
                        <label for="structural_details">Please describe the structural issues:</label>
                        <textarea id="structural_details" name="structural_details" rows="4"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-field">
                            <label for="structural_first_noticed">When did you first notice these issues?</label>
                            <input type="date" id="structural_first_noticed" name="structural_first_noticed">
                        </div>
                        <div class="form-field">
                            <label for="structural_reported_date">When did you report them?</label>
                            <input type="date" id="structural_reported_date" name="structural_reported_date">
                        </div>
                    </div>
                </div>
                
                <!-- Sections 7-10 continue... -->
            </div>
            
            <!-- Pages 3-5 continue with same pattern... -->
            
            <!-- Navigation Buttons -->
            <div class="form-navigation">
                <button type="button" class="btn-secondary" id="btn-previous" style="display: none;">
                    ← Previous
                </button>
                <button type="button" class="btn-primary" id="btn-next">
                    Next →
                </button>
                <button type="submit" class="btn-success" id="btn-submit" style="display: none;">
                    Submit Application
                </button>
            </div>
            
        </form>
        
    </div>
    
    <script src="js/intake-form.js"></script>
</body>
</html>
```

**Deliverables:**
- ✅ HTML structure for 5 pages
- ✅ 25 sections implemented
- ✅ 235+ fields added
- ✅ Progress stepper UI

---

#### Day 3-4: Form JavaScript & Validation

**File: `/public/js/intake-form.js`**

```javascript
class IntakeForm {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 5;
        this.formData = {};
        
        this.initializeEventListeners();
        this.loadSavedData();
    }
    
    initializeEventListeners() {
        // Navigation buttons
        document.getElementById('btn-next').addEventListener('click', () => this.nextPage());
        document.getElementById('btn-previous').addEventListener('click', () => this.previousPage());
        document.getElementById('intake-form').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Auto-save on field change
        const formFields = document.querySelectorAll('input, textarea, select');
        formFields.forEach(field => {
            field.addEventListener('change', () => this.autoSave());
        });
    }
    
    nextPage() {
        // Validate current page
        if (!this.validateCurrentPage()) {
            return;
        }
        
        // Save current page data
        this.savePageData();
        
        // Hide current page
        const currentPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        currentPageEl.classList.remove('active');
        
        // Show next page
        this.currentPage++;
        const nextPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        nextPageEl.classList.add('active');
        
        // Update stepper
        this.updateStepper();
        
        // Update buttons
        this.updateNavigationButtons();
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    previousPage() {
        // Hide current page
        const currentPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        currentPageEl.classList.remove('active');
        
        // Show previous page
        this.currentPage--;
        const prevPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        prevPageEl.classList.add('active');
        
        // Update stepper
        this.updateStepper();
        
        // Update buttons
        this.updateNavigationButtons();
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    validateCurrentPage() {
        const currentPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        const requiredFields = currentPageEl.querySelectorAll('[required]');
        
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!isValid) {
            alert('Please fill in all required fields before continuing.');
        }
        
        return isValid;
    }
    
    savePageData() {
        const currentPageEl = document.querySelector(`.form-page[data-page="${this.currentPage}"]`);
        const fields = currentPageEl.querySelectorAll('input, textarea, select');
        
        fields.forEach(field => {
            if (field.type === 'checkbox') {
                this.formData[field.name] = field.checked;
            } else {
                this.formData[field.name] = field.value;
            }
        });
        
        // Save to localStorage
        localStorage.setItem('intake-form-data', JSON.stringify(this.formData));
    }
    
    loadSavedData() {
        const saved = localStorage.getItem('intake-form-data');
        if (saved) {
            this.formData = JSON.parse(saved);
            this.populateForm();
        }
    }
    
    populateForm() {
        for (const [name, value] of Object.entries(this.formData)) {
            const field = document.querySelector(`[name="${name}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else {
                    field.value = value;
                }
            }
        }
    }
    
    autoSave() {
        // Debounced auto-save
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            this.savePageData();
        }, 1000);
    }
    
    updateStepper() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index + 1 === this.currentPage) {
                step.classList.add('active');
            } else if (index + 1 < this.currentPage) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }
    
    updateNavigationButtons() {
        const btnPrevious = document.getElementById('btn-previous');
        const btnNext = document.getElementById('btn-next');
        const btnSubmit = document.getElementById('btn-submit');
        
        // Show/hide Previous button
        btnPrevious.style.display = this.currentPage === 1 ? 'none' : 'inline-block';
        
        // Show/hide Next vs Submit
        if (this.currentPage === this.totalPages) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'inline-block';
        } else {
            btnNext.style.display = 'inline-block';
            btnSubmit.style.display = 'none';
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate final page
        if (!this.validateCurrentPage()) {
            return;
        }
        
        // Save final page data
        this.savePageData();
        
        // Show loading
        const btnSubmit = document.getElementById('btn-submit');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Submitting...';
        
        try {
            // Submit to API
            const response = await fetch('/api/intakes/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.formData)
            });
            
            if (!response.ok) {
                throw new Error('Submission failed');
            }
            
            const result = await response.json();
            
            // Clear saved data
            localStorage.removeItem('intake-form-data');
            
            // Show success page
            this.showSuccessPage(result);
            
        } catch (error) {
            console.error('Submission error:', error);
            alert('There was an error submitting your form. Please try again.');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Submit Application';
        }
    }
    
    showSuccessPage(result) {
        document.querySelector('.intake-container').innerHTML = `
            <div class="success-page">
                <div class="success-icon">✓</div>
                <h2>Thank You!</h2>
                <p>Your intake form has been successfully submitted.</p>
                <div class="success-details">
                    <p><strong>Reference Number:</strong> ${result.intake_number}</p>
                    <p>You will receive a confirmation email at the address you provided.</p>
                    <p>Our team will review your submission and contact you shortly.</p>
                </div>
                
                <div class="upload-reminder">
                    <h3>📎 Upload Supporting Documents</h3>
                    <p>If you have photos or documents related to your case, you can upload them here:</p>
                    <a href="/upload/${result.intake_id}" class="btn-primary">Upload Documents</a>
                    <p class="note">You can also upload documents later using the link sent to your email.</p>
                </div>
            </div>
        `;
    }
}

// Initialize form
document.addEventListener('DOMContentLoaded', () => {
    new IntakeForm();
});
```

**Deliverables:**
- ✅ Form navigation working
- ✅ Validation implemented
- ✅ Auto-save to localStorage
- ✅ Progress stepper updating
- ✅ Submit functionality

---

#### Day 5: Styling & Mobile Responsive

**File: `/public/css/intake-form.css`**

```css
/* Intake Form Styles */

.intake-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
}

/* Progress Stepper */
.progress-stepper {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
    position: relative;
}

.progress-stepper::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    height: 2px;
    background: #e0e0e0;
    z-index: -1;
}

.step {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;
}

.step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e0e0e0;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-bottom: 8px;
    transition: all 0.3s;
}

.step.active .step-number {
    background: #00AEEF;
    color: white;
}

.step.completed .step-number {
    background: #4CAF50;
    color: white;
}

.step-label {
    font-size: 12px;
    text-align: center;
    color: #666;
}

/* Form Pages */
.form-page {
    display: none;
}

.form-page.active {
    display: block;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Form Sections */
.form-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
}

.form-section h3 {
    margin-top: 0;
    color: #1F2A44;
    border-bottom: 2px solid #00AEEF;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

/* Form Fields */
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
}

.form-field {
    margin-bottom: 16px;
}

.form-field label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #333;
}

.form-field input,
.form-field textarea,
.form-field select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
    outline: none;
    border-color: #00AEEF;
}

.form-field input.error {
    border-color: #f44336;
}

/* Checkbox Groups */
.checkbox-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}

.checkbox-group label {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
    margin-right: 8px;
    width: auto;
}

/* Navigation */
.form-navigation {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e0e0e0;
}

.btn-primary,
.btn-secondary,
.btn-success {
    padding: 12px 32px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary {
    background: #00AEEF;
    color: white;
}

.btn-primary:hover {
    background: #0098d1;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-success {
    background: #4CAF50;
    color: white;
}

.btn-success:hover {
    background: #45a049;
}

/* Success Page */
.success-page {
    text-align: center;
    padding: 60px 20px;
}

.success-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #4CAF50;
    color: white;
    font-size: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 30px;
}

.success-details {
    background: #f8f9fa;
    border-left: 4px solid #4CAF50;
    padding: 20px;
    margin: 30px 0;
    text-align: left;
}

.upload-reminder {
    background: #fff8e1;
    border-left: 4px solid #ffc107;
    padding: 20px;
    margin-top: 30px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .progress-stepper {
        flex-wrap: wrap;
    }
    
    .step-label {
        display: none;
    }
    
    .checkbox-group {
        grid-template-columns: 1fr;
    }
}
```

**Deliverables:**
- ✅ Professional styling
- ✅ Mobile responsive
- ✅ Lipton Legal branding
- ✅ Smooth animations

---

### Week 6: Attorney Modal Interface

#### Day 1-2: Modal HTML & Structure

**Add to existing `index.html` (doc gen form):**

```html
<!-- Attorney Intake Search Modal -->
<div id="intake-search-modal" class="modal">
    <div class="modal-content" style="width: 800px; height: 600px;">
        
        <!-- Modal Header -->
        <div class="modal-header">
            <h2>Load from Intake</h2>
            <button class="modal-close" onclick="closeIntakeModal()">&times;</button>
        </div>
        
        <!-- Modal Body -->
        <div class="modal-body">
            
            <!-- Search & Filters -->
            <div class="search-controls">
                <div class="search-bar">
                    <input type="text" id="intake-search" placeholder="Search by name, email, or address...">
                    <button onclick="searchIntakes()">🔍 Search</button>
                </div>
                
                <div class="filter-row">
                    <select id="filter-status">
                        <option value="">All Statuses</option>
                        <option value="pending">New</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                    </select>
                    
                    <select id="filter-date">
                        <option value="30">Last 30 days</option>
                        <option value="60">Last 60 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>
                    
                    <select id="sort-by">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>
            
            <!-- Results Table -->
            <div class="intake-results">
                <table id="intake-table">
                    <thead>
                        <tr>
                            <th>Client Name</th>
                            <th>Property Address</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="intake-table-body">
                        <!-- Populated by JavaScript -->
                    </tbody>
                </table>
                
                <!-- Loading State -->
                <div id="loading-state" style="display: none;">
                    <p>Loading intakes...</p>
                </div>
                
                <!-- Empty State -->
                <div id="empty-state" style="display: none;">
                    <p>No intakes found matching your search.</p>
                </div>
            </div>
            
        </div>
        
        <!-- Modal Footer -->
        <div class="modal-footer">
            <button class="btn-secondary" onclick="closeIntakeModal()">Cancel</button>
        </div>
        
    </div>
</div>

<!-- Trigger Button (add to doc gen form) -->
<button type="button" class="btn-primary" onclick="openIntakeModal()">
    📋 Load from Intake
</button>
```

**Deliverables:**
- ✅ Modal HTML structure
- ✅ Search controls
- ✅ Results table
- ✅ Trigger button

---

#### Day 3-4: Modal JavaScript & API Integration

**File: `/public/js/intake-modal.js`**

```javascript
// Intake Search Modal Logic

let currentIntakes = [];

async function openIntakeModal() {
    document.getElementById('intake-search-modal').style.display = 'block';
    await loadIntakes();
}

function closeIntakeModal() {
    document.getElementById('intake-search-modal').style.display = 'none';
}

async function loadIntakes() {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const tableBody = document.getElementById('intake-table-body');
    
    // Show loading
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    tableBody.innerHTML = '';
    
    try {
        // Get filter values
        const status = document.getElementById('filter-status').value;
        const dateRange = document.getElementById('filter-date').value;
        const search = document.getElementById('intake-search').value;
        
        // Build query string
        let query = `?limit=20`;
        if (status) query += `&status=${status}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;
        
        // Calculate date range
        if (dateRange !== 'all') {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange));
            query += `&dateFrom=${dateFrom.toISOString()}`;
        }
        
        // Fetch intakes
        const response = await fetch(`/api/intakes${query}`, {
            headers: {
                'Access-Token': localStorage.getItem('ACCESS_TOKEN')
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load intakes');
        }
        
        currentIntakes = await response.json();
        
        // Hide loading
        loadingState.style.display = 'none';
        
        // Display results
        if (currentIntakes.length === 0) {
            emptyState.style.display = 'block';
        } else {
            displayIntakes(currentIntakes);
        }
        
    } catch (error) {
        console.error('Error loading intakes:', error);
        loadingState.style.display = 'none';
        alert('Error loading intakes. Please try again.');
    }
}

function displayIntakes(intakes) {
    const tableBody = document.getElementById('intake-table-body');
    tableBody.innerHTML = '';
    
    intakes.forEach(intake => {
        const row = document.createElement('tr');
        
        // Status badge
        const statusBadge = getStatusBadge(intake.intake_status);
        
        // Format date
        const submittedDate = new Date(intake.intake_date).toLocaleDateString();
        
        row.innerHTML = `
            <td><strong>${intake.first_name} ${intake.last_name}</strong></td>
            <td>${intake.property_street_address || intake.current_street_address}</td>
            <td>${submittedDate}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-sm btn-primary" onclick="loadIntakeIntoForm('${intake.id}')">
                    Select
                </button>
                <button class="btn-sm btn-secondary" onclick="previewIntake('${intake.id}')">
                    Preview
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-new">🔴 New</span>',
        'under_review': '<span class="badge badge-review">⚡ Under Review</span>',
        'approved': '<span class="badge badge-approved">✓ Approved</span>',
        'rejected': '<span class="badge badge-rejected">✗ Rejected</span>',
        'assigned': '<span class="badge badge-assigned">📌 Assigned</span>'
    };
    
    return badges[status] || status;
}

async function loadIntakeIntoForm(intakeId) {
    try {
        // Fetch intake in doc gen format
        const response = await fetch(`/api/intakes/${intakeId}/doc-gen-format`, {
            headers: {
                'Access-Token': localStorage.getItem('ACCESS_TOKEN')
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load intake details');
        }
        
        const docGenData = await response.json();
        
        // Populate form fields
        populateDocGenForm(docGenData);
        
        // Close modal
        closeIntakeModal();
        
        // Show success message
        showNotification('Intake loaded successfully! Review and edit as needed.', 'success');
        
    } catch (error) {
        console.error('Error loading intake:', error);
        alert('Error loading intake. Please try again.');
    }
}

function populateDocGenForm(data) {
    // Populate property fields
    if (data['property-address']) {
        document.getElementById('property-address').value = data['property-address'];
    }
    if (data['apartment-unit']) {
        document.getElementById('apartment-unit').value = data['apartment-unit'];
    }
    if (data['city']) {
        document.getElementById('city').value = data['city'];
    }
    if (data['state']) {
        document.getElementById('state').value = data['state'];
    }
    if (data['zip-code']) {
        document.getElementById('zip-code').value = data['zip-code'];
    }
    
    // Populate plaintiff 1
    if (data['plaintiff-1-firstname']) {
        document.getElementById('plaintiff-1-firstname').value = data['plaintiff-1-firstname'];
    }
    if (data['plaintiff-1-lastname']) {
        document.getElementById('plaintiff-1-lastname').value = data['plaintiff-1-lastname'];
    }
    
    // Populate defendant 1
    if (data['defendant-1-name']) {
        document.getElementById('defendant-1-name').value = data['defendant-1-name'];
    }
    
    // Populate issue checkboxes
    for (const [fieldName, value] of Object.entries(data)) {
        if (fieldName.startsWith('issue-') && value === true) {
            const checkbox = document.querySelector(`input[name="${fieldName}"]`);
            if (checkbox && checkbox.type === 'checkbox') {
                checkbox.checked = true;
            }
        }
    }
}

function previewIntake(intakeId) {
    // TODO: Implement preview modal with full intake details
    alert('Preview functionality coming soon!');
}

function searchIntakes() {
    loadIntakes();
}

function showNotification(message, type) {
    // Simple notification (enhance as needed)
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Filter change listeners
    document.getElementById('filter-status')?.addEventListener('change', loadIntakes);
    document.getElementById('filter-date')?.addEventListener('change', loadIntakes);
    document.getElementById('sort-by')?.addEventListener('change', loadIntakes);
    
    // Search on Enter key
    document.getElementById('intake-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchIntakes();
        }
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('intake-search-modal');
        if (e.target === modal) {
            closeIntakeModal();
        }
    });
});
```

**Deliverables:**
- ✅ Modal open/close functionality
- ✅ Search and filter logic
- ✅ API integration
- ✅ Form population logic

---

#### Day 5: Modal Styling

**File: `/public/css/intake-modal.css`**

```css
/* Intake Search Modal */

.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.3s;
}

.modal-content {
    position: relative;
    background-color: white;
    margin: 5% auto;
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 2px solid #e0e0e0;
}

.modal-header h2 {
    margin: 0;
    color: #1F2A44;
}

.modal-close {
    font-size: 28px;
    font-weight: bold;
    color: #999;
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
}

.modal-close:hover {
    color: #333;
}

.modal-body {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}

.modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #e0e0e0;
    text-align: right;
}

/* Search Controls */
.search-controls {
    margin-bottom: 20px;
}

.search-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.search-bar input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.search-bar button {
    padding: 10px 20px;
    background: #00AEEF;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
}

/* Results Table */
.intake-results {
    min-height: 400px;
}

#intake-table {
    width: 100%;
    border-collapse: collapse;
}

#intake-table th {
    background: #f8f9fa;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e0e0e0;
}

#intake-table td {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
}

#intake-table tr:hover {
    background: #f8f9fa;
}

/* Status Badges */
.badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
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

/* Buttons */
.btn-sm {
    padding: 6px 12px;
    font-size: 13px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 4px;
}

.btn-sm.btn-primary {
    background: #00AEEF;
    color: white;
}

.btn-sm.btn-secondary {
    background: #6c757d;
    color: white;
}

/* Loading & Empty States */
#loading-state,
#empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
}

/* Notification */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    animation: slideIn 0.3s;
}

.notification-success {
    background: #4CAF50;
    color: white;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}
```

**Deliverables:**
- ✅ Modal styling complete
- ✅ Responsive design
- ✅ Professional UI
- ✅ Smooth animations

---

## PHASE 4: TESTING & DEPLOYMENT (Week 7)

### Day 1-2: Integration Testing

**Test Suite:**

```javascript
// /tests/intake-integration.test.js

const request = require('supertest');
const app = require('../server');

describe('Intake System Integration Tests', () => {
    
    let testIntakeId;
    
    test('Should submit intake form successfully', async () => {
        const response = await request(app)
            .post('/api/intakes/submit')
            .send({
                firstName: 'Test',
                lastName: 'Client',
                email: 'test@example.com',
                phone: '555-1234',
                currentAddress: '123 Test St',
                currentCity: 'Los Angeles',
                currentState: 'CA',
                currentZip: '90001'
            });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.intake_number).toMatch(/INT-\d{4}-\d{5}/);
        
        testIntakeId = response.body.intake_id;
    });
    
    test('Should search intakes (authenticated)', async () => {
        const response = await request(app)
            .get('/api/intakes?search=Test')
            .set('Access-Token', process.env.ACCESS_TOKEN);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('Should get intake in doc gen format', async () => {
        const response = await request(app)
            .get(`/api/intakes/${testIntakeId}/doc-gen-format`)
            .set('Access-Token', process.env.ACCESS_TOKEN);
        
        expect(response.status).toBe(200);
        expect(response.body['property-address']).toBe('123 Test St');
        expect(response.body['plaintiff-1-firstname']).toBe('Test');
    });
    
    test('Should send confirmation email', async () => {
        // Test email sending logic
    });
});
```

**Run tests:**
```bash
npm test
```

**Deliverables:**
- ✅ All integration tests passing
- ✅ Edge cases handled
- ✅ Error scenarios tested

---

### Day 3-4: User Acceptance Testing

**UAT Checklist:**

**Client Flow:**
- [ ] Can access intake form without authentication
- [ ] All 5 pages load correctly
- [ ] Required field validation works
- [ ] Can navigate forward and backward
- [ ] Auto-save works (reload page and data persists)
- [ ] Can submit form successfully
- [ ] Receives confirmation email
- [ ] Upload link works (optional uploads)

**Attorney Flow:**
- [ ] Can open doc gen form with authentication
- [ ] "Load from Intake" button visible
- [ ] Modal opens correctly (800×600px centered)
- [ ] Search functionality works
- [ ] Filters work (status, date)
- [ ] Can select an intake
- [ ] Form pre-populates correctly
- [ ] Can edit pre-populated data
- [ ] Can generate documents

**System:**
- [ ] No regressions in existing doc gen
- [ ] Database performs well (search < 500ms)
- [ ] Email delivery reliable
- [ ] Mobile-responsive on all devices

**Deliverables:**
- ✅ UAT completed
- ✅ Bug fixes implemented
- ✅ Sign-off from stakeholders

---

### Day 5: Production Deployment

**Deployment Checklist:**

1. **Environment Variables:**
```bash
# On Cloud Run
DATABASE_URL=postgresql://...
ACCESS_TOKEN=...
SENDGRID_API_KEY=...
EMAIL_FROM=noreply@liptonlegal.com
NODE_ENV=production
```

2. **Database Migration:**
```bash
# Run on production database
node db/migrations/run-migrations.js
```

3. **Build & Deploy:**
```bash
# Push to main branch triggers CI/CD
git checkout main
git merge refactor/modular-architecture
git push origin main

# Or manual deployment
gcloud run deploy lipton-legal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

4. **Smoke Tests:**
- [ ] Production URL accessible
- [ ] Intake form loads
- [ ] Can submit test intake
- [ ] Attorney login works
- [ ] Modal opens
- [ ] Document generation still works

5. **Monitoring:**
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitor errors
# Set up error alerting via Cloud Monitoring
```

**Deliverables:**
- ✅ Deployed to production
- ✅ All smoke tests pass
- ✅ Monitoring configured
- ✅ Documentation updated

---

## Post-Launch (Week 8+)

### Immediate Post-Launch

**Week 8 Tasks:**
1. Monitor intake submissions daily
2. Gather attorney feedback
3. Fix any critical bugs
4. Optimize based on usage patterns

**Metrics to Track:**
- Intake submissions per day
- Form abandonment rate (which page)
- Attorney usage of "Load from Intake"
- Field mapping accuracy
- Time savings vs. manual entry

### Future Enhancements

**Phase 5 (Optional):**
1. File upload integration (Dropbox API)
2. Attorney assignment automation
3. Email notifications for status changes
4. Analytics dashboard
5. Export to Excel/PDF
6. Bulk intake import
7. Advanced search (Elasticsearch)
8. Mobile app (React Native)

---

## Risk Management

### Known Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Refactoring breaks production | High | Gradual extraction, extensive testing, rollback plan |
| Database migration fails | High | Test on staging first, backup before migration |
| Performance issues with 13 tables | Medium | Proper indexing, query optimization |
| Attorney adoption low | Medium | Training, feedback loops, iterative improvements |
| File upload storage costs | Low | Monitor usage, implement quotas |

### Rollback Plan

If critical issues arise:

1. **Immediate:** 
   - Revert to previous Git commit
   - Re-deploy previous version
   - Database remains intact (new tables don't affect old code)

2. **Communication:**
   - Notify clients of temporary unavailability
   - Inform attorneys of manual entry workflow

3. **Fix:**
   - Identify and fix issue
   - Test thoroughly
   - Re-deploy

---

## Success Criteria

### MVP Launch (End of Week 7)

- ✅ Client intake form live and accepting submissions
- ✅ 0 regressions in document generation
- ✅ Attorney can search and load intakes
- ✅ 90%+ field mapping accuracy
- ✅ < 3 second intake submission time
- ✅ < 2 second intake loading time

### 30 Days Post-Launch

- ✅ 20+ intake submissions received
- ✅ 80%+ of attorneys using "Load from Intake"
- ✅ < 5% bug rate
- ✅ Positive attorney feedback

### 90 Days Post-Launch

- ✅ 50% of new cases start with intake
- ✅ 60%+ reduction in attorney data entry time
- ✅ < 24 hour average response time to new intakes

---

## Resources & Support

### Documentation
- Requirements: `CLIENT_INTAKE_REQUIREMENTS_V2.md`
- Database Schema: `Client Intake Form Specifications & Database Schema`
- Gap Analysis: `Client Intake Integration Gap Analysis`
- This Implementation Plan

### Development Tools
- IDE: VS Code (recommended)
- Database Client: pgAdmin or DBeaver
- API Testing: Postman or Insomnia
- Version Control: Git + GitHub

### Training Materials
- Attorney training video (Week 8)
- Client intake form guide
- API documentation
- Database schema diagram

---

## Timeline Summary

| Week | Phase | Focus | Deliverable |
|------|-------|-------|-------------|
| 1 | Refactoring | Extract document routes | Modular doc gen |
| 2 | Refactoring | Extract form routes | Modular forms |
| 3 | Refactoring | Extract DB & utilities | Clean server.js |
| 4 | Database | Create tables & services | Intake backend ready |
| 5 | Development | Client intake form | 5-page form live |
| 6 | Development | Attorney modal | Search & load working |
| 7 | Testing | UAT & deployment | Production launch |

**Total: 7 weeks from start to production**

---

## Next Actions

**Immediate (This Week):**
1. [ ] Review and approve this implementation plan
2. [ ] Set start date
3. [ ] Set up development environment
4. [ ] Create Git branch: `refactor/modular-architecture`

**Week 1 Kickoff:**
1. [ ] Create folder structure
2. [ ] Begin document route extraction
3. [ ] Write first unit tests

---

**Plan Status:** ✅ Complete - Ready for execution  
**Last Updated:** November 14, 2025  
**Next Review:** End of Week 1 (refactoring checkpoint)