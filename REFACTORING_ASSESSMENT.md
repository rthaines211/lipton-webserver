# server.js Refactoring Assessment

**Date:** November 17, 2025
**Current Status:** Week 1 Complete (Database + Initial Services)
**server.js Size:** 2,988 lines (still monolithic)

---

## What We've Extracted (Week 1)

### ✅ Completed Extractions

1. **Health Routes** → `routes/health.js` (98 lines)
   - `GET /health`
   - `GET /health/detailed`
   - Used via: `app.use('/health', healthRoutes)`

2. **Database Service** → `services/database.js` (216 lines)
   - Connection pool management
   - Query execution
   - Health checks

3. **Error Handler** → `middleware/error-handler.js` (244 lines)
   - Centralized error handling
   - Custom error creators
   - asyncHandler wrapper

4. **Validation Middleware** → `middleware/validation.js` (361 lines)
   - Email, phone, ZIP, state validation
   - XSS/SQL injection prevention
   - Input sanitization

5. **Storage Service** → `services/storage-service.js` (341 lines)
   - Dropbox integration wrapper
   - Folder management
   - File upload handling

6. **Intake Service** → `services/intake-service.js` (296 lines)
   - Workflow orchestration
   - Email/storage integration
   - Business logic layer

**Total Extracted:** ~1,556 lines from server.js

---

## What's Still in server.js (2,988 lines)

### Routes That Need Extraction

#### Form Entry Routes (~500 lines)
These handle the existing Phase 2 document generation system:

- `POST /api/form-entries` (line 1723) - ~267 lines
  - Create new form submission
  - Transform raw form data
  - Upload to Dropbox
  - Generate documents via Docmosis
  - Trigger Python pipeline
  - Save to database
  - Send confirmation email

- `GET /api/form-entries` (line 1990) - ~98 lines
  - List all form submissions
  - Pagination support
  - Database queries

- `GET /api/form-entries/:id` (line 2088) - ~34 lines
  - Get single form entry

- `PUT /api/form-entries/:id` (line 2165) - ~50 lines
  - Update existing entry

- `DELETE /api/form-entries/:id` (line 2215) - ~48 lines
  - Delete single entry

- `DELETE /api/form-entries/clear-all` (line 2122) - ~43 lines
  - Clear all entries (dev/testing)

#### Pipeline Routes (~400 lines)
These handle the Python pipeline integration:

- `GET /api/pipeline-status/:caseId` (line 2305) - ~77 lines
  - Check pipeline job status
  - Return progress updates

- `GET /api/jobs/:jobId/stream` (line 2382) - ~197 lines
  - Server-Sent Events (SSE) endpoint
  - Real-time job progress streaming
  - Event stream management

- `POST /api/pipeline-retry/:caseId` (line 2579) - ~93 lines
  - Retry failed pipeline jobs
  - Error recovery

- `POST /api/regenerate-documents/:caseId` (line 2672) - ~260 lines
  - Regenerate documents for existing case
  - Re-run pipeline

#### Metrics Route (~42 lines)
- `GET /metrics` (line 2263) - ~42 lines
  - Prometheus metrics endpoint
  - System health metrics

#### Static/Fallback Routes (~15 lines)
- `GET /` (line 2932) - Landing page
- `GET /review.html` (line 2937) - Review page
- `GET /success` (line 2942) - Success page
- `app.use('*', ...)` (line 2947) - 404 handler

### Helper Functions That Need Extraction (~1,000+ lines)

#### Form Data Transformation (lines 600-1700)
Massive transformation functions that should be in their own service:

- `processFormData()` - Transform raw form to structured JSON
- `processPlaintiffData()` - Process plaintiff checkboxes
- `revertToOriginalFormat()` - Convert normalized keys back to original
- Field mapping objects (hundreds of lines of checkbox mappings)
- Value transformation functions

**Should become:** `services/form-transformer.js` (~800 lines)

#### Database Configuration (~80 lines)
- PostgreSQL pool configuration (lines 100-180)
- Connection string logic
- Pool event handlers

**Should become:** Part of `services/database.js` (already exists, needs migration)

#### Authentication Middleware (~20 lines)
- `requireAuth` middleware (line 496)
- ACCESS_TOKEN validation

**Should become:** `middleware/auth.js`

#### Middleware Configuration (~100 lines)
- CORS setup
- Compression config
- Body parser setup
- Static file serving
- Request logging

**Could become:** `config/middleware.js` or stay in server.js (debatable)

---

## Refactoring Priority Plan

### High Priority (Block New Development)
These MUST be extracted before building new intake routes:

1. **Extract Form Routes** → `routes/forms.js`
   - All `/api/form-entries/*` endpoints
   - Keeps existing Phase 2 functionality separate from new intake system
   - ~500 lines

2. **Extract Form Transformer Service** → `services/form-transformer.js`
   - All transformation logic (processFormData, field mappings, etc.)
   - Makes routes much cleaner
   - ~800 lines

3. **Extract Authentication Middleware** → `middleware/auth.js`
   - `requireAuth` function
   - ACCESS_TOKEN validation
   - ~20 lines

### Medium Priority (Reduces server.js Size)
Should be done in Week 2 before intake routes:

4. **Extract Pipeline Routes** → `routes/pipeline.js`
   - Pipeline status, streaming, retry endpoints
   - ~400 lines

5. **Extract Pipeline Service** → `services/pipeline-service.js`
   - Python API integration
   - SSE event handling
   - Job status tracking
   - ~200 lines (pulled from routes)

### Low Priority (Nice to Have)
Can be done later as cleanup:

6. **Extract Metrics Route** → `routes/metrics.js`
   - Prometheus endpoint
   - ~42 lines

7. **Consolidate Database Config** → `services/database.js`
   - Move pool config from server.js
   - Already have database service, just migrate config
   - ~80 lines

---

## Revised Week 2 Plan

Instead of jumping straight into intake API (which was the original Week 2), we should:

### Week 2: Complete Refactoring (NEW)
**Goal:** Extract all routes and services from server.js before building intake API

#### Day 1: Extract Form Routes & Transformer
- **Files Created:**
  - `routes/forms.js` (form entry CRUD endpoints)
  - `services/form-transformer.js` (all data transformation logic)
- **Lines Extracted:** ~1,300 lines from server.js
- **Testing:** Verify all `/api/form-entries/*` endpoints still work

#### Day 2: Extract Authentication & Pipeline Routes
- **Files Created:**
  - `middleware/auth.js` (ACCESS_TOKEN validation)
  - `routes/pipeline.js` (pipeline status, streaming, retry)
- **Lines Extracted:** ~420 lines from server.js
- **Testing:** Verify pipeline endpoints work, auth protects routes

#### Day 3: Extract Pipeline Service
- **Files Created:**
  - `services/pipeline-service.js` (Python API integration, SSE handling)
- **Lines Extracted:** ~200 lines from server.js
- **Testing:** Full pipeline flow test (submission → generation → completion)

#### Day 4: Extract Metrics & Consolidate Database
- **Files Created:**
  - `routes/metrics.js` (Prometheus endpoint)
- **Files Modified:**
  - `services/database.js` (move pool config from server.js)
- **Lines Extracted:** ~120 lines from server.js
- **Testing:** Metrics endpoint works, database connections stable

#### Day 5: Testing, Documentation & Cleanup
- **Testing:** Full integration test suite for refactored code
- **Documentation:** Update architecture docs
- **Verification:** server.js should be < 500 lines
- **Commit:** Week 2 complete with clean architecture

**Week 2 Result:**
- server.js: ~2,988 lines → ~400 lines (86% reduction!)
- Modular architecture ready for intake API
- Zero breaking changes
- All existing functionality preserved

---

## After Refactoring: Week 3 Becomes Intake API

Once refactoring is complete (Week 2), THEN we build the intake submission API (now Week 3):

### Week 3: Intake Submission API (Pushed from Week 2)
Same plan as original Week 2, but with cleaner foundation:
- Day 1: POST /api/intake/submit endpoint
- Day 2: GET operations with pagination
- Day 3: PUT/DELETE operations
- Day 4: File upload endpoint
- Day 5: Testing & polish

---

## Estimated server.js Size After Each Week

| Week | Tasks | Lines in server.js |
|------|-------|-------------------|
| **Pre-Week 1** | Monolithic | ~4,500 lines |
| **Week 1** | Database + Services + Middleware | ~2,988 lines |
| **Week 2** | Extract all routes & services | ~400 lines |
| **Week 3+** | Add new intake routes | ~400-600 lines |

**Final server.js should contain:**
- App initialization (~50 lines)
- Middleware registration (~100 lines)
- Route registration (~50 lines)
- Server startup (~50 lines)
- Error handling wiring (~50 lines)
- Static file serving (~50 lines)
- Graceful shutdown (~50 lines)

**Total:** ~400 lines (clean, maintainable entry point)

---

## Benefits of Completing Refactoring First

### Code Quality
- ✅ Single Responsibility Principle
- ✅ Easier to test individual modules
- ✅ Clear separation of concerns
- ✅ Reusable services

### Development Speed
- ✅ Faster to find code (know which file to look in)
- ✅ Easier to modify (changes isolated to one file)
- ✅ Less merge conflicts (team can work on different files)
- ✅ Clearer git history (each file has its own evolution)

### Maintenance
- ✅ Easier onboarding (new developers can navigate codebase)
- ✅ Safer changes (smaller blast radius per file)
- ✅ Better debugging (know where to look for bugs)
- ✅ Clearer dependencies (explicit imports show relationships)

### New Intake System
- ✅ Clean foundation to build on
- ✅ Can reuse existing services (transformer, pipeline, etc.)
- ✅ Won't pollute server.js further
- ✅ Intake routes will be in their own file from day 1

---

## Decision Point

**Question:** Should we pause Week 2 (Intake API) and do the refactoring first?

**Recommendation:** YES, do refactoring (revised Week 2) before intake API

**Rationale:**
1. server.js is already 2,988 lines - adding more routes makes it worse
2. Refactoring now is faster than refactoring later (less code to move)
3. Clean architecture makes intake API development faster
4. Original plan called for "Week 1-2: Refactoring" anyway
5. Only adds 1 week to timeline (Week 2 becomes refactoring, Week 3 becomes intake API)

**Updated Timeline:**
- ✅ Week 1: Database + Initial Services (COMPLETE)
- 🔄 Week 2: Complete Refactoring (NEW - extract all routes/services)
- 📋 Week 3: Intake Submission API (moved from Week 2)
- 📋 Weeks 4-5: Intake Form Frontend (unchanged)
- 📋 Week 6: Attorney Portal (unchanged)
- 📋 Week 7-8: Testing & Polish (unchanged)
- 📋 Week 9: Production Launch (unchanged)

**Net Impact:** Still on track for 9-week delivery!

---

**Status:** ⏸️ **AWAITING DECISION** - Refactor first or proceed with intake API?

**Recommendation:** Refactor Week 2, then build intake API Week 3
