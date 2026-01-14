/**
 * Legal Form Application - Express Server
 *
 * This server handles form submissions for a legal document application,
 * transforming raw HTML form data into structured JSON format with human-readable keys and values.
 *
 * Key Data Transformation Features:
 * - Converts checkbox selections into arrays and boolean flags
 * - Generates unique IDs for plaintiffs and defendants
 * - Structures address data with full formatting
 * - Processes discovery/issue tracking for multiple issue categories
 * - Reverts normalized keys to original human-readable format (e.g., "Fire Hazard", "Common areas")
 * - Adjusts value casing/spelling to match original specifications (e.g., "Air Conditioner", "Smoke Alarms")
 *
 * Output Format Transformation:
 * The system performs a two-stage transformation:
 * 1. First, raw form data is transformed into a normalized structured format with PascalCase keys
 * 2. Then, keys and values are reverted to their original human-readable forms:
 *    - Keys: "FireHazard" → "Fire Hazard", "CommonAreas" → "Common areas",
 *            "UtilityInterruptions" → "Checkbox 44n6i", etc.
 *    - Values: "Air conditioner" → "Air Conditioner", "Smoke alarms" → "Smoke Alarms",
 *              "Improper servicing/emptying" → "Properly servicing and emptying receptacles", etc.
 *
 * Important Notes on Boolean Flags:
 * - All Has_ prefix flags have been REMOVED from the output
 * - Categories like TrashProblems, NoticesIssues, Safety, and UtilityIssues
 *   populate their arrays (SelectTrashProblems, SelectNoticesIssues, SelectSafetyIssues,
 *   UtilityInterruptions) but DO NOT create top-level boolean flags
 * - This design prevents redundant boolean flags and keeps the output clean
 *
 * Last Updated: 2025-10-07
 * Recent Changes:
 * - Added revertToOriginalFormat() function to transform normalized keys/values back to original format
 * - Implemented recursive transformation for all nested objects and arrays
 * - Updated POST endpoint to apply transformation before saving JSON files
 * - Consolidated Plumbing values to use "Clogged bath/shower/sink/toilet"
 * - Reordered HealthHazard values (Mold, Mildew, Mushrooms, Raw sewage, Noxious fumes, Chemical/paint, Toxic water, Offensive odors)
 * - Updated Structure weatherproofing text: "Ineffective Weatherproofing of any windows doors"
 * - Normalized SelectSafetyIssues to use "Broken/inoperable security gate" (no spaces around /)
 * - Added automatic array deduplication to prevent duplicate values when multiple checkboxes map to the same consolidated value
 */

// Load environment variables from .env file
require('dotenv').config();

// Fix: DROPBOX_ENABLED is being set to 'false' externally before dotenv loads
// Force it to match the .env file value for development
if (process.env.NODE_ENV === 'development' && process.env.DROPBOX_ENABLED === 'false') {
  process.env.DROPBOX_ENABLED = 'true';
  console.log('✅ Overrode DROPBOX_ENABLED to match .env file (was set to false externally)');
}

// Validate environment variables before starting
// This ensures all required configuration is present and fails fast with clear errors
const envValidator = require('./config/env-validator');
envValidator.validate();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');
const dropboxService = require('./dropbox-service');
const emailService = require('./email-service');
const { Storage } = require('@google-cloud/storage');

// Monitoring and metrics
const metricsModule = require('./monitoring/metrics');
const { metricsMiddleware } = require('./monitoring/middleware');

// Logging
const logger = require('./monitoring/logger');
const {
    requestLoggingMiddleware,
    errorLoggingMiddleware
} = require('./monitoring/log-middleware');

// Health checks
const {
    checkLiveness,
    checkReadiness,
    checkDetailed,
    sendHealthResponse
} = require('./monitoring/health-checks');

// Routes
const healthRoutes = require('./routes/health');
const formRoutes = require('./routes/forms');
const contingencyRoutes = require('./routes/contingency');
const pipelineRoutes = require('./routes/pipeline');
const metricsRoutes = require('./routes/metrics');

// Services
const FormTransformer = require('./services/form-transformer');
const pipelineService = require('./services/pipeline-service');

// Middleware
const { errorHandler } = require('./middleware/error-handler');
const { requireAuth, getAuthConfig } = require('./middleware/auth');
const { createPasswordAuth, createLogoutHandler } = require('./middleware/password-auth');
const { restrictFormAccess } = require('./middleware/domain-restriction');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Access Control Configuration
 *
 * Secures the application with token-based authentication when deployed to production.
 * In development mode (NODE_ENV !== 'production'), authentication is bypassed.
 * Health check endpoints always bypass authentication for GCP monitoring.
 */
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const REQUIRE_AUTH = process.env.NODE_ENV === 'production';

/**
 * Authentication Middleware
 *
 * Checks for access token in URL query (?token=xxx) or Authorization header (Bearer xxx).
 * Blocks unauthorized requests with 401 status.
 *
 * Static assets (JS, CSS, images, fonts) are excluded from authentication since they
 * contain no sensitive data and are required for the application to function properly.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
// Authentication middleware moved to middleware/auth.js

// Log authentication configuration
const authConfig = getAuthConfig();
console.log('🔒 Access Control:', authConfig);

/**
 * Python Normalization Pipeline Configuration
 *
 * Configuration for calling the Python FastAPI service that runs
 * the 5-phase normalization pipeline on form submissions.
 */
const PIPELINE_CONFIG = {
    apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:8000',
    enabled: process.env.PIPELINE_API_ENABLED !== 'false',
    timeout: parseInt(process.env.PIPELINE_API_TIMEOUT) || 300000, // Increase to 300s (5 minutes)
    apiKey: process.env.PIPELINE_API_KEY || '',
    executeOnSubmit: process.env.EXECUTE_PIPELINE_ON_SUBMIT !== 'false',
    continueOnFailure: process.env.CONTINUE_ON_PIPELINE_FAILURE !== 'false'
};

console.log('📋 Pipeline Configuration:', {
    apiUrl: PIPELINE_CONFIG.apiUrl,
    enabled: PIPELINE_CONFIG.enabled,
    executeOnSubmit: PIPELINE_CONFIG.executeOnSubmit
});


/**
 * PostgreSQL Connection Pool Configuration
 *
 * Optimized pool settings for performance and reliability.
 *
 * Performance Settings:
 * - max: 20 connections (balanced for concurrent requests)
 * - idleTimeoutMillis: 30000 (close idle connections after 30s)
 * - connectionTimeoutMillis: 2000 (fail fast on connection issues)
 * - maxUses: 7500 (rotate connections to prevent memory leaks)
 * - allowExitOnIdle: true (allow process to exit when idle)
 *
 * Tuning Notes:
 * - Increase 'max' for high-traffic scenarios (monitor with pg_stat_activity)
 * - Decrease 'idleTimeoutMillis' if connection limits are reached
 * - Monitor query performance with EXPLAIN ANALYZE
 */
const pool = new Pool({
    user: process.env.DB_USER || 'ryanhaines',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'legal_forms_db',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    max: 20,                          // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,         // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000,    // Return error after 2 seconds if connection not available
    maxUses: 7500,                    // Close and replace connection after 7500 uses
    allowExitOnIdle: true             // Allow pool to exit process when idle
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Database connected successfully');
    }
});

// Cloud Storage Configuration
// Initialize Google Cloud Storage client for form submissions
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || `${process.env.GCLOUD_PROJECT || 'docmosis-tornado'}-form-submissions`;
const bucket = storage.bucket(BUCKET_NAME);

console.log('☁️  Cloud Storage Configuration:', {
    bucketName: BUCKET_NAME,
    projectId: process.env.GCLOUD_PROJECT || 'auto-detected'
});

// Legacy: Keep data directory for local development fallback
const dataDir = path.join(__dirname, 'data');
const USE_CLOUD_STORAGE = process.env.NODE_ENV === 'production';

if (!USE_CLOUD_STORAGE && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Using local file storage (development mode)');
} else if (USE_CLOUD_STORAGE) {
    console.log('☁️  Using Cloud Storage (production mode)');
}

/**
 * File Storage Abstraction Layer
 *
 * Helper functions to abstract file operations, supporting both:
 * - Local filesystem (development)
 * - Google Cloud Storage (production)
 */

// Write JSON data to storage
async function saveFormData(filename, data) {
    const jsonData = JSON.stringify(data, null, 2);

    if (USE_CLOUD_STORAGE) {
        const file = bucket.file(filename);
        await file.save(jsonData, {
            contentType: 'application/json',
            metadata: {
                cacheControl: 'no-cache'
            }
        });
        console.log(`☁️  Saved to GCS: ${filename}`);
    } else {
        const filepath = path.join(dataDir, filename);
        fs.writeFileSync(filepath, jsonData);
        console.log(`📁 Saved locally: ${filename}`);
    }
}

// Read JSON data from storage
async function readFormData(filename) {
    if (USE_CLOUD_STORAGE) {
        const file = bucket.file(filename);
        const [contents] = await file.download();
        return JSON.parse(contents.toString());
    } else {
        const filepath = path.join(dataDir, filename);
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
}

// Check if file exists
async function formDataExists(filename) {
    if (USE_CLOUD_STORAGE) {
        const file = bucket.file(filename);
        const [exists] = await file.exists();
        return exists;
    } else {
        const filepath = path.join(dataDir, filename);
        return fs.existsSync(filepath);
    }
}

// List all form entries
async function listFormEntries() {
    if (USE_CLOUD_STORAGE) {
        const [files] = await bucket.getFiles({ prefix: 'form-entry-' });
        return files.map(file => ({
            name: file.name,
            size: file.metadata.size,
            created: file.metadata.timeCreated,
            updated: file.metadata.updated
        }));
    } else {
        const files = fs.readdirSync(dataDir)
            .filter(file => file.startsWith('form-entry-') && file.endsWith('.json'));
        return files.map(file => {
            const filepath = path.join(dataDir, file);
            const stats = fs.statSync(filepath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime,
                updated: stats.mtime
            };
        });
    }
}

// Delete form entry
async function deleteFormData(filename) {
    if (USE_CLOUD_STORAGE) {
        const file = bucket.file(filename);
        await file.delete();
        console.log(`☁️  Deleted from GCS: ${filename}`);
    } else {
        const filepath = path.join(dataDir, filename);
        fs.unlinkSync(filepath);
        console.log(`📁 Deleted locally: ${filename}`);
    }
}


// Middleware
app.use(cors());

// Session middleware for password authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'lipton-legal-secret-key-change-in-production',
    resave: true, // Force session save on each request (Cloud Run compatibility)
    saveUninitialized: true, // Save even empty sessions (Cloud Run compatibility)
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Allow cookies across same-site redirects
    },
    // Use MemoryStore explicitly (note: sessions won't persist across container instances in Cloud Run)
    // For production with multiple instances, consider using connect-pg-simple or similar
    proxy: true // Trust proxy headers (required for Cloud Run)
}));

// Winston structured logging (must be early in middleware chain)
app.use(requestLoggingMiddleware);

// Prometheus metrics collection (must be early in middleware chain)
app.use(metricsMiddleware);

/**
 * Performance Optimization: Gzip/Brotli Compression
 *
 * Compresses all responses to reduce bandwidth and improve load times.
 * Typically achieves 70-80% size reduction for text-based assets.
 *
 * Configuration:
 * - level: 6 (balanced compression ratio vs CPU usage)
 * - threshold: 1024 bytes (don't compress tiny responses)
 * - filter: Only compress compressible content types
 */
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Performance Optimization: HTTP Caching Headers
 *
 * Implements aggressive caching strategy for static assets while ensuring
 * HTML content is revalidated. Reduces unnecessary network requests.
 *
 * Cache Strategy:
 * - Static assets (.js, .css, images): 1 year with immutable flag
 * - HTML files: 5 minutes with must-revalidate
 * - API responses: No cache (always fresh data)
 *
 * Impact: 95% reduction in bandwidth for returning users
 */
app.use((req, res, next) => {
    // Cache static assets for 1 year (immutable)
    if (req.url.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf|eot|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    }
    // Cache HTML for 5 minutes with revalidation
    else if (req.url.endsWith('.html') || req.url === '/') {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
    // No cache for API endpoints (always get fresh data)
    else if (req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Mount health check routes (no auth required for health checks)
app.use('/health', healthRoutes);

// Mount metrics route (Week 2 Day 4: Extracted to routes/metrics.js)
app.use('/metrics', metricsRoutes);

// Apply authentication to all routes (except health checks, handled in middleware)
app.use(requireAuth);

// Root redirect - send users to the appropriate form
app.get('/', (req, res) => {
    // Check hostname to determine which form to redirect to
    const hostname = req.hostname || req.headers.host || '';

    if (hostname.includes('agreement.liptonlegal.com')) {
        res.redirect('/forms/agreement/');
    } else if (hostname.includes('docs.liptonlegal.com')) {
        res.redirect('/forms/docs/');
    } else {
        // Default fallback (for localhost or unknown domains)
        res.redirect('/forms/agreement/');
    }
});

// Enforce domain-specific form access restrictions
app.use(restrictFormAccess);

// Password-protect document generation form
app.use('/forms/docs', createPasswordAuth('docs'));

// Password-protect contingency agreement form
app.use('/forms/agreement', createPasswordAuth('agreement'));

// Serve static files from forms directory structure (after password auth)
app.use('/forms', express.static(path.join(__dirname, 'forms')));

// Mount PDF generation routes
const pdfRoutes = require('./server/routes/pdf-routes');
app.use('/api/pdf', pdfRoutes);

// Initialize and mount form routes with helper function injection
formRoutes.initializeRouter({
    saveFormData,
    readFormData,
    deleteFormData,
    formDataExists,
    listFormEntries,
    saveToDatabase,
    pipelineService,  // Week 2 Day 3: Now uses pipeline service
    metricsModule,
    PIPELINE_CONFIG: pipelineService.getConfig()  // Get config from service
});
app.use('/api/form-entries', formRoutes);

// Contingency agreement routes
app.use('/api', contingencyRoutes);

// Initialize and mount pipeline routes with helper function injection
// Week 2 Day 3: Pipeline now uses pipelineService directly (imported in routes file)
pipelineRoutes.initializeRouter({
    pool,
    formDataExists,
    readFormData,
    dataDir
});
app.use('/api', pipelineRoutes);

/**
 * Transform raw form data into structured format matching goalOutput.md
 */
// All transformation functions moved to services/form-transformer.js
// - transformFormData()
// - extractIssueData()
// - buildFullAddress()
// - getStateName()
// - generateShortId()
// - revertToOriginalFormat()

/**
 * Save form data to PostgreSQL database
 * Creates case, parties, and issue selections based on the structured data
 *
 * Database Schema Note:
 * - submitter_name: VARCHAR(255) - Name of person who submitted the form
 * - submitter_email: VARCHAR(255) - Email address of form submitter
 *
 * Default Values:
 * - If user skips notification: submitter_name='Anonymous', submitter_email=''
 * - If user provides info: uses actual values from notificationName and notificationEmail
 */

async function saveToDatabase(structuredData, rawPayload, documentTypes = ['srogs', 'pods', 'admissions']) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Insert case with submitter information
        // submitter_name and submitter_email track who submitted the form
        // These fields are populated from the email notification modal
        // PHASE 2.1: Added document_types_to_generate field
        const caseResult = await client.query(
            `INSERT INTO cases (
                property_address, city, state, zip_code, county, filing_location,
                internal_name, form_name, raw_payload, is_active, submitter_name, submitter_email,
                document_types_to_generate
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                structuredData.Full_Address?.StreetAddress || structuredData.Full_Address?.Line1,
                structuredData.Full_Address?.City,
                structuredData.Full_Address?.State?.substring(0, 2)?.toUpperCase() || 'NC',
                structuredData.Full_Address?.PostalCode,
                structuredData.FilingCounty || structuredData['Filing county'],
                structuredData.FilingCity || structuredData['Filing city'],
                structuredData.Form?.InternalName,
                structuredData.Form?.Name,
                JSON.stringify(rawPayload),
                true,
                // Submitter information from email notification modal
                // Defaults to 'Anonymous' and '' if user skipped
                rawPayload.notificationName || 'Anonymous',
                rawPayload.notificationEmail || '',
                // PHASE 2.1: Store document selection as JSON array
                JSON.stringify(documentTypes)
            ]
        );

        const caseId = caseResult.rows[0].id;
        console.log(`📊 Created case with ID: ${caseId}`);

        // 2. Insert plaintiffs
        const plaintiffs = structuredData.PlaintiffDetails || [];
        const plaintiffIds = {};

        for (let i = 0; i < plaintiffs.length; i++) {
            const plaintiff = plaintiffs[i];
            const plaintiffResult = await client.query(
                `INSERT INTO parties (
                    case_id, party_type, party_number, first_name, last_name, full_name,
                    plaintiff_type, age_category, is_head_of_household, unit_number
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id`,
                [
                    caseId,
                    'plaintiff',
                    plaintiff.ItemNumber || (i + 1),
                    plaintiff.PlaintiffItemNumberName?.First,
                    plaintiff.PlaintiffItemNumberName?.Last,
                    plaintiff.PlaintiffItemNumberName?.FirstAndLast,
                    plaintiff.PlaintiffItemNumberType,
                    plaintiff.PlaintiffItemNumberAgeCategory?.[0],
                    plaintiff.HeadOfHousehold || false,
                    plaintiff.PlaintiffItemNumberDiscovery?.Unit
                ]
            );

            const plaintiffId = plaintiffResult.rows[0].id;
            plaintiffIds[plaintiff.ItemNumber || (i + 1)] = plaintiffId;
            console.log(`👤 Created plaintiff: ${plaintiff.PlaintiffItemNumberName?.FirstAndLast} (ID: ${plaintiffId})`);

            // 3. Insert issue selections for this plaintiff (if head of household)
            if (plaintiff.HeadOfHousehold && plaintiff.PlaintiffItemNumberDiscovery) {
                const discovery = plaintiff.PlaintiffItemNumberDiscovery;
                // Convert boolean flags to array items for Direct Yes/No issues
                const directYesNoItems = [];
                if (discovery.InjuryIssues) directYesNoItems.push('Injury Issues');
                if (discovery.NonresponsiveLandlordIssues || discovery['Nonresponsive landlord Issues']) directYesNoItems.push('Nonresponsive Landlord Issues');
                if (discovery.UnauthorizedEntries || discovery['Unauthorized entries']) directYesNoItems.push('Unauthorized Entries');
                if (discovery.StolenItems || discovery['Stolen items']) directYesNoItems.push('Stolen Items');
                if (discovery.DamagedItems || discovery['Damaged items']) directYesNoItems.push('Damaged Items');
                if (discovery.AgeDiscrimination || discovery['Age discrimination']) directYesNoItems.push('Age Discrimination');
                if (discovery.RacialDiscrimination || discovery['Racial Discrimination']) directYesNoItems.push('Racial Discrimination');
                if (discovery.DisabilityDiscrimination || discovery['Disability discrimination']) directYesNoItems.push('Disability Discrimination');
                if (discovery.SecurityDeposit || discovery['Security Deposit']) directYesNoItems.push('Security Deposit Issues');

                const issueArrays = [
                    { category: 'vermin', items: discovery.Vermin || [] },
                    { category: 'insects', items: discovery.Insects || [] },
                    { category: 'hvac', items: discovery.HVAC || [] },
                    { category: 'electrical', items: discovery.Electrical || [] },
                    { category: 'fire_hazard', items: discovery.FireHazard || discovery['Fire Hazard'] || [] },
                    { category: 'government', items: discovery.SpecificGovernmentEntityContacted || discovery['Specific Government Entity Contacted'] || [] },
                    { category: 'plumbing', items: discovery.Plumbing || [] },
                    { category: 'structure', items: discovery.Structure || [] },
                    { category: 'flooring', items: discovery.Flooring || [] },
                    { category: 'cabinets', items: discovery.Cabinets || [] },
                    { category: 'doors', items: discovery.Doors || [] },
                    { category: 'windows', items: discovery.Windows || [] },
                    { category: 'common_areas', items: discovery.CommonAreas || discovery['Common areas'] || [] },
                    { category: 'nuisance', items: discovery.Nuisance || [] },
                    { category: 'health_hazard', items: discovery.HealthHazard || discovery['Health hazard'] || [] },
                    { category: 'appliances', items: discovery.Appliances || [] },
                    { category: 'harassment', items: discovery.Harassment || [] },
                    { category: 'safety', items: discovery.SelectSafetyIssues || discovery['Select Safety Issues'] || [] },
                    { category: 'notices', items: discovery.SelectNoticesIssues || discovery['Select Notices Issues'] || [] },
                    { category: 'utility', items: discovery.UtilityInterruptions || discovery['Checkbox 44n6i'] || [] },
                    { category: 'trash', items: discovery.SelectTrashProblems || discovery['Select Trash Problems'] || [] },
                    { category: 'direct_yesno', items: directYesNoItems }
                ];

                for (const issueArray of issueArrays) {
                    for (const itemName of issueArray.items) {
                        // Find the issue option by name
                        const optionResult = await client.query(
                            `SELECT io.id
                             FROM issue_options io
                             JOIN issue_categories ic ON io.category_id = ic.id
                             WHERE ic.category_code = $1 AND io.option_name ILIKE $2`,
                            [issueArray.category, itemName]
                        );

                        if (optionResult.rows.length > 0) {
                            const optionId = optionResult.rows[0].id;
                            await client.query(
                                `INSERT INTO party_issue_selections (party_id, issue_option_id)
                                 VALUES ($1, $2)
                                 ON CONFLICT (party_id, issue_option_id) DO NOTHING`,
                                [plaintiffId, optionId]
                            );
                        } else {
                            console.warn(`⚠️  Issue option not found: ${issueArray.category} - ${itemName}`);
                        }
                    }
                }
            }
        }

        // 4. Insert defendants
        const defendants = structuredData.DefendantDetails2 || [];

        for (let i = 0; i < defendants.length; i++) {
            const defendant = defendants[i];
            await client.query(
                `INSERT INTO parties (
                    case_id, party_type, party_number, first_name, last_name, full_name,
                    entity_type, role
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    caseId,
                    'defendant',
                    defendant.ItemNumber || (i + 1),
                    defendant.DefendantItemNumberName?.First,
                    defendant.DefendantItemNumberName?.Last,
                    defendant.DefendantItemNumberName?.FirstAndLast,
                    defendant.DefendantItemNumberType,
                    defendant.DefendantItemNumberManagerOwner
                ]
            );

            console.log(`⚖️  Created defendant: ${defendant.DefendantItemNumberName?.FirstAndLast}`);
        }

        await client.query('COMMIT');
        console.log('✅ Database transaction completed successfully');

        return caseId;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// ============================================================
// Form Entry Routes - Moved to routes/forms.js
// ============================================================
// All /api/form-entries routes have been extracted to routes/forms.js
// This includes:
// - POST /api/form-entries (create form submission)
// - GET /api/form-entries (list all submissions)
// - GET /api/form-entries/:id (get single submission)
// - PUT /api/form-entries/:id (update submission)
// - DELETE /api/form-entries/:id (delete single submission)
// - DELETE /api/form-entries/clear-all (clear all submissions)
//
// The routes are initialized below with helper function injection
// ============================================================

/**
 * Health Check Endpoints
 *
 * MOVED TO: routes/health.js
 * These endpoints have been extracted to a separate router module for better organization.
 * The router is mounted at /health in the middleware section above.
 *
 * Three levels of health checks:
 * 1. /health or /api/health - Liveness probe (is app running?)
 * 2. /health/ready - Readiness probe (is app ready for traffic?)
 * 3. /health/detailed - Full diagnostics (all components)
 */

// Health routes now handled by routes/health.js (see line ~490)

// ============================================================
// Pipeline Routes - Moved to routes/pipeline.js
// ============================================================
// All /api/pipeline-* and /api/jobs/* routes have been extracted to routes/pipeline.js
// This includes:
// - GET /api/pipeline-status/:caseId (pipeline status polling)
// - GET /api/jobs/:jobId/stream (SSE real-time progress)
// - POST /api/pipeline-retry/:caseId (retry failed pipeline)
// - POST /api/regenerate-documents/:caseId (regenerate with new doc types)
//
// The routes are initialized below with helper function injection
// ============================================================

// Removed pipeline routes - now in routes/pipeline.js
// Previously started here at line 1165

// Logout routes
app.get('/forms/docs/logout', createLogoutHandler('docs'));
app.get('/forms/agreement/logout', createLogoutHandler('agreement'));

// Review page route
app.get('/review.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'review.html'));
});

// Success page route
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Error logging middleware (logs errors before handling)
app.use(errorLoggingMiddleware);

// Centralized error handler (from middleware/error-handler.js)
// This handler provides consistent error responses and proper logging
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    logger.info('Server started', {
        port: PORT,
        host: '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        dataDirectory: dataDir
    });

    // Also log to console for visibility during development
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Data directory: ${dataDir}`);
    console.log(`📊 Form available at: http://localhost:${PORT}`);
    console.log(`🔍 API endpoints:`);
    console.log(`   POST   /api/form-entries     - Save form entry`);
    console.log(`   GET    /api/form-entries     - List all entries`);
    console.log(`   GET    /api/form-entries/:id - Get specific entry`);
    console.log(`   PUT    /api/form-entries/:id - Update entry`);
    console.log(`   DELETE /api/form-entries/:id - Delete entry`);
    console.log(`   DELETE /api/form-entries/clear-all - Delete all entries`);
    console.log(`   GET    /health              - Liveness probe`);
    console.log(`   GET    /health/ready        - Readiness probe`);
    console.log(`   GET    /health/detailed     - Detailed diagnostics`);
    console.log(`   GET    /metrics             - Prometheus metrics`);
});
// Deployment test with full permissions - 1762179555
