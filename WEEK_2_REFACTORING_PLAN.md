# Week 2: Complete Refactoring - Detailed Action Plan

**Branch:** `dev/intake-system` (continue on same branch)
**Goal:** Extract all routes and services from server.js before building intake API
**Success Criteria:** server.js reduced from 2,988 lines to ~400 lines with zero breaking changes

---

## Overview

Week 1 built the foundation (database, services, middleware) but left server.js at 2,988 lines. This week completes the refactoring by extracting all routes and transformation logic into modular files.

**Why This Week Matters:**
- Clean architecture before adding new features
- Easier to maintain and test
- Follows original plan (Weeks 1-2 were supposed to be refactoring)
- Makes intake API development (Week 3) much faster

---

## Day 1: Extract Form Routes & Transformer Service

**Time:** 6-8 hours
**Lines to Extract:** ~1,300 lines from server.js

### Task 1.1: Create Form Transformer Service (3 hours)

**File:** `services/form-transformer.js`

**Purpose:** Extract all form data transformation logic from server.js

**Functions to Move:**
```javascript
// From server.js lines ~600-1700
- processFormData(rawData)
- processPlaintiffData(rawData, plaintiffNum)
- revertToOriginalFormat(processedData)
- All field mapping objects:
  - fieldMappings
  - governmentEntityMapping
  - trashProblemsMapping
  - noticesIssuesMapping
  - safetyIssuesMapping
  - utilityIssuesMapping
  - healthHazardMapping
  - structureMapping
- Value transformation utilities
```

**New File Structure:**
```javascript
/**
 * Form Transformer Service
 *
 * Handles transformation of raw HTML form data into structured JSON format.
 *
 * Key transformations:
 * 1. Checkbox selections → arrays and boolean flags
 * 2. Plaintiff/defendant data → unique IDs and structured objects
 * 3. Address data → full formatting
 * 4. Issue tracking → categorized discovery
 * 5. Normalized keys → human-readable format
 */

class FormTransformer {
  /**
   * Process raw form data into structured format
   * @param {Object} rawData - Raw form data from HTML form
   * @returns {Object} Processed and formatted data
   */
  static processFormData(rawData) {
    // Move entire processFormData function here
  }

  /**
   * Process plaintiff-specific checkbox data
   * @param {Object} rawData - Raw form data
   * @param {number} plaintiffNum - Plaintiff number (1-based)
   * @returns {Object} Plaintiff data with categorized issues
   */
  static processPlaintiffData(rawData, plaintiffNum) {
    // Move entire processPlaintiffData function here
  }

  /**
   * Revert normalized keys/values to original format
   * @param {Object} processedData - Data with normalized keys
   * @returns {Object} Data with original human-readable keys
   */
  static revertToOriginalFormat(processedData) {
    // Move entire revertToOriginalFormat function here
  }

  // Field mapping objects
  static get fieldMappings() {
    return {
      // Move all field mappings here
    };
  }

  // Other mapping objects
  static get governmentEntityMapping() { /* ... */ }
  static get trashProblemsMapping() { /* ... */ }
  static get noticesIssuesMapping() { /* ... */ }
  static get safetyIssuesMapping() { /* ... */ }
  static get utilityIssuesMapping() { /* ... */ }
  static get healthHazardMapping() { /* ... */ }
  static get structureMapping() { /* ... */ }
}

module.exports = FormTransformer;
```

**Testing:**
```bash
# Test transformer can be imported
node -e "const FormTransformer = require('./services/form-transformer'); console.log('✅ Transformer loaded');"

# Test with sample data
node -e "
const FormTransformer = require('./services/form-transformer');
const testData = { 'plaintiff-first-name-1': 'John', 'plaintiff-last-name-1': 'Doe' };
const result = FormTransformer.processFormData(testData);
console.log('✅ Transformation works:', result);
"
```

---

### Task 1.2: Create Form Routes (2 hours)

**File:** `routes/forms.js`

**Purpose:** Extract all `/api/form-entries/*` endpoints from server.js

**Endpoints to Move:**
- `POST /api/form-entries` (line 1723)
- `GET /api/form-entries` (line 1990)
- `GET /api/form-entries/:id` (line 2088)
- `PUT /api/form-entries/:id` (line 2165)
- `DELETE /api/form-entries/:id` (line 2215)
- `DELETE /api/form-entries/clear-all` (line 2122)

**New File Structure:**
```javascript
/**
 * Form Entry Routes
 *
 * Handles all CRUD operations for Phase 2 document generation system.
 * These routes accept form submissions, transform data, generate documents,
 * and trigger the Python pipeline for document processing.
 */

const express = require('express');
const router = express.Router();
const FormTransformer = require('../services/form-transformer');
const dropboxService = require('../dropbox-service');
const emailService = require('../email-service');
const databaseService = require('../services/database');
const axios = require('axios');
const logger = require('../monitoring/logger');
const { asyncHandler } = require('../middleware/error-handler');

/**
 * POST /api/form-entries
 * Create new form submission
 */
router.post('/', asyncHandler(async (req, res) => {
  // Move entire POST handler here
  // Uses FormTransformer.processFormData()
  // Uses FormTransformer.revertToOriginalFormat()
}));

/**
 * GET /api/form-entries
 * List all form submissions with pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  // Move entire GET handler here
}));

/**
 * GET /api/form-entries/:id
 * Get single form submission
 */
router.get('/:id', asyncHandler(async (req, res) => {
  // Move entire GET :id handler here
}));

/**
 * PUT /api/form-entries/:id
 * Update existing form submission
 */
router.put('/:id', asyncHandler(async (req, res) => {
  // Move entire PUT handler here
}));

/**
 * DELETE /api/form-entries/:id
 * Delete single form submission
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  // Move entire DELETE handler here
}));

/**
 * DELETE /api/form-entries/clear-all
 * Clear all form submissions (dev/testing only)
 */
router.delete('/clear-all', asyncHandler(async (req, res) => {
  // Move entire clear-all handler here
}));

module.exports = router;
```

**Update server.js:**
```javascript
// Add to imports
const formRoutes = require('./routes/forms');

// Add to route registration (after health routes)
app.use('/api/form-entries', requireAuth, formRoutes);

// Remove all old form-entry route handlers
// DELETE lines 1723-2260 (all form entry routes)
```

**Testing:**
```bash
# Deploy to dev
git add routes/forms.js services/form-transformer.js server.js
git commit -m "refactor: Extract form routes and transformer service"
git push origin dev/intake-system

# Wait 3-5 minutes for deploy

# Test each endpoint
NODE_URL="https://node-server-dev-zyiwmzwenq-uc.a.run.app"
ACCESS_TOKEN="<your-dev-token>"

# Test GET (should return existing entries)
curl -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries"

# Test POST (create new entry)
curl -X POST "$NODE_URL/api/form-entries" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plaintiff-first-name-1": "Test",
    "plaintiff-last-name-1": "User",
    "property-street-address-1": "123 Main St"
  }'

# Test GET :id (get single entry)
curl -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries/1"

# Verify logs show no errors
gcloud run logs read node-server-dev --region=us-central1 --limit=50
```

---

### Task 1.3: Documentation & Cleanup (1 hour)

**Update Files:**
- `WEEK_2_DAY_1_COMPLETE.md` - Document what was extracted
- `WEEK_2_PROGRESS.md` - Update progress tracker

**Verify:**
- server.js reduced by ~1,300 lines
- All form endpoints still work
- No breaking changes
- Logs show clean execution

**Commit:**
```bash
git add .
git commit -m "docs: Week 2 Day 1 complete - form routes extracted"
git push origin dev/intake-system
```

---

## Day 2: Extract Authentication & Pipeline Routes

**Time:** 5-7 hours
**Lines to Extract:** ~420 lines from server.js

### Task 2.1: Create Authentication Middleware (1 hour)

**File:** `middleware/auth.js`

**Purpose:** Extract ACCESS_TOKEN validation from server.js

**Current Location:** server.js line ~496

**New File:**
```javascript
/**
 * Authentication Middleware
 *
 * Handles ACCESS_TOKEN validation for protected routes.
 */

const logger = require('../monitoring/logger');
const { createUnauthorizedError } = require('./error-handler');

/**
 * Middleware to require ACCESS_TOKEN authentication
 *
 * Checks for valid ACCESS_TOKEN in Authorization header or query param.
 * Returns 401 if missing or invalid.
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
  // Skip auth for health endpoints
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  const expectedToken = process.env.ACCESS_TOKEN;

  if (!expectedToken) {
    logger.error('ACCESS_TOKEN not configured in environment');
    throw createUnauthorizedError('Server authentication not configured');
  }

  if (!token) {
    logger.warn('Request missing ACCESS_TOKEN', {
      path: req.path,
      ip: req.ip
    });
    throw createUnauthorizedError('ACCESS_TOKEN required');
  }

  if (token !== expectedToken) {
    logger.warn('Invalid ACCESS_TOKEN attempt', {
      path: req.path,
      ip: req.ip
    });
    throw createUnauthorizedError('Invalid ACCESS_TOKEN');
  }

  // Token valid, continue
  next();
}

module.exports = { requireAuth };
```

**Update server.js:**
```javascript
// Add to imports
const { requireAuth } = require('./middleware/auth');

// Keep existing usage
app.use(requireAuth);

// Remove old requireAuth function definition
```

**Testing:**
```bash
# Test without token (should fail)
curl "$NODE_URL/api/form-entries"

# Test with invalid token (should fail)
curl -H "Authorization: Bearer wrong-token" "$NODE_URL/api/form-entries"

# Test with valid token (should work)
curl -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries"
```

---

### Task 2.2: Create Pipeline Routes (3 hours)

**File:** `routes/pipeline.js`

**Purpose:** Extract all pipeline-related endpoints from server.js

**Endpoints to Move:**
- `GET /api/pipeline-status/:caseId` (line 2305)
- `GET /api/jobs/:jobId/stream` (line 2382)
- `POST /api/pipeline-retry/:caseId` (line 2579)
- `POST /api/regenerate-documents/:caseId` (line 2672)

**New File:**
```javascript
/**
 * Pipeline Routes
 *
 * Handles Python pipeline integration for document processing.
 * Provides status checking, real-time streaming, retry, and regeneration.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../monitoring/logger');
const { asyncHandler } = require('../middleware/error-handler');

/**
 * GET /api/pipeline-status/:caseId
 * Check status of pipeline job for a case
 */
router.get('/pipeline-status/:caseId', asyncHandler(async (req, res) => {
  // Move handler from server.js line 2305
}));

/**
 * GET /api/jobs/:jobId/stream
 * Server-Sent Events endpoint for real-time job progress
 */
router.get('/jobs/:jobId/stream', (req, res) => {
  // Move handler from server.js line 2382
  // Note: NOT wrapped in asyncHandler (SSE needs special handling)
});

/**
 * POST /api/pipeline-retry/:caseId
 * Retry failed pipeline job
 */
router.post('/pipeline-retry/:caseId', asyncHandler(async (req, res) => {
  // Move handler from server.js line 2579
}));

/**
 * POST /api/regenerate-documents/:caseId
 * Regenerate documents for existing case
 */
router.post('/regenerate-documents/:caseId', asyncHandler(async (req, res) => {
  // Move handler from server.js line 2672
}));

module.exports = router;
```

**Update server.js:**
```javascript
// Add to imports
const pipelineRoutes = require('./routes/pipeline');

// Add to route registration
app.use('/api', requireAuth, pipelineRoutes);

// Remove old pipeline route handlers
// DELETE lines 2305-2930 (all pipeline routes)
```

**Testing:**
```bash
# Test pipeline status
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$NODE_URL/api/pipeline-status/test-case-123"

# Test SSE streaming (should establish connection)
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: text/event-stream" \
  "$NODE_URL/api/jobs/test-job-123/stream"

# Check logs for pipeline calls
gcloud run logs read node-server-dev --region=us-central1 --limit=100 | grep pipeline
```

---

### Task 2.3: Documentation & Cleanup (1 hour)

**Update Files:**
- `WEEK_2_DAY_2_COMPLETE.md`
- `WEEK_2_PROGRESS.md`

**Verify:**
- server.js reduced by another ~420 lines
- All pipeline endpoints work
- SSE streaming works
- Authentication required on all routes

**Commit:**
```bash
git add .
git commit -m "refactor: Extract auth middleware and pipeline routes"
git push origin dev/intake-system
```

---

## Day 3: Extract Pipeline Service

**Time:** 4-6 hours
**Lines to Extract:** ~200 lines from routes/pipeline.js

### Task 3.1: Create Pipeline Service (3 hours)

**File:** `services/pipeline-service.js`

**Purpose:** Centralize Python API integration and SSE event handling

**New File:**
```javascript
/**
 * Pipeline Service
 *
 * Handles integration with Python pipeline API for document processing.
 * Provides job submission, status checking, and event streaming.
 */

const axios = require('axios');
const logger = require('../monitoring/logger');
const { createDatabaseError } = require('../middleware/error-handler');

class PipelineService {
  constructor() {
    this.pipelineUrl = process.env.PIPELINE_API_URL;
    this.enabled = process.env.PIPELINE_API_ENABLED === 'true';
    this.executeOnSubmit = process.env.EXECUTE_PIPELINE_ON_SUBMIT === 'true';
  }

  /**
   * Check if pipeline is available
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    if (!this.enabled) return false;

    try {
      const response = await axios.get(`${this.pipelineUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.warn('Pipeline health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Submit case to pipeline for processing
   * @param {string} caseId - Case identifier
   * @param {Object} caseData - Case data
   * @returns {Promise<Object>} Job result
   */
  async submitJob(caseId, caseData) {
    if (!this.enabled) {
      logger.info('Pipeline disabled, skipping submission');
      return { success: false, reason: 'Pipeline disabled' };
    }

    try {
      const response = await axios.post(
        `${this.pipelineUrl}/process`,
        { case_id: caseId, case_data: caseData },
        { timeout: 30000 }
      );

      logger.info('Pipeline job submitted', {
        caseId,
        jobId: response.data.job_id,
        status: response.data.status
      });

      return {
        success: true,
        jobId: response.data.job_id,
        status: response.data.status
      };
    } catch (error) {
      logger.error('Pipeline submission failed', {
        caseId,
        error: error.message
      });

      throw createDatabaseError('Pipeline submission failed', error);
    }
  }

  /**
   * Get status of pipeline job
   * @param {string} caseId - Case identifier
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(caseId) {
    if (!this.enabled) {
      return { status: 'disabled' };
    }

    try {
      const response = await axios.get(
        `${this.pipelineUrl}/status/${caseId}`,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { status: 'not_found' };
      }

      logger.error('Failed to get pipeline status', {
        caseId,
        error: error.message
      });

      throw createDatabaseError('Failed to get pipeline status', error);
    }
  }

  /**
   * Retry failed pipeline job
   * @param {string} caseId - Case identifier
   * @returns {Promise<Object>} Retry result
   */
  async retryJob(caseId) {
    if (!this.enabled) {
      return { success: false, reason: 'Pipeline disabled' };
    }

    try {
      const response = await axios.post(
        `${this.pipelineUrl}/retry/${caseId}`,
        {},
        { timeout: 30000 }
      );

      logger.info('Pipeline job retry initiated', {
        caseId,
        jobId: response.data.job_id
      });

      return {
        success: true,
        jobId: response.data.job_id,
        status: response.data.status
      };
    } catch (error) {
      logger.error('Pipeline retry failed', {
        caseId,
        error: error.message
      });

      throw createDatabaseError('Pipeline retry failed', error);
    }
  }

  /**
   * Create SSE stream for job events
   * @param {Response} res - Express response object
   * @param {string} jobId - Job identifier
   */
  async streamJobEvents(res, jobId) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!this.enabled) {
      res.write(`data: ${JSON.stringify({ error: 'Pipeline disabled' })}\n\n`);
      res.end();
      return;
    }

    try {
      // Connect to Python pipeline SSE endpoint
      const response = await axios.get(
        `${this.pipelineUrl}/jobs/${jobId}/stream`,
        {
          responseType: 'stream',
          timeout: 0 // No timeout for SSE
        }
      );

      // Forward events to client
      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.end();
      });

      response.data.on('error', (error) => {
        logger.error('SSE stream error', { jobId, error: error.message });
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      });

      // Handle client disconnect
      req.on('close', () => {
        response.data.destroy();
        logger.info('Client disconnected from SSE stream', { jobId });
      });

    } catch (error) {
      logger.error('Failed to establish SSE stream', {
        jobId,
        error: error.message
      });

      res.write(`data: ${JSON.stringify({ error: 'Failed to connect to pipeline' })}\n\n`);
      res.end();
    }
  }
}

// Singleton instance
const pipelineService = new PipelineService();

module.exports = pipelineService;
```

**Update routes/pipeline.js:**
```javascript
// Replace direct axios calls with pipelineService methods
const pipelineService = require('../services/pipeline-service');

router.get('/pipeline-status/:caseId', asyncHandler(async (req, res) => {
  const status = await pipelineService.getJobStatus(req.params.caseId);
  res.json(status);
}));

router.get('/jobs/:jobId/stream', (req, res) => {
  pipelineService.streamJobEvents(res, req.params.jobId);
});

// ... etc for other routes
```

**Testing:**
```bash
# Test full pipeline flow
# 1. Submit form entry (should trigger pipeline)
curl -X POST "$NODE_URL/api/form-entries" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... form data ... }'

# 2. Check pipeline status
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$NODE_URL/api/pipeline-status/<case-id>"

# 3. Stream events
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: text/event-stream" \
  "$NODE_URL/api/jobs/<job-id>/stream"
```

---

### Task 3.2: Update Health Check (1 hour)

**File:** `routes/health.js`

**Add pipeline health to detailed health check:**
```javascript
const pipelineService = require('../services/pipeline-service');

// In detailed health check
const pipelineHealth = await pipelineService.checkHealth();

healthStatus.integrations.pipeline = {
  status: pipelineHealth ? 'ok' : 'unavailable',
  enabled: pipelineService.enabled,
  url: pipelineService.pipelineUrl
};
```

---

### Task 3.3: Documentation & Cleanup (1 hour)

**Update Files:**
- `WEEK_2_DAY_3_COMPLETE.md`
- `WEEK_2_PROGRESS.md`

**Commit:**
```bash
git add .
git commit -m "refactor: Extract pipeline service and update health checks"
git push origin dev/intake-system
```

---

## Day 4: Extract Metrics & Consolidate Database

**Time:** 3-5 hours
**Lines to Extract:** ~120 lines from server.js

### Task 4.1: Create Metrics Route (1 hour)

**File:** `routes/metrics.js`

**Move:** `GET /metrics` endpoint from server.js

```javascript
/**
 * Metrics Routes
 *
 * Prometheus metrics endpoint for monitoring
 */

const express = require('express');
const router = express.Router();
const metricsModule = require('../monitoring/metrics');

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req, res) => {
  try {
    const metrics = await metricsModule.register.metrics();
    res.set('Content-Type', metricsModule.register.contentType);
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

module.exports = router;
```

**Update server.js:**
```javascript
const metricsRoutes = require('./routes/metrics');
app.use('/metrics', metricsRoutes);
```

---

### Task 4.2: Consolidate Database Config (2 hours)

**Move PostgreSQL pool configuration from server.js to services/database.js**

**Current:** server.js lines ~100-180 have pool config
**Target:** `services/database.js`

**Update services/database.js:**
```javascript
// Move pool configuration logic from server.js
const pool = new Pool({
  // Move all config from server.js
  host: process.env.DB_HOST,
  // ... etc
});

// Move pool event handlers
pool.on('error', ...);
pool.on('connect', ...);
```

**Update server.js:**
```javascript
// Remove pool configuration
// Just use databaseService

const databaseService = require('./services/database');
// Pool is already configured in service
```

---

### Task 4.3: Final server.js Cleanup (1 hour)

**Review server.js - should now only contain:**
1. Environment setup
2. Import statements
3. App initialization
4. Middleware registration
5. Route registration
6. Error handler registration
7. Server startup
8. Graceful shutdown

**Verify line count:**
```bash
wc -l server.js
# Should be ~400 lines (down from 2,988)
```

---

### Task 4.4: Documentation & Cleanup (1 hour)

**Create:** `WEEK_2_DAY_4_COMPLETE.md`
**Update:** `WEEK_2_PROGRESS.md`

**Commit:**
```bash
git add .
git commit -m "refactor: Extract metrics route and consolidate database config"
git push origin dev/intake-system
```

---

## Day 5: Testing, Documentation & Verification

**Time:** 6-8 hours

### Task 5.1: Integration Testing (3 hours)

**Create:** `tests/integration/week2-refactoring-tests.js`

**Test Coverage:**
1. ✅ Form routes (all CRUD operations)
2. ✅ Form transformer (data processing)
3. ✅ Pipeline routes (status, streaming, retry)
4. ✅ Pipeline service (job submission, health checks)
5. ✅ Authentication (token validation)
6. ✅ Metrics endpoint
7. ✅ Health checks (including new pipeline health)

**Run Tests:**
```bash
node tests/integration/week2-refactoring-tests.js
```

---

### Task 5.2: End-to-End Verification (2 hours)

**Full Flow Test:**
1. Submit form → Should create entry, upload to Dropbox, trigger pipeline
2. Check status → Should show pipeline progress
3. Stream events → Should receive real-time updates
4. Update entry → Should work
5. Delete entry → Should work
6. Check metrics → Should show activity

**Verify All Endpoints:**
```bash
# Health
curl "$NODE_URL/health/detailed"

# Forms (all CRUD)
curl -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries"

# Pipeline
curl -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/pipeline-status/test"

# Metrics
curl "$NODE_URL/metrics"
```

---

### Task 5.3: Documentation (2 hours)

**Create:**
1. `WEEK_2_SUMMARY.md` - Complete week summary
2. `ARCHITECTURE.md` - Updated architecture diagram
3. `WEEK_2_DAY_5_COMPLETE.md` - Final day completion

**Update:**
1. `README.md` - Update file structure
2. `WEEK_2_PROGRESS.md` - Mark 100% complete

**Document:**
- Files created (7 new files)
- Lines extracted (~2,000+ lines from server.js)
- server.js reduction (2,988 → ~400 lines)
- Zero breaking changes
- All tests passing

---

### Task 5.4: Final Commit & Verification (1 hour)

**Verify:**
- ✅ All tests passing
- ✅ server.js < 500 lines
- ✅ No breaking changes
- ✅ Deployment successful
- ✅ Health checks green
- ✅ All existing functionality works

**Final Commit:**
```bash
git add .
git commit -m "feat: Week 2 complete - refactoring finished

SUMMARY:
- Extracted 7 new files (routes/services)
- Reduced server.js from 2,988 to ~400 lines (86% reduction)
- Zero breaking changes
- All integration tests passing
- Clean modular architecture ready for intake API

FILES CREATED:
- routes/forms.js (form entry CRUD)
- routes/pipeline.js (pipeline endpoints)
- routes/metrics.js (Prometheus metrics)
- services/form-transformer.js (data transformation)
- services/pipeline-service.js (Python API integration)
- middleware/auth.js (ACCESS_TOKEN validation)
- tests/integration/week2-refactoring-tests.js (49 tests)

FILES MODIFIED:
- server.js (reduced 86%)
- routes/health.js (added pipeline health)
- services/database.js (consolidated config)

METRICS:
- Lines extracted: ~2,000+
- Files created: 7
- Tests added: 49
- Breaking changes: 0
- Deployment time: 3 minutes
- All endpoints verified working

🚀 Generated with Claude Code
"

git push origin dev/intake-system
```

---

## Success Metrics

### Code Quality
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| server.js lines | 2,988 | ~400 | 86% reduction |
| Route files | 1 | 4 | 4x better organization |
| Service files | 3 | 5 | Clearer responsibilities |
| Test coverage | 42 tests | 91 tests | +49 tests |

### Maintainability
- ✅ Clear separation of concerns
- ✅ Single Responsibility Principle
- ✅ Reusable services
- ✅ Testable modules
- ✅ Clear dependencies

### Performance
- ✅ No performance regression
- ✅ Deployment time unchanged
- ✅ Response times same or better
- ✅ Memory usage stable

---

## Week 2 Completion Checklist

### Day 1: Form Routes & Transformer
- [ ] Created `services/form-transformer.js`
- [ ] Created `routes/forms.js`
- [ ] Updated `server.js`
- [ ] All form endpoints tested and working
- [ ] Committed and deployed

### Day 2: Auth & Pipeline Routes
- [ ] Created `middleware/auth.js`
- [ ] Created `routes/pipeline.js`
- [ ] Updated `server.js`
- [ ] All pipeline endpoints tested
- [ ] Auth protection verified
- [ ] Committed and deployed

### Day 3: Pipeline Service
- [ ] Created `services/pipeline-service.js`
- [ ] Updated `routes/pipeline.js`
- [ ] Updated `routes/health.js`
- [ ] Full pipeline flow tested
- [ ] SSE streaming verified
- [ ] Committed and deployed

### Day 4: Metrics & Database
- [ ] Created `routes/metrics.js`
- [ ] Updated `services/database.js`
- [ ] Cleaned up `server.js`
- [ ] Verified server.js < 500 lines
- [ ] All endpoints still working
- [ ] Committed and deployed

### Day 5: Testing & Documentation
- [ ] Created `tests/integration/week2-refactoring-tests.js`
- [ ] All 49 tests passing
- [ ] End-to-end flow verified
- [ ] Created Week 2 summary docs
- [ ] Updated architecture docs
- [ ] Final commit with complete summary

---

## What's Next: Week 3 - Intake API

With clean architecture in place, Week 3 can focus entirely on building the intake submission API:

**Week 3 Preview:**
- Day 1: `POST /api/intake/submit` endpoint
- Day 2: `GET /api/intake` with pagination
- Day 3: `PUT /api/intake/:id` and `DELETE`
- Day 4: File upload endpoint
- Day 5: Testing & documentation

**Benefits of Refactoring First:**
- ✅ Clean foundation to build on
- ✅ Reusable services (transformer, pipeline, storage)
- ✅ Clear patterns to follow
- ✅ Won't pollute server.js
- ✅ Faster development

---

**Status:** 📋 **READY TO START**
**Next Action:** Begin Week 2 Day 1 - Extract form routes & transformer
