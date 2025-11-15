# Client Intake System - Implementation Requirements

**Project:** Lipton Legal Group - Client Intake Integration  
**Version:** 2.0 (Gap-Focused)  
**Date:** November 14, 2025  
**Status:** Ready for Implementation Planning

---

## Document Purpose

This document defines **only what needs to be built** for the client intake system integration. It assumes you have reviewed:

📄 **Gap Analysis:** `Client Intake Integration Gap Analysis` (Claude Code output)  
📄 **Database Schema:** `Client Intake Form Specifications & Database Schema`

---

## Executive Summary

### What Already Exists (~70%)
- ✅ PostgreSQL database + connection pooling
- ✅ Node.js/Express backend (server.js - 3,100 lines)
- ✅ SendGrid email system with templates
- ✅ ACCESS_TOKEN authentication
- ✅ Cloud Run deployment + CI/CD
- ✅ Partial "Habitability Intake" HTML tab
- ✅ File upload handling
- ✅ API patterns (form submissions, validation)

### What Needs to Be Built (~30%)
- ❌ Complete 25-section intake form (235+ fields)
- ❌ 13 new database tables (intake-specific)
- ❌ Attorney search modal (overlay on doc gen form)
- ❌ Field mapping service (intake → doc gen)
- ❌ Refactored modular code structure
- ❌ New API endpoints for intake operations

### Critical Decision Made
**Refactoring Strategy:** Gradual extraction (4 weeks)
- Week 1-3: Extract existing routes from monolithic server.js
- Week 4+: Build intake system in clean, modular structure
- New code follows modern patterns, old code migrated incrementally

---

## System Workflow

### Client Journey

```
1. Client visits public intake form
   ↓
2. Completes 25 sections (235+ fields)
   ↓
3. Submits form
   ↓
4. Data saved to 13 PostgreSQL tables
   ↓
5. Client receives email confirmation
```

### Attorney Journey

```
1. Attorney opens existing doc gen form
   ↓
2. Clicks "Load from Intake" button
   ↓
3. Modal opens with intake search interface
   ↓
4. Attorney searches/filters intakes
   ↓
5. Attorney selects an intake
   ↓
6. Modal closes, doc gen form pre-populated
   ↓
7. Attorney reviews, edits, adds defendants
   ↓
8. Attorney generates documents (existing flow)
```

---

## Components to Build

### 1. Client Intake Form (Frontend)

**Location:** Extends existing HTML tab structure

**25 Sections to Implement:**
1. Personal Information (10 fields)
2. Contact Information (12 fields)
3. Current Address (8 fields)
4. Property Information (12 fields)
5. Tenancy Details (10 fields)
6. Household Members (dynamic, 8 fields each)
7. Landlord Information (10 fields)
8. Property Management (8 fields)
9. Structural Issues (16 fields)
10. Plumbing Issues (19 fields)
11. Electrical Issues (16 fields)
12. HVAC Issues (14 fields)
13. Appliance Issues (11 fields)
14. Security Issues (14 fields)
15. Pest/Vermin Issues (25 fields)
16. Environmental Hazards (14 fields)
17. Health Impacts (15 fields)
18. Common Area Issues (40 fields)
19. Harassment/Retaliation (17 fields)
20. Maintenance Response (9 fields)
21. Available Documents (16 fields)
22. File Uploads (5 fields)
23. Damages & Relief (10 fields)
24. Previous Legal Action (9 fields)
25. Additional Information (13 fields)

**Total:** 235+ base fields (more with dynamic household members)

**Key Features:**
- Multi-section accordion or stepper
- Progress indicator
- Real-time validation
- Conditional field display
- File upload support
- Mobile-responsive design

**Validation Rules:**
- Required fields marked with *
- Email format validation
- Phone number formatting
- Date range validation
- ZIP code patterns
- Conditional required fields

---

### 2. Database Schema (Backend)

**13 New Tables to Create:**

See complete SQL in: `Client Intake Form Specifications & Database Schema`

1. **client_intakes** (main table, 50+ columns)
2. **intake_household_members** (dynamic family members)
3. **intake_landlord_info** (landlord/manager details)
4. **intake_building_issues** (structural/mechanical, 100+ booleans)
5. **intake_pest_issues** (vermin/pest tracking)
6. **intake_health_safety** (environmental hazards)
7. **intake_common_areas** (building common areas)
8. **intake_landlord_conduct** (harassment/retaliation)
9. **intake_documentation** (evidence checklist)
10. **intake_case_details** (damages/relief/legal history)
11. **intake_uploaded_files** (file metadata)
12. **intake_status_history** (audit trail)
13. **intake_communications** (email/phone log)

**Schema Strategy:**
- Keep existing 6 tables for doc gen unchanged
- Add 13 new intake tables (separate logical namespace)
- Link via `intake_id` when attorney approves
- Zero risk to existing production system

**Key Indexes:**
```sql
-- Search performance
CREATE INDEX idx_intake_status ON client_intakes(intake_status);
CREATE INDEX idx_intake_date ON client_intakes(intake_date DESC);
CREATE INDEX idx_intake_email ON client_intakes(email_address);

-- Full-text search
CREATE INDEX idx_intake_search ON client_intakes USING gin(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(property_street_address, '')
    )
);
```

---

### 3. Attorney Search Modal (Frontend)

**Trigger:** "Load from Intake" button on doc gen form

**Modal UI Components:**

**Search Bar:**
```
┌────────────────────────────────────────────┐
│ 🔍 Search by name, email, or address...   │
└────────────────────────────────────────────┘
```

**Filters:**
```
Status: [All ▼] [New] [Under Review] [Approved]
Date:   [Last 30 days ▼]
Sort:   [Newest First ▼]
```

**Results Table:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Client Name    │ Property Address      │ Submitted  │ Status    │
├────────────────┼──────────────────────┼────────────┼───────────┤
│ John Doe       │ 123 Main St, LA      │ Nov 14     │ 🔴 New    │
│ Jane Smith     │ 456 Oak Ave, LA      │ Nov 13     │ ⚡ Urgent │
│ Bob Johnson    │ 789 Elm St, LA       │ Nov 12     │ ✓ Review  │
└──────────────────────────────────────────────────────────────────┘
          [Select] [Preview] buttons for each row
```

**Preview Panel (Optional):**
- Quick view of key details
- Issue summary
- Urgency flags
- File count

**Actions:**
- Select → Loads intake into doc gen form, closes modal
- Preview → Shows detailed view in modal
- Cancel → Closes modal without loading

**Implementation:**
- Vanilla JavaScript (match existing patterns)
- CSS Grid/Flexbox for responsive layout
- Fetch API for search requests
- Debounced search input

---

### 4. Field Mapping Service (Backend)

**Purpose:** Transform intake data → doc gen form structure

**Mapping Configuration:**
```javascript
// /config/intake-field-mapping.js

module.exports = {
    // Direct 1:1 mappings
    simple: {
        'first_name': 'plaintiff-1-firstname',
        'last_name': 'plaintiff-1-lastname',
        'current_street_address': 'property-address',
        'current_unit_number': 'apartment-unit',
        'current_city': 'city',
        'current_state': 'state',
        'current_zip_code': 'zip-code',
        'property_county': 'filing-county',
        'landlord_name': 'defendant-1-name',
        'landlord_type': 'defendant-1-entity-type'
    },

    // Complex transformations
    complex: {
        // Transform pest issues → doc gen issue checkboxes
        pestIssues: (intakeData) => {
            const issues = {};
            if (intakeData.pest_rats) issues.vermin_RatsMice = true;
            if (intakeData.pest_cockroaches) issues.vermin_Cockroaches = true;
            if (intakeData.pest_bedbugs) issues.insects_Bedbugs = true;
            // ... etc
            return issues;
        },

        // Transform building issues
        buildingIssues: (intakeData) => {
            // Map structural, plumbing, electrical, etc.
            // to doc gen issue categories
        }
    },

    // Conditional mappings
    conditional: {
        // Only map if certain conditions met
        defendantType: (intakeData) => {
            if (intakeData.landlord_type === 'individual') {
                return 'Individual';
            } else if (intakeData.landlord_type === 'corporation') {
                return 'Corporation';
            }
            // ... etc
        }
    }
};
```

**Service Functions:**
```javascript
// /services/intake-mapper.js

const mapping = require('../config/intake-field-mapping');

class IntakeMapper {
    /**
     * Transform intake data to doc gen format
     */
    static mapToDocGen(intakeData) {
        const docGenData = {};

        // Apply simple mappings
        for (const [intakeField, docGenField] of Object.entries(mapping.simple)) {
            if (intakeData[intakeField]) {
                docGenData[docGenField] = intakeData[intakeField];
            }
        }

        // Apply complex transformations
        Object.assign(docGenData, mapping.complex.pestIssues(intakeData));
        Object.assign(docGenData, mapping.complex.buildingIssues(intakeData));

        // Apply conditional mappings
        for (const [key, transformer] of Object.entries(mapping.conditional)) {
            const value = transformer(intakeData);
            if (value) docGenData[key] = value;
        }

        return docGenData;
    }

    /**
     * Get mapping coverage percentage
     */
    static getCoverage(intakeData) {
        // Calculate how many intake fields mapped successfully
    }
}

module.exports = IntakeMapper;
```

---

### 5. API Endpoints (Backend)

**New Routes Required:**

```javascript
// /routes/intake.js

const express = require('express');
const router = express.Router();
const IntakeService = require('../services/intake-service');
const { requireAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================

/**
 * Submit intake form
 * POST /api/intakes/submit
 */
router.post('/submit', async (req, res) => {
    try {
        const intake = await IntakeService.createIntake(req.body);
        await IntakeService.sendConfirmationEmail(intake);
        
        res.json({
            success: true,
            intake_id: intake.id,
            intake_number: intake.intake_number
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ATTORNEY ENDPOINTS (Auth Required)
// ============================================

router.use(requireAuth); // All routes below require ACCESS_TOKEN

/**
 * Search/list intakes
 * GET /api/intakes?search=John&status=new&limit=20
 */
router.get('/', async (req, res) => {
    const { search, status, dateFrom, dateTo, sort, limit, offset } = req.query;
    
    const intakes = await IntakeService.searchIntakes({
        search,
        status,
        dateFrom,
        dateTo,
        sort: sort || 'created_at DESC',
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
    });
    
    res.json(intakes);
});

/**
 * Get specific intake (full details)
 * GET /api/intakes/:id
 */
router.get('/:id', async (req, res) => {
    const intake = await IntakeService.getIntakeById(req.params.id);
    
    if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
    }
    
    res.json(intake);
});

/**
 * Get intake in doc gen format
 * GET /api/intakes/:id/doc-gen-format
 */
router.get('/:id/doc-gen-format', async (req, res) => {
    const intake = await IntakeService.getIntakeById(req.params.id);
    const docGenData = IntakeMapper.mapToDocGen(intake);
    
    res.json(docGenData);
});

/**
 * Update intake status
 * PUT /api/intakes/:id/status
 */
router.put('/:id/status', async (req, res) => {
    const { status, notes } = req.body;
    
    await IntakeService.updateStatus(
        req.params.id,
        status,
        req.user.email, // From auth middleware
        notes
    );
    
    res.json({ success: true });
});

/**
 * Assign intake to attorney
 * PUT /api/intakes/:id/assign
 */
router.put('/:id/assign', async (req, res) => {
    const { attorney_id, attorney_name } = req.body;
    
    await IntakeService.assignAttorney(
        req.params.id,
        attorney_id,
        attorney_name
    );
    
    res.json({ success: true });
});

module.exports = router;
```

**Service Layer:**

```javascript
// /services/intake-service.js

const db = require('../db/connection');
const IntakeMapper = require('./intake-mapper');
const emailService = require('./email-service');

class IntakeService {
    /**
     * Create new intake from form submission
     */
    static async createIntake(formData) {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Generate intake number
            const intakeNumber = await this.generateIntakeNumber();
            
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
                formData.first_name,
                formData.last_name,
                formData.email_address,
                formData.primary_phone,
                formData.current_street_address,
                formData.current_city,
                formData.current_state,
                formData.current_zip_code,
                JSON.stringify(formData)
            ]);
            
            const intakeId = result.rows[0].id;
            
            // Insert related data (household, issues, etc.)
            await this.insertHouseholdMembers(client, intakeId, formData.household);
            await this.insertBuildingIssues(client, intakeId, formData.issues);
            await this.insertPestIssues(client, intakeId, formData.pests);
            // ... etc for other tables
            
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
                urgency_level,
                intake_date,
                assigned_attorney_name
            FROM client_intakes
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Add search filter
        if (filters.search) {
            query += ` AND (
                first_name ILIKE $${paramIndex} OR
                last_name ILIKE $${paramIndex} OR
                email_address ILIKE $${paramIndex} OR
                property_street_address ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        
        // Add status filter
        if (filters.status) {
            query += ` AND intake_status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }
        
        // Add date filters
        if (filters.dateFrom) {
            query += ` AND intake_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }
        
        if (filters.dateTo) {
            query += ` AND intake_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }
        
        // Add sorting
        query += ` ORDER BY ${filters.sort}`;
        
        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(filters.limit, filters.offset);
        
        const result = await db.query(query, params);
        return result.rows;
    }
    
    /**
     * Get full intake details by ID
     */
    static async getIntakeById(id) {
        // Join all related tables and return complete intake
    }
    
    /**
     * Generate unique intake number
     */
    static async generateIntakeNumber() {
        const year = new Date().getFullYear();
        const result = await db.query(`
            SELECT intake_number 
            FROM client_intakes 
            WHERE intake_number LIKE 'INT-${year}-%'
            ORDER BY intake_number DESC 
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            return `INT-${year}-00001`;
        }
        
        const lastNumber = parseInt(result.rows[0].intake_number.split('-')[2]);
        const nextNumber = String(lastNumber + 1).padStart(5, '0');
        return `INT-${year}-${nextNumber}`;
    }
    
    /**
     * Send confirmation email to client
     */
    static async sendConfirmationEmail(intake) {
        const template = emailService.getTemplate('intake-confirmation');
        await emailService.send({
            to: intake.email_address,
            subject: 'Thank You - Your Intake Form Has Been Received',
            html: template({
                firstName: intake.first_name,
                intakeNumber: intake.intake_number
            })
        });
    }
}

module.exports = IntakeService;
```

---

### 6. Refactored Code Structure

**Current Structure:**
```
server.js (3,100 lines - everything)
```

**Target Structure:**
```
server.js (200 lines - app setup only)
├── routes/
│   ├── intake.js (new)
│   ├── documents.js (extracted)
│   ├── forms.js (extracted)
│   └── auth.js (extracted)
├── services/
│   ├── intake-service.js (new)
│   ├── intake-mapper.js (new)
│   ├── document-service.js (extracted)
│   ├── email-service.js (exists, extend)
│   └── storage-service.js (extracted)
├── middleware/
│   ├── auth.js (extracted)
│   ├── validation.js (new)
│   └── error-handler.js (extracted)
├── config/
│   ├── intake-field-mapping.js (new)
│   └── database.js (extracted)
└── db/
    ├── connection.js (extracted)
    └── migrations/
        └── 001_create_intake_tables.sql (new)
```

**Refactoring Timeline:**
- **Week 1:** Extract document routes + services
- **Week 2:** Extract form routes + validation
- **Week 3:** Extract auth + utilities
- **Week 4:** Build intake in clean structure

---

### 7. Email Templates

**Extend Existing Email Service:**

**New Template 1: Client Confirmation**
```javascript
// Extends existing email-service.js getTemplate() method

templates['intake-confirmation'] = (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Intake Confirmation - Lipton Legal</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    
    <!-- Header (match existing Lipton Legal branding) -->
    <div style="background: linear-gradient(135deg, #1F2A44 0%, #2A3B5A 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Lipton Legal Group</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0;">Intake Confirmation</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
        <p style="font-size: 18px;">Hi ${data.firstName},</p>
        
        <p>Thank you for submitting your information. Our team has received your intake form and will be in touch shortly to discuss the next steps.</p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #00AEEF; padding: 18px; margin: 20px 0;">
            <p><strong>Status:</strong> Submitted Successfully</p>
            <p><strong>Reference:</strong> ${data.intakeNumber}</p>
            <p><strong>Received:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>If you have any questions in the meantime, feel free to reach out to us at <a href="mailto:info@liptonlegal.com">info@liptonlegal.com</a>.</p>
        
        <p>Best regards,<br><strong>Lipton Legal Group</strong></p>
    </div>
    
    <!-- Footer -->
    <div style="padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
        This is an automated confirmation email.
    </div>
    
</body>
</html>
`;
```

**New Template 2: Attorney Notification**
```javascript
templates['new-intake-notification'] = (data) => `
<!-- Email to attorney when new intake submitted -->
<!-- Include intake summary, urgency flags, link to review -->
`;
```

---

## Security & Validation

### Client-Side Validation
```javascript
// Real-time validation rules
const validators = {
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    phone: (val) => /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(val),
    zipCode: (val) => /^\d{5}(-\d{4})?$/.test(val),
    required: (val) => val && val.trim().length > 0
};
```

### Server-Side Protection
```javascript
// Rate limiting for public intake endpoint
const rateLimit = require('express-rate-limit');

const intakeRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 submissions per hour per IP
    message: 'Too many submissions from this IP, please try again later.'
});

app.use('/api/intakes/submit', intakeRateLimiter);
```

### Input Sanitization
```javascript
// Prevent XSS and SQL injection
const sanitize = (input) => {
    if (typeof input === 'string') {
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    return input;
};
```

---

## Testing Requirements

### Unit Tests
- Field mapping service
- Intake service (CRUD operations)
- Validation functions
- Email template generation

### Integration Tests
- Full intake submission flow
- Database transactions
- Email delivery
- Search functionality

### End-to-End Tests
1. Client submits intake → Success response
2. Attorney searches → Finds intake
3. Attorney selects → Form populates
4. Attorney generates docs → PDFs created

---

## Performance Targets

- Intake submission: < 3 seconds (95th percentile)
- Search query: < 500ms (95th percentile)
- Form pre-population: < 1 second
- Modal load: < 800ms

---

## Open Questions / Pending Decisions

### HIGH PRIORITY (Need Before Week 4)
1. ⚠️ **Multi-page vs. single-page intake form?**
   - Option A: Single scrollable page with accordion sections
   - Option B: Multi-step wizard (Section 1 → Next → Section 2, etc.)
   - Option C: Hybrid (groups of 5 sections per page)

2. ⚠️ **Modal size and behavior**
   - Full-screen overlay or centered modal?
   - Show preview panel or just table?
   - Pagination strategy (load more vs. pages)?

3. ⚠️ **File upload strategy**
   - Upload during intake submission or after?
   - Storage: Cloud Storage vs. Dropbox?
   - Max file size limits?

### MEDIUM PRIORITY (Can Decide During Implementation)
4. ⚠️ **Intake approval workflow**
   - Auto-approve all or require attorney review?
   - Who can change status?
   - Email notifications at each status change?

5. ⚠️ **Search performance**
   - Elasticsearch integration needed?
   - PostgreSQL full-text search sufficient?

### LOW PRIORITY (Nice to Have)
6. ⚠️ **Analytics/reporting**
   - Dashboard showing intake metrics?
   - Conversion funnel tracking?

---

## Success Metrics

**Phase 1 (MVP Launch):**
- ✅ 100% of intake submissions saved successfully
- ✅ < 5% client dropout rate on intake form
- ✅ 90%+ field mapping accuracy (intake → doc gen)
- ✅ < 2 minutes for attorney to search and load intake

**Phase 2 (Adoption):**
- ✅ 50% of new cases start with intake (vs. direct entry)
- ✅ 70% reduction in attorney data entry time
- ✅ < 24 hour response time to new intakes

---

## Dependencies & Prerequisites

**Before Implementation Starts:**
1. ✅ Access to existing codebase (server.js, index.html)
2. ✅ PostgreSQL database access
3. ✅ SendGrid API credentials
4. ✅ Cloud Run deployment access
5. ❌ Decide on multi-page vs. single-page form
6. ❌ Finalize modal UI design (wireframe)

**Before Week 4 (Intake Development):**
1. ❌ Refactoring complete (server.js modularized)
2. ❌ Database migration scripts tested
3. ❌ Email templates designed and approved

---

## Next Steps

**Immediate (Today):**
1. ✅ Review this requirements document
2. ❌ Make decisions on HIGH PRIORITY open questions
3. ❌ Create wireframes for modal interface
4. ❌ Move to Implementation Plan creation

**This Week:**
1. ❌ Create detailed implementation plan
2. ❌ Design database migration strategy
3. ❌ Set up development environment
4. ❌ Begin Week 1 refactoring

---

## Appendix

### Field Count Summary
- **Total intake fields:** 235+ base fields
- **Dynamic fields:** Household members (8 fields × N members)
- **Checkbox fields:** 120+ issue checkboxes
- **Required fields:** ~30 essential fields
- **Optional fields:** ~205 additional detail fields

### Technology Versions
- Node.js: 20+
- PostgreSQL: 12+
- Express: 4.x
- SendGrid: Latest
- Cloud Run: Standard tier

### Related Documents
1. `Client Intake Integration Gap Analysis` - What exists vs. what's needed
2. `Client Intake Form Specifications & Database Schema` - Complete schema + field mapping
3. (Pending) `Implementation Plan` - Week-by-week build plan
4. (Pending) `Database Migration Guide` - Step-by-step migration

---

**Document Status:** ✅ Complete - Ready for implementation planning

**Last Updated:** November 14, 2025  
**Next Review:** After implementation plan created