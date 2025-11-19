# DATABASE SERVICE CONSOLIDATION PLAN

**Date:** 2025-11-18
**Priority:** Medium
**Estimated Time:** 2-3 hours
**Risk Level:** Medium (requires testing)

---

## EXECUTIVE SUMMARY

The codebase currently has **TWO separate database service implementations** that provide similar functionality. This causes:
- ❌ Code duplication and maintenance burden
- ❌ Inconsistent error handling and logging
- ❌ Path resolution confusion (`../server/services/` vs `./services/`)
- ❌ Unclear "source of truth" for database operations

**Goal:** Consolidate to a single, canonical database service.

---

## CURRENT STATE ANALYSIS

### File 1: `/services/database-service.js` (267 lines)
**Pattern:** Class-based service with comprehensive features

**Features:**
- ✅ Class-based architecture
- ✅ Configurable pool settings
- ✅ Connection health monitoring
- ✅ Graceful shutdown handling
- ✅ Pool statistics and metrics
- ✅ Winston logger integration
- ✅ Error event handlers
- ✅ Connection lifecycle management

**Used By (10 references):**
1. `tests/services/database-service.test.js` - Unit tests
2. `server/config/database.js` - Server config
3. `server/routes/health-routes.js` - Health checks
4. `routes/intakes-jsonb.js` - **ACTIVE intake route**
5. `routes/intakes-expanded.js` - Unused route
6. `routes/intakes.js` - Unused route

**Import Pattern:**
```javascript
const { getPool } = require('../server/services/database-service');
```

**Issues:**
- ⚠️ Import path points to `/server/services/` but file is in `/services/`
- ⚠️ Path resolution confusion

---

### File 2: `/services/database.js` (215 lines)
**Pattern:** Singleton module with auto-initialization

**Features:**
- ✅ Singleton pool pattern
- ✅ Auto-connects on require
- ✅ Simple query interface
- ✅ Client checkout for transactions
- ✅ Slow query logging (>1s)
- ✅ Console-based logging

**Used By (4 references):**
1. `tests/integration/week1-integration-tests.js` - Integration tests
2. `server/models/pdf-generation-job.js` - PDF job model
3. `routes/health.js` - **ACTIVE health route**
4. `services/intake-service.js` - Intake business logic

**Import Pattern:**
```javascript
const db = require('./database');
const db = require('../services/database');
```

**Issues:**
- ⚠️ Auto-connects on require (side effects)
- ⚠️ Console logging instead of Winston
- ⚠️ Less comprehensive error handling

---

## USAGE STATISTICS

```
database-service.js: 10 total references (6 in /server/, 3 in /routes/, 1 test)
database.js:          4 total references (1 server model, 1 route, 1 service, 1 test)
```

**Recommendation:** **Keep `database-service.js`** as canonical implementation
- More widely used (10 vs 4 references)
- More comprehensive features
- Better error handling
- Modern class-based architecture
- Winston logger integration

---

## CRITICAL DISCOVERY: PATH RESOLUTION ISSUE

### The `/server/` Directory Problem

**All route files import from:**
```javascript
const { getPool } = require('../server/services/database-service');
```

**But the actual file is at:**
```
/services/database-service.js  (NOT /server/services/database-service.js)
```

**This means:**
1. Either there's a symlink/alias we're missing
2. Or there's a SECOND copy of database-service.js in `/server/services/`
3. Or the imports are broken and using fallback resolution

**Verification Needed:**
```bash
ls -la server/services/database-service.js
file server/services/database-service.js
```

---

## CONSOLIDATION STRATEGY

### Option A: Keep `database-service.js`, Fix Import Paths ⭐ RECOMMENDED

**Rationale:**
- More comprehensive implementation
- Better error handling and logging
- Class-based design is more maintainable
- Already used by active route (`intakes-jsonb.js`)

**Steps:**
1. Fix import paths in all files
2. Migrate `database.js` users to `database-service.js`
3. Update method signatures where needed
4. Delete `database.js`

**Pros:**
- ✅ More modern architecture
- ✅ Better monitoring capabilities
- ✅ Comprehensive error handling

**Cons:**
- ⚠️ Requires updating import patterns (class vs module exports)
- ⚠️ More complex migration

---

### Option B: Keep `database.js`, Enhance Features

**Rationale:**
- Simpler singleton pattern
- Fewer import pattern changes
- Already used by business logic layer

**Steps:**
1. Add Winston logging to `database.js`
2. Add health check methods
3. Add graceful shutdown
4. Migrate `database-service.js` users
5. Delete `database-service.js`

**Pros:**
- ✅ Simpler migration
- ✅ Fewer files to update

**Cons:**
- ⚠️ Need to add missing features
- ⚠️ Less comprehensive starting point

---

## RECOMMENDED PLAN: Option A

### Phase 1: Preparation & Analysis (30 minutes)

#### 1.1 Verify `/server/` Directory Status
```bash
# Check if /server/services/database-service.js exists
ls -la server/services/database-service.js

# Check if it's a symlink
file server/services/database-service.js

# Compare with /services/database-service.js
diff server/services/database-service.js services/database-service.js
```

#### 1.2 Create Safety Branch
```bash
git checkout -b consolidate/database-services
git add -A
git commit -m "Checkpoint before database service consolidation"
```

#### 1.3 Run Full Test Suite (Baseline)
```bash
npm test
npm run test:e2e
```

---

### Phase 2: Create Unified Service (1 hour)

#### 2.1 Enhance `database-service.js` with Missing Methods

**Add compatibility methods from `database.js`:**

```javascript
// In services/database-service.js

/**
 * Get singleton pool instance (for backward compatibility)
 * @returns {Pool} PostgreSQL pool
 */
getPool() {
    return this.pool;
}

/**
 * Get client for transaction (compatibility with database.js)
 * @returns {Promise<Object>} PostgreSQL client
 */
async getClient() {
    try {
        const client = await this.pool.connect();
        logger.debug('Client checked out from pool');
        return client;
    } catch (err) {
        logger.error('Failed to checkout client from pool:', err);
        throw err;
    }
}
```

#### 2.2 Create Singleton Export Pattern

**Create new file: `services/database-singleton.js`**

```javascript
/**
 * Database Service Singleton
 *
 * Provides a single, shared instance of DatabaseService
 * for use across the application.
 */

const DatabaseService = require('./database-service');

// Create singleton instance
const databaseService = new DatabaseService();

// Export methods for backward compatibility with database.js pattern
module.exports = {
    pool: databaseService.pool,
    getPool: () => databaseService.getPool(),
    query: (text, params) => databaseService.query(text, params),
    getClient: () => databaseService.getClient(),
    healthCheck: () => databaseService.healthCheck(),
    getPoolStats: () => databaseService.getPoolStats(),

    // Export instance for advanced usage
    instance: databaseService
};
```

---

### Phase 3: Migration (1 hour)

#### 3.1 Update Route Files (Fix Path Resolution)

**File: `routes/intakes-jsonb.js`**
```javascript
// BEFORE:
const { getPool } = require('../server/services/database-service');

// AFTER:
const { getPool } = require('../services/database-singleton');
```

**Apply to:**
- ✅ `routes/intakes-jsonb.js` (ACTIVE)
- ⚠️ `routes/intakes.js` (will delete later)
- ⚠️ `routes/intakes-expanded.js` (will delete later)

#### 3.2 Update Service Files

**File: `services/intake-service.js`**
```javascript
// BEFORE:
const db = require('./database');

// AFTER:
const db = require('./database-singleton');
// OR for more clarity:
const { query, getClient, getPool } = require('./database-singleton');
```

#### 3.3 Update Route Health Check

**File: `routes/health.js`**
```javascript
// BEFORE:
const db = require('../services/database');

// AFTER:
const db = require('../services/database-singleton');
```

#### 3.4 Update Server Models

**File: `server/models/pdf-generation-job.js`**
```javascript
// BEFORE:
const db = require('../config/database');

// AFTER:
const { query } = require('../../services/database-singleton');
```

#### 3.5 Update Server Config Files

**File: `server/config/database.js`**
```javascript
// BEFORE:
const { getPool } = require('../services/database-service');

// AFTER:
const { getPool } = require('../../services/database-singleton');
```

**File: `server/routes/health-routes.js`**
```javascript
// BEFORE:
const { getPool } = require('../services/database-service');

// AFTER:
const { getPool } = require('../../services/database-singleton');
```

#### 3.6 Update Test Files

**File: `tests/services/database-service.test.js`**
```javascript
// BEFORE:
const DatabaseService = require('../../services/database-service');

// AFTER:
const { instance: DatabaseService } = require('../../services/database-singleton');
```

**File: `tests/integration/week1-integration-tests.js`**
```javascript
// BEFORE:
const databaseService = require('../../services/database');

// AFTER:
const databaseService = require('../../services/database-singleton');
```

---

### Phase 4: Testing & Validation (30 minutes)

#### 4.1 Run Unit Tests
```bash
npm test
```

#### 4.2 Run Integration Tests
```bash
npm run test:integration
```

#### 4.3 Manual Testing
```bash
# Start server
npm start

# Test health endpoint
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# Test intake submission
curl -X POST http://localhost:3000/api/intakes \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "primaryPhone": "555-0100",
    "emailAddress": "test@example.com",
    "currentStreetAddress": "123 Main St",
    "currentCity": "Los Angeles",
    "currentState": "CA",
    "currentZipCode": "90001",
    "propertyStreetAddress": "456 Oak Ave",
    "propertyCity": "Los Angeles",
    "propertyState": "CA",
    "propertyZipCode": "90002",
    "monthlyRent": "2000"
  }'

# Verify database connection pool
psql -U ryanhaines -d legal_forms_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'legal_forms_db';"
```

---

### Phase 5: Cleanup (15 minutes)

#### 5.1 Delete Old Database Service
```bash
# After all tests pass
rm services/database.js
```

#### 5.2 Update Documentation
```bash
# Update CODEBASE_DOCUMENTATION.md
# Update any README files
# Update inline comments
```

#### 5.3 Commit Changes
```bash
git add -A
git commit -m "consolidate: Merge database.js into database-service.js singleton

- Created database-singleton.js as unified interface
- Updated all imports to use singleton pattern
- Migrated 14 files from old database.js pattern
- Fixed path resolution issues (../server/services → ../services)
- Removed duplicate database.js implementation
- All tests passing

BREAKING CHANGE: database.js module removed, use database-singleton.js"
```

---

## FILE UPDATE CHECKLIST

### Files to Update (14 total)

**Priority 1 - Active Routes & Services:**
- [ ] `routes/intakes-jsonb.js` (ACTIVE)
- [ ] `routes/health.js` (ACTIVE)
- [ ] `services/intake-service.js` (business logic)

**Priority 2 - Server Components:**
- [ ] `server/config/database.js`
- [ ] `server/routes/health-routes.js`
- [ ] `server/models/pdf-generation-job.js`

**Priority 3 - Test Files:**
- [ ] `tests/services/database-service.test.js`
- [ ] `tests/integration/week1-integration-tests.js`

**Priority 4 - Unused Routes (Update then Delete):**
- [ ] `routes/intakes.js` (unused, will delete)
- [ ] `routes/intakes-expanded.js` (unused, will delete)

---

## IMPORT PATTERN REFERENCE

### Old Patterns (To Replace)
```javascript
// Pattern 1: database.js imports
const db = require('./database');
const db = require('../services/database');

// Pattern 2: database-service.js imports (broken path)
const { getPool } = require('../server/services/database-service');
```

### New Pattern (Unified)
```javascript
// Singleton import (recommended)
const db = require('./database-singleton');
const { query, getPool, getClient } = require('../services/database-singleton');

// For tests that need the class instance
const { instance: DatabaseService } = require('../../services/database-singleton');
```

---

## COMPATIBILITY MATRIX

| Method | database.js | database-service.js | database-singleton.js |
|--------|-------------|---------------------|----------------------|
| `query(text, params)` | ✅ | ✅ | ✅ |
| `getClient()` | ✅ | ✅ | ✅ |
| `getPool()` | ❌ | ✅ | ✅ |
| `healthCheck()` | ❌ | ✅ | ✅ |
| `getPoolStats()` | ❌ | ✅ | ✅ |
| `connect()` | Auto | ✅ | ✅ |
| `shutdown()` | ❌ | ✅ | ✅ |

---

## ROLLBACK PLAN

If issues arise during consolidation:

```bash
# Rollback to checkpoint
git checkout consolidate/database-services
git reset --hard HEAD~1

# Or restore specific file
git checkout HEAD -- services/database.js

# Restart server and verify
npm start
curl http://localhost:3000/health/live
```

---

## RISK MITIGATION

### Risk 1: Path Resolution Confusion
**Mitigation:**
- Verify `/server/services/database-service.js` status first
- Test imports resolve correctly
- Use absolute requires if needed: `require(path.join(__dirname, '../services/database-singleton'))`

### Risk 2: Breaking Changes in Tests
**Mitigation:**
- Run test suite at each step
- Keep baseline test results
- Rollback immediately if tests fail

### Risk 3: Connection Pool Issues
**Mitigation:**
- Monitor `pg_stat_activity` during migration
- Test with load testing tool
- Verify no connection leaks

### Risk 4: Method Signature Mismatches
**Mitigation:**
- Create compatibility wrapper methods
- Document breaking changes
- Update all call sites simultaneously

---

## SUCCESS METRICS

After consolidation, verify:

- ✅ All tests passing (unit + integration + E2E)
- ✅ Application starts without errors
- ✅ Health checks return 200 OK
- ✅ Intake submission works
- ✅ Database queries execute normally
- ✅ No connection pool leaks
- ✅ Logging works correctly
- ✅ Only ONE database service file exists

---

## TIMELINE

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Preparation | 30 min | Verify paths, create branch, baseline tests |
| Phase 2: Create Unified Service | 1 hour | Enhance database-service.js, create singleton |
| Phase 3: Migration | 1 hour | Update 14 files, fix imports |
| Phase 4: Testing | 30 min | Run all tests, manual verification |
| Phase 5: Cleanup | 15 min | Delete old file, update docs, commit |
| **TOTAL** | **3 hours** | |

---

## NEXT STEPS

1. **Review this plan** with team/stakeholders
2. **Schedule consolidation** during low-traffic period
3. **Create safety branch** before starting
4. **Execute Phase 1** (preparation)
5. **Stop if any verification fails**
6. **Continue phases 2-5** if all clear
7. **Monitor production** after deployment

---

## QUESTIONS TO ANSWER BEFORE STARTING

- [ ] Does `/server/services/database-service.js` actually exist?
- [ ] Is it a symlink or a duplicate file?
- [ ] Are there any other files in `/server/` being used?
- [ ] Can we delete the entire `/server/` directory after this?
- [ ] Should we do this consolidation before or after deleting unused routes?

---

## ALTERNATIVE: MINIMAL APPROACH

If the full consolidation is too risky, consider this minimal approach:

**Step 1:** Just fix the import paths
```javascript
// Change all:
require('../server/services/database-service')
// To:
require('../services/database-service')
```

**Step 2:** Leave both files for now
- Keep `database-service.js` for routes
- Keep `database.js` for services
- Consolidate later when safer

**Pros:**
- ✅ Lower risk
- ✅ Faster execution (30 minutes)

**Cons:**
- ❌ Still have duplication
- ❌ Doesn't solve root problem

---

**Last Updated:** 2025-11-18
**Status:** Ready for execution
**Recommended Start Date:** After Phase 0 cleanup complete
