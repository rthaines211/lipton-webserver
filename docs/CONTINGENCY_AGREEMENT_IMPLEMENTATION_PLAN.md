# Contingency Agreement Form - Implementation Plan

## Overview
Create a new contingency agreement intake form deployed to `agreement.liptonlegal.com` while maintaining the existing document generation form at `docs.liptonlegal.com`. Both forms will share backend infrastructure but have separate frontends and password protection.

## Project Goals
1. ✅ Create simplified intake form for contingency agreements
2. ✅ Deploy to separate subdomain (agreement.liptonlegal.com)
3. ✅ Add password authentication to both form frontends
4. ✅ Share backend API infrastructure with separate endpoints
5. ✅ Use separate database table for contingency submissions
6. ✅ Maintain existing document generation form functionality

---

## Phase 1: Git Branch Setup & Project Structure

### 1.1 Create Feature Branch
```bash
git checkout -b feature/contingency-agreement-form
```

### 1.2 Create Directory Structure
```
/forms/
  /docs/                    # Existing document generation form
    index.html             # Move existing index.html here
    /js/
      form-submission.js   # Form-specific submission logic
      validation.js        # Form-specific validation
  /agreement/              # New contingency agreement form
    index.html             # New simplified form
    /js/
      form-submission.js   # Agreement-specific submission logic
      validation.js        # Agreement-specific validation
  /shared/                 # Shared resources
    /js/
      sse-client.js       # Shared SSE connection logic
      utils.js            # Shared utility functions
    /css/
      common.css          # Shared styles
    /images/
      logo.png
      logo-white.png
```

### 1.3 Move Existing Files
- Move `index.html` → `forms/docs/index.html`
- Move `js/form-submission.js` → `forms/docs/js/form-submission.js`
- Copy shared JS files to `forms/shared/js/`
- Update all path references in moved files

---

## Phase 2: Password Authentication Implementation

### 2.1 Add Password Middleware
**File:** `middleware/password-auth.js`

```javascript
/**
 * Simple password authentication for form frontends
 * Uses session-based authentication
 */
const session = require('express-session');

// Separate passwords for each form
const DOCS_PASSWORD = process.env.DOCS_FORM_PASSWORD || 'lipton-docs-2025';
const AGREEMENT_PASSWORD = process.env.AGREEMENT_FORM_PASSWORD || 'lipton-agreement-2025';

function createPasswordAuth(formType) {
  return (req, res, next) => {
    // Skip auth for API endpoints and static assets
    if (req.path.startsWith('/api') ||
        req.path.match(/\.(js|css|png|jpg|svg|ico)$/)) {
      return next();
    }

    // Check if already authenticated for this form
    if (req.session && req.session[`${formType}Authenticated`]) {
      return next();
    }

    // Check for password in request
    const password = req.body.password || req.query.password;
    const expectedPassword = formType === 'docs' ? DOCS_PASSWORD : AGREEMENT_PASSWORD;

    if (password === expectedPassword) {
      req.session[`${formType}Authenticated`] = true;
      return next();
    }

    // Return login page
    res.status(401).send(getLoginPage(formType));
  };
}

function getLoginPage(formType) {
  const title = formType === 'docs' ? 'Document Generation Portal' : 'Contingency Agreement Portal';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Login</title>
      <style>
        body {
          font-family: 'Open Sans', sans-serif;
          background: #1F2A44;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
        }
        h1 {
          color: #1F2A44;
          margin-bottom: 30px;
          text-align: center;
        }
        input[type="password"] {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 12px;
          background: #00AEEF;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        button:hover {
          background: #0098D4;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>${title}</h1>
        <form method="POST">
          <input type="password" name="password" placeholder="Enter password" required autofocus>
          <button type="submit">Access Form</button>
        </form>
      </div>
    </body>
    </html>
  `;
}

module.exports = { createPasswordAuth };
```

### 2.2 Update Environment Variables
Add to `.env`:
```bash
# Form Password Authentication
DOCS_FORM_PASSWORD=your-secure-docs-password
AGREEMENT_FORM_PASSWORD=your-secure-agreement-password
SESSION_SECRET=your-session-secret-key
```

### 2.3 Update Server.js
```javascript
const session = require('express-session');
const { createPasswordAuth } = require('./middleware/password-auth');

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Password-protect document generation form
app.use('/forms/docs', createPasswordAuth('docs'));
app.use('/forms/docs', express.static(path.join(__dirname, 'forms/docs')));

// Password-protect contingency agreement form
app.use('/forms/agreement', createPasswordAuth('agreement'));
app.use('/forms/agreement', express.static(path.join(__dirname, 'forms/agreement')));

// Redirect root to docs form (or landing page)
app.get('/', (req, res) => {
  res.redirect('/forms/docs');
});
```

---

## Phase 3: Backend API Implementation

### 3.1 Database Schema
**File:** `migrations/003_create_contingency_agreements_table.sql`

```sql
-- Contingency Agreement submissions table
CREATE TABLE IF NOT EXISTS contingency_agreements (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE NOT NULL,

  -- Property Information
  property_address TEXT NOT NULL,

  -- Submission metadata
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Document generation status
  document_status VARCHAR(50) DEFAULT 'pending',
  document_url TEXT,
  dropbox_path TEXT,

  -- Notification settings
  notification_email VARCHAR(255),
  notification_name VARCHAR(255),
  notification_sent BOOLEAN DEFAULT FALSE,

  -- Raw form data (JSON)
  form_data JSONB NOT NULL,

  -- Indexes for common queries
  CONSTRAINT chk_document_status CHECK (document_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Plaintiffs table for contingency agreements
CREATE TABLE IF NOT EXISTS contingency_plaintiffs (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  plaintiff_index INTEGER NOT NULL,

  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  unit_number VARCHAR(50),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,

  -- Minor status
  is_minor BOOLEAN DEFAULT FALSE,
  guardian_plaintiff_id INTEGER, -- References another plaintiff in same case

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, plaintiff_index)
);

-- Defendants table for contingency agreements
CREATE TABLE IF NOT EXISTS contingency_defendants (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) REFERENCES contingency_agreements(case_id) ON DELETE CASCADE,
  defendant_index INTEGER NOT NULL,

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(case_id, defendant_index)
);

-- Indexes for performance
CREATE INDEX idx_contingency_agreements_case_id ON contingency_agreements(case_id);
CREATE INDEX idx_contingency_agreements_submitted_at ON contingency_agreements(submitted_at);
CREATE INDEX idx_contingency_plaintiffs_case_id ON contingency_plaintiffs(case_id);
CREATE INDEX idx_contingency_defendants_case_id ON contingency_defendants(case_id);
```

### 3.2 API Routes
**File:** `routes/contingency.js`

```javascript
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../monitoring/logger');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

/**
 * POST /api/contingency-entries
 * Submit a new contingency agreement form
 */
router.post('/contingency-entries', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const formData = req.body;
    const caseId = formData.id || `CA-${Date.now()}`;

    // Insert main agreement record
    const agreementResult = await client.query(`
      INSERT INTO contingency_agreements (
        case_id, property_address, notification_email,
        notification_name, form_data
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, case_id
    `, [
      caseId,
      formData.propertyAddress,
      formData.notificationEmail,
      formData.notificationName,
      JSON.stringify(formData)
    ]);

    const dbCaseId = agreementResult.rows[0].case_id;

    // Insert plaintiffs
    const plaintiffs = extractPlaintiffs(formData);
    for (const plaintiff of plaintiffs) {
      await client.query(`
        INSERT INTO contingency_plaintiffs (
          case_id, plaintiff_index, first_name, last_name,
          address, unit_number, email, phone, is_minor, guardian_plaintiff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        dbCaseId,
        plaintiff.index,
        plaintiff.firstName,
        plaintiff.lastName,
        plaintiff.address,
        plaintiff.unitNumber,
        plaintiff.email,
        plaintiff.phone,
        plaintiff.isMinor,
        plaintiff.guardianId
      ]);
    }

    // Insert defendants
    const defendants = extractDefendants(formData);
    for (const defendant of defendants) {
      await client.query(`
        INSERT INTO contingency_defendants (
          case_id, defendant_index, first_name, last_name
        ) VALUES ($1, $2, $3, $4)
      `, [
        dbCaseId,
        defendant.index,
        defendant.firstName,
        defendant.lastName
      ]);
    }

    await client.query('COMMIT');

    logger.info('Contingency agreement submitted', { caseId: dbCaseId });

    res.status(201).json({
      success: true,
      id: caseId,
      dbCaseId: dbCaseId,
      message: 'Contingency agreement submitted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error submitting contingency agreement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to submit contingency agreement'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/contingency-entries/:caseId
 * Retrieve a contingency agreement by case ID
 */
router.get('/contingency-entries/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await pool.query(
      'SELECT * FROM contingency_agreements WHERE case_id = $1',
      [caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const agreement = result.rows[0];

    // Get plaintiffs
    const plaintiffs = await pool.query(
      'SELECT * FROM contingency_plaintiffs WHERE case_id = $1 ORDER BY plaintiff_index',
      [caseId]
    );

    // Get defendants
    const defendants = await pool.query(
      'SELECT * FROM contingency_defendants WHERE case_id = $1 ORDER BY defendant_index',
      [caseId]
    );

    res.json({
      agreement,
      plaintiffs: plaintiffs.rows,
      defendants: defendants.rows
    });

  } catch (error) {
    logger.error('Error retrieving contingency agreement', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve agreement' });
  }
});

// Helper functions
function extractPlaintiffs(formData) {
  const plaintiffs = [];
  let index = 1;

  while (formData[`plaintiff-${index}-first-name`]) {
    plaintiffs.push({
      index,
      firstName: formData[`plaintiff-${index}-first-name`],
      lastName: formData[`plaintiff-${index}-last-name`],
      address: formData[`plaintiff-${index}-address`],
      unitNumber: formData[`plaintiff-${index}-unit-number`] || null,
      email: formData[`plaintiff-${index}-email`],
      phone: formData[`plaintiff-${index}-phone`],
      isMinor: formData[`plaintiff-${index}-is-minor`] === 'yes',
      guardianId: formData[`plaintiff-${index}-guardian`] || null
    });
    index++;
  }

  return plaintiffs;
}

function extractDefendants(formData) {
  const defendants = [];
  let index = 1;

  while (formData[`defendant-${index}-first-name`]) {
    defendants.push({
      index,
      firstName: formData[`defendant-${index}-first-name`],
      lastName: formData[`defendant-${index}-last-name`]
    });
    index++;
  }

  return defendants;
}

module.exports = router;
```

### 3.3 Register Routes in server.js
```javascript
const contingencyRoutes = require('./routes/contingency');

// API routes
app.use('/api', contingencyRoutes);
```

---

## Phase 4: Frontend Implementation

### 4.1 Contingency Agreement Form HTML
**File:** `forms/agreement/index.html`

Key features:
- Simplified header: "Contingency Agreement Intake"
- Property address field
- Dynamic plaintiff sections with:
  - First name, last name
  - Address (single field)
  - Optional unit number
  - Email
  - Phone
  - Checkbox: "Is this person a minor?"
  - Conditional dropdown: "Select guardian" (shows other plaintiffs)
- Dynamic defendant sections with:
  - First name, last name only
- Submit button with confirmation modal
- Progress modal for document generation

### 4.2 Form Submission Logic
**File:** `forms/agreement/js/form-submission.js`

Adapted from docs form but simplified:
- Remove document type selection (only one document)
- Simplified validation
- Submit to `/api/contingency-entries`
- Same SSE progress tracking pattern
- Same email notification flow

### 4.3 Path Updates
Update all script/style references to use relative or absolute paths:
```html
<!-- Shared resources -->
<script src="/forms/shared/js/sse-client.js"></script>
<link rel="stylesheet" href="/forms/shared/css/common.css">

<!-- Form-specific resources -->
<script src="/forms/agreement/js/form-submission.js"></script>
```

---

## Phase 5: Domain & Deployment Configuration

### 5.1 Update Cloud Build Config
**File:** `cloudbuild-production.yaml`

Add separate Cloud Run services:
```yaml
# Deploy docs form
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'lipton-docs-form'
    - '--source=.'
    - '--region=us-central1'
    - '--set-env-vars=FORM_TYPE=docs'
    - '--update-secrets=DOCS_FORM_PASSWORD=DOCS_FORM_PASSWORD:latest'

# Deploy agreement form
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'lipton-agreement-form'
    - '--source=.'
    - '--region=us-central1'
    - '--set-env-vars=FORM_TYPE=agreement'
    - '--update-secrets=AGREEMENT_FORM_PASSWORD=AGREEMENT_FORM_PASSWORD:latest'
```

### 5.2 Domain Mapping
Configure Cloud Run domain mappings:

```bash
# Map docs.liptonlegal.com to docs form service
gcloud run domain-mappings create \
  --service lipton-docs-form \
  --domain docs.liptonlegal.com \
  --region us-central1

# Map agreement.liptonlegal.com to agreement form service
gcloud run domain-mappings create \
  --service lipton-agreement-form \
  --domain agreement.liptonlegal.com \
  --region us-central1
```

### 5.3 DNS Configuration
Add DNS records in your domain registrar:

```
Type: CNAME
Name: docs
Value: ghs.googlehosted.com
TTL: 3600

Type: CNAME
Name: agreement
Value: ghs.googlehosted.com
TTL: 3600
```

### 5.4 SSL Certificates
Google Cloud Run automatically provisions SSL certificates for custom domains. Wait 15-60 minutes after DNS configuration.

---

## Phase 6: Document Generation Integration

### 6.1 Install Dependencies
```bash
npm install docxtemplater pizzip
```

### 6.2 Copy Template to Project
**Source:** `LLG Contingency Fee Agreement - Template.docx`
**Destination:** `templates/contingency-agreement-template.docx`

```bash
mkdir -p templates
cp "LLG Contingency Fee Agreement - Template.docx" templates/contingency-agreement-template.docx
```

### 6.3 Document Generation Service
**File:** `services/contingency-document-service.js`

```javascript
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const logger = require('../monitoring/logger');

/**
 * Generate contingency agreement documents using docxtemplater
 * Creates one agreement per plaintiff
 *
 * @param {string} caseId - Case identifier
 * @param {Object} formData - Form submission data
 * @param {Array} plaintiffs - Array of plaintiff objects from database
 * @returns {Promise<Object>} Generation result with file paths for all agreements
 */
async function generateContingencyAgreements(caseId, formData, plaintiffs) {
  try {
    logger.info('Starting contingency agreement generation', {
      caseId,
      plaintiffCount: plaintiffs.length
    });

    // Load template once (reuse for all plaintiffs)
    const templatePath = path.join(__dirname, '../templates/contingency-agreement-template.docx');
    const templateContent = fsSync.readFileSync(templatePath, 'binary');

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../output/contingency-agreements', caseId);
    await fs.mkdir(outputDir, { recursive: true });

    const generatedFiles = [];

    // Generate one agreement per plaintiff
    for (let i = 0; i < plaintiffs.length; i++) {
      const plaintiff = plaintiffs[i];

      logger.info('Generating agreement for plaintiff', {
        caseId,
        plaintiffName: `${plaintiff.first_name} ${plaintiff.last_name}`,
        plaintiffIndex: i + 1
      });

      // Create new docxtemplater instance for this plaintiff
      const zip = new PizZip(templateContent);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Prepare template data for this specific plaintiff
      const templateData = prepareTemplateData(plaintiff);

      // Render document with plaintiff data
      doc.render(templateData);

      // Generate output buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });

      // Create filename with plaintiff name
      const plaintiffNameSlug = `${plaintiff.first_name}-${plaintiff.last_name}`.toLowerCase().replace(/\s+/g, '-');
      const filename = `${caseId}-contingency-agreement-${plaintiffNameSlug}.docx`;
      const outputPath = path.join(outputDir, filename);

      // Save to file
      await fs.writeFile(outputPath, buffer);

      generatedFiles.push({
        plaintiffId: plaintiff.id,
        plaintiffName: `${plaintiff.first_name} ${plaintiff.last_name}`,
        filename: filename,
        filePath: outputPath,
        size: buffer.length
      });

      logger.info('Agreement generated for plaintiff', {
        caseId,
        plaintiffName: `${plaintiff.first_name} ${plaintiff.last_name}`,
        filename,
        size: buffer.length
      });
    }

    logger.info('All contingency agreements generated successfully', {
      caseId,
      totalAgreements: generatedFiles.length,
      outputDir
    });

    return {
      success: true,
      caseId: caseId,
      agreementCount: generatedFiles.length,
      files: generatedFiles,
      outputDirectory: outputDir
    };

  } catch (error) {
    logger.error('Error generating contingency agreements', {
      caseId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Prepare template data for a single plaintiff
 *
 * @param {Object} plaintiff - Single plaintiff object from database
 * @returns {Object} Template data object for this plaintiff
 */
function prepareTemplateData(plaintiff) {
  // Build full name
  const fullName = `${plaintiff.first_name} ${plaintiff.last_name}`;

  // Build full address
  const addressParts = [plaintiff.address];
  if (plaintiff.unit_number) {
    addressParts.push(`Unit ${plaintiff.unit_number}`);
  }
  const fullAddress = addressParts.join(', ');

  // Format phone number
  const phoneNumber = formatPhoneNumber(plaintiff.phone);

  return {
    'Plaintiff Full Name': fullName,
    'Plaintiff Full Address': fullAddress,
    'Plaintiff Email Address': plaintiff.email,
    'Plaintiff Phone Number': phoneNumber
  };
}

/**
 * Format phone number to (XXX) XXX-XXXX format
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return as-is if not standard 10-digit format
  return phone;
}

module.exports = {
  generateContingencyAgreements,
  prepareTemplateData,
  formatPhoneNumber
};
```

### 6.4 Error Handling
Add custom error handler for docxtemplater errors:

```javascript
// Add to contingency-document-service.js

/**
 * Custom error handler for docxtemplater
 * Provides detailed error messages for template issues
 */
function handleDocxTemplateError(error) {
  if (error.properties && error.properties.errors instanceof Array) {
    const errorMessages = error.properties.errors
      .map((err) => {
        return `- ${err.message} at ${err.part}`;
      })
      .join('\n');

    throw new Error(`Template rendering failed:\n${errorMessages}`);
  }

  throw error;
}

// Update generateContingencyAgreement to use it:
try {
  doc.render(templateData);
} catch (error) {
  handleDocxTemplateError(error);
}
```

### 6.5 Update API Route for Document Generation
Add to `routes/contingency.js`:

```javascript
const { generateContingencyAgreements } = require('../services/contingency-document-service');

/**
 * POST /api/contingency-entries/:caseId/generate
 * Trigger document generation for a case (generates one agreement per plaintiff)
 */
router.post('/contingency-entries/:caseId/generate', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Get form data and plaintiffs from database
    const agreementResult = await pool.query(
      'SELECT form_data FROM contingency_agreements WHERE case_id = $1',
      [caseId]
    );

    if (agreementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const formData = agreementResult.rows[0].form_data;

    // Get all plaintiffs for this case
    const plaintiffsResult = await pool.query(
      'SELECT * FROM contingency_plaintiffs WHERE case_id = $1 ORDER BY plaintiff_index',
      [caseId]
    );

    if (plaintiffsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No plaintiffs found for this case' });
    }

    const plaintiffs = plaintiffsResult.rows;

    // Update status to processing
    await pool.query(
      'UPDATE contingency_agreements SET document_status = $1 WHERE case_id = $2',
      ['processing', caseId]
    );

    // Generate documents (one per plaintiff)
    const docResult = await generateContingencyAgreements(caseId, formData, plaintiffs);

    // Update status to completed with output directory
    await pool.query(
      'UPDATE contingency_agreements SET document_status = $1, document_url = $2 WHERE case_id = $3',
      ['completed', docResult.outputDirectory, caseId]
    );

    logger.info('Documents generated successfully', {
      caseId,
      agreementCount: docResult.agreementCount
    });

    res.json({
      success: true,
      caseId: caseId,
      agreementCount: docResult.agreementCount,
      files: docResult.files,
      outputDirectory: docResult.outputDirectory
    });

  } catch (error) {
    logger.error('Error generating documents', {
      caseId: req.params.caseId,
      error: error.message
    });

    // Update status to failed
    await pool.query(
      'UPDATE contingency_agreements SET document_status = $1 WHERE case_id = $2',
      ['failed', req.params.caseId]
    );

    res.status(500).json({
      success: false,
      error: 'Document generation failed',
      message: error.message
    });
  }
});
```

---

## Phase 7: Testing & Validation

### 7.1 Local Testing Checklist
- [ ] Password authentication works for both forms
- [ ] Session persistence (don't require password on refresh)
- [ ] Form submission saves to correct database table
- [ ] Plaintiffs and defendants correctly extracted and stored
- [ ] Guardian selection works for minor plaintiffs
- [ ] Email notifications send correctly
- [ ] Document generation triggers
- [ ] Progress modal updates correctly

### 7.2 Integration Testing
- [ ] Both forms accessible at their respective paths
- [ ] API endpoints respond correctly
- [ ] Database queries perform well
- [ ] Dropbox uploads work (if enabled)
- [ ] Email delivery works

### 7.3 Deployment Testing
- [ ] Cloud Run services deploy successfully
- [ ] Environment variables set correctly
- [ ] Secrets mounted properly
- [ ] DNS resolution works
- [ ] SSL certificates active
- [ ] Forms accessible at custom domains

---

## Phase 8: Deployment Steps

### 8.1 Pre-Deployment
1. **Create secrets in Google Secret Manager:**
```bash
# Create docs form password
echo -n "your-secure-docs-password" | gcloud secrets create DOCS_FORM_PASSWORD --data-file=-

# Create agreement form password
echo -n "your-secure-agreement-password" | gcloud secrets create AGREEMENT_FORM_PASSWORD --data-file=-

# Create session secret
echo -n "your-session-secret-key" | gcloud secrets create SESSION_SECRET --data-file=-
```

2. **Run database migrations:**
```bash
psql -h your-db-host -U your-user -d legal_forms_db -f migrations/003_create_contingency_agreements_table.sql
```

3. **Test locally:**
```bash
npm install express-session
npm test
npm start
# Visit http://localhost:3000/forms/docs
# Visit http://localhost:3000/forms/agreement
```

### 8.2 Deploy to Production
1. **Merge feature branch:**
```bash
git add .
git commit -m "feat: Add contingency agreement form with password protection"
git push origin feature/contingency-agreement-form

# Create PR and merge to main
```

2. **Trigger Cloud Build:**
```bash
gcloud builds submit --config=cloudbuild-production.yaml
```

3. **Configure domain mappings** (as outlined in Phase 5)

4. **Update DNS records** (as outlined in Phase 5)

5. **Verify SSL certificates:**
```bash
gcloud run domain-mappings describe --domain docs.liptonlegal.com --region us-central1
gcloud run domain-mappings describe --domain agreement.liptonlegal.com --region us-central1
```

### 8.3 Post-Deployment Validation
- [ ] Visit https://docs.liptonlegal.com
- [ ] Visit https://agreement.liptonlegal.com
- [ ] Test password authentication on both
- [ ] Submit test form on agreement portal
- [ ] Verify database entries
- [ ] Check email notifications
- [ ] Verify document generation

---

## Phase 9: Documentation & Handoff

### 9.1 User Documentation
Create `docs/CONTINGENCY_FORM_USER_GUIDE.md`:
- How to access the form
- Password management
- Form field explanations
- Guardian selection for minors
- Document delivery process

### 9.2 Admin Documentation
Create `docs/CONTINGENCY_FORM_ADMIN_GUIDE.md`:
- Database schema reference
- API endpoint documentation
- Password rotation procedures
- Troubleshooting guide
- Monitoring and logging

### 9.3 Developer Documentation
Update existing docs:
- Architecture overview
- Multi-form deployment pattern
- Shared resource management
- Testing procedures

---

## Implementation Timeline

### Week 1: Backend & Structure
- Day 1-2: Git setup, directory restructure, move existing files
- Day 3-4: Database schema, API routes, backend testing
- Day 5: Password authentication implementation

### Week 2: Frontend Development
- Day 1-2: Create agreement form HTML/CSS
- Day 3-4: Implement form submission logic, validation
- Day 5: Frontend testing and refinement

### Week 3: Integration & Deployment
- Day 1-2: Document generation service integration
- Day 3: Cloud Run configuration, domain mapping
- Day 4: Deployment to production
- Day 5: Post-deployment testing and fixes

### Week 4: Polish & Documentation
- Day 1-2: User acceptance testing
- Day 3-4: Documentation
- Day 5: Final handoff

---

## Rollback Plan

If issues arise during deployment:

1. **Immediate rollback:**
```bash
# Revert to previous Cloud Run revision
gcloud run services update-traffic lipton-docs-form --to-revisions PREVIOUS_REVISION=100
gcloud run services update-traffic lipton-agreement-form --to-revisions PREVIOUS_REVISION=100
```

2. **Database rollback:**
```bash
# Drop new tables if needed
psql -h your-db-host -U your-user -d legal_forms_db -c "DROP TABLE IF EXISTS contingency_defendants, contingency_plaintiffs, contingency_agreements CASCADE;"
```

3. **DNS rollback:**
- Remove or update CNAME records in domain registrar

---

## Success Metrics

- ✅ Both forms accessible at their respective domains
- ✅ Password protection working on both forms
- ✅ Form submissions saving to correct database tables
- ✅ Document generation completing successfully
- ✅ Email notifications delivering
- ✅ Zero downtime for existing docs form
- ✅ Page load time < 2 seconds
- ✅ Form submission success rate > 99%

---

## Document Generation Strategy

### Template Analysis
The contingency agreement template has been analyzed. It uses simple placeholder fields:
- `<Plaintiff Full Name>` - Full name of plaintiff(s)
- `<Plaintiff Full Address>` - Complete address
- `<Plaintiff Email Address>` - Email contact
- `<Plaintiff Phone Number>` - Phone contact

### Recommended Approach: **docxtemplater**

**Why docxtemplater?**
1. ✅ **Simple field replacement** - Template uses basic placeholders, perfect for docxtemplater
2. ✅ **Native Node.js** - No external Python/Java dependencies
3. ✅ **Fast execution** - In-memory processing, ~50-200ms generation time
4. ✅ **Already proven** - Similar to your existing PDF form filling approach
5. ✅ **Easy debugging** - Direct template editing in Word
6. ✅ **Multiple plaintiff support** - Can loop through plaintiff arrays

**Implementation:**
```javascript
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');

// Template data structure
const templateData = {
  plaintiffs: [
    {
      fullName: "John Doe",
      fullAddress: "123 Main St, Unit 4, Los Angeles, CA 90001",
      email: "john@example.com",
      phone: "(555) 123-4567"
    },
    // ... more plaintiffs
  ],
  // Use first plaintiff for singular fields
  plaintiffFullName: "John Doe, Jane Doe",  // Combined names
  plaintiffFullAddress: "123 Main St, Los Angeles, CA 90001",
  plaintiffEmailAddress: "john@example.com",
  plaintiffPhoneNumber: "(555) 123-4567"
};
```

**Alternative Considered: Docmosis**
- ❌ Requires external VM/service
- ❌ More complex setup
- ❌ Overkill for simple field replacement
- ✅ Better for complex templates with tables/logic

**Decision**: Use **docxtemplater** for simplicity and speed.

---

## Open Questions / Decisions Needed

1. ~~**Document Generation Method**~~ ✅ **RESOLVED: Use docxtemplater**
   - Simple placeholder replacement
   - Fast, native Node.js
   - No external dependencies

2. ~~**Multiple Plaintiff Handling**~~ ✅ **RESOLVED: Generate separate agreement per plaintiff**
   - Each plaintiff receives their own individual agreement
   - Plaintiff-specific information (name, address, email, phone) populated in their agreement
   - Multiple documents generated per case (one per plaintiff)
   - All agreements stored with case ID for organization

3. **Password Rotation**: Deferred - not a priority for initial launch

4. **Session Duration**: Deferred - 24 hours is sufficient for initial launch

5. **Monitoring**: Deferred - can be added post-launch

---

## Next Steps

1. Review and approve this plan
2. Provide contingency agreement document template (or placeholder structure)
3. Decide on document generation method
4. Create feature branch and begin Phase 1

---

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Author:** Claude Code
**Status:** Ready for Review
