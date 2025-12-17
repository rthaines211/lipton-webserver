# Code Quality Review - December 16, 2025

## Overview

Pre-deployment code quality review for Phases 4-7 work before deploying to dev environment.

**Reviewed Files:**
- Backend: `routes/forms.js`, `routes/intakes-jsonb.js`, `routes/dashboard.js`, `routes/attorneys.js`
- Frontend: `js/intake-modal.js`, `js/dashboard.js`, `js/case-detail.js`, `js/issue-details-panel.js`
- Migrations: `010_create_dashboard_tables.sql`, `011_*.sql`, `012_seed_attorneys.sql`

---

## Critical Issues (Must Fix)

### 1. XSS Vulnerability - Error Message in innerHTML
**File:** `js/intake-modal.js`
**Lines:** 162-165
**Severity:** CRITICAL

```javascript
emptyState.innerHTML = `
    <p>${error.message || 'Failed to load intakes. Please try again.'}</p>
`;
```

**Risk:** If `error.message` contains malicious HTML/JavaScript, it will execute.

**Fix:** Use `textContent` instead:
```javascript
const p = document.createElement('p');
p.textContent = error.message || 'Failed to load intakes. Please try again.';
emptyState.appendChild(p);
```

---

### 2. XSS Vulnerability - Intake Data in innerHTML
**File:** `js/intake-modal.js`
**Lines:** 197-218
**Severity:** CRITICAL

```javascript
row.innerHTML = `
    <td><strong>${intake.first_name} ${intake.last_name}</strong></td>
    <td>${address}</td>
    ...
`;
```

**Risk:** User-submitted intake data (names, addresses) could contain malicious scripts.

**Fix:** Use the existing `escapeHtml()` function or create DOM elements:
```javascript
row.innerHTML = `
    <td><strong>${escapeHtml(intake.first_name)} ${escapeHtml(intake.last_name)}</strong></td>
    <td>${escapeHtml(address)}</td>
    ...
`;
```

---

### 3. Placeholder Password Hash - Backend Route
**File:** `routes/attorneys.js`
**Lines:** 119, 126
**Severity:** CRITICAL

```javascript
password_hash: '$2b$10$placeholder'
```

**Risk:** Invalid password hash could allow unauthorized access or cause auth failures.

**Fix:** Either:
- Generate real bcrypt hashes: `await bcrypt.hash('temporaryPassword123!', 10)`
- Use `NULL` if password auth not needed: `password_hash: null`

---

### 4. Placeholder Password Hash - Seed Migration
**File:** `database/migrations/012_seed_attorneys.sql`
**Lines:** 15, 28
**Severity:** CRITICAL

```sql
'$2b$10$placeholder.hash.value.here',
```

**Risk:** Same as above - invalid credentials in database.

**Fix:** Use NULL or generate real hashes before running migration.

---

## High Priority Issues (Should Fix Before Deploy)

### 5. Debug Console.log Statements - intake-modal.js
**File:** `js/intake-modal.js`
**Lines:** 21-32, 269-280, 306-730, throughout
**Severity:** HIGH
**Count:** 60+ instances

```javascript
console.log('%c=== INTAKE-MODAL.JS LOADED v10 ===', 'background: #4CAF50...');
console.log('Full API Response:', docGenData);
console.log('hab-* fields:', habFields);
```

**Risk:**
- Performance overhead in production
- Information leakage (API responses logged)
- Log clutter making debugging harder

**Fix:** Remove all debug logs or wrap in feature flag:
```javascript
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('...');
```

---

### 6. Debug Console.log Statements - forms.js
**File:** `routes/forms.js`
**Lines:** 149, 157, 160, 176, 195, 203, 239, 240, 243, 246, 295, 330-333, 358-365
**Severity:** HIGH
**Count:** 30+ instances

```javascript
console.log('Received form data:', JSON.stringify(formData, null, 2));
console.log('✅ Form entry saved: ${filename}');
```

**Risk:** Same as above, plus logs entire form submissions.

**Fix:** Replace with the `logger` module already imported in the file.

---

### 7. Missing Transaction Wrapper - Seed Migration
**File:** `database/migrations/012_seed_attorneys.sql`
**Lines:** All
**Severity:** HIGH

The migration lacks `BEGIN;` and `COMMIT;` transaction wrapper.

**Risk:** If error occurs mid-execution, partial data inserted with no automatic rollback.

**Fix:** Wrap in transaction:
```sql
BEGIN;
-- existing INSERT statements
COMMIT;
```

---

### 8. Missing Rollback Script
**File:** `database/migrations/012_seed_attorneys.sql`
**Severity:** HIGH

No corresponding `012_rollback_seed_attorneys.sql` exists.

**Risk:** Cannot cleanly reverse this migration.

**Fix:** Create rollback script:
```sql
-- 012_rollback_seed_attorneys.sql
BEGIN;
DELETE FROM attorneys WHERE email IN ('kevin@liptonlawfirm.com', 'michael@liptonlawfirm.com');
COMMIT;
```

---

### 9. Conflicting Migration Number
**Files:** `011_create_dashboard_view.sql` AND `011_fix_zipcode_key.sql`
**Severity:** HIGH

Two migrations share the `011_` prefix.

**Risk:** Migration tools may skip one file or execute in undefined order.

**Fix:** Rename `011_fix_zipcode_key.sql` to `013_fix_zipcode_key.sql`.

---

### 10. Duplicate Field Definitions
**File:** `routes/intakes-jsonb.js`
**Lines:** 569 and 655
**Severity:** HIGH

```javascript
// Line 569
hasInjuryIssues: formData.hasInjuryIssues || false,
// Line 655 (DUPLICATE - overwrites above)
hasInjuryIssues: formData.hasInjuryIssues || formData.hasInjury || false,
```

**Risk:** Only the second definition takes effect. First one is dead code.

**Fix:** Remove the duplicate at line 569, keep version with fallback mapping.

---

## Medium Priority Issues (Consider Fixing)

### 11. Hardcoded Attorney Data
**Files:** `js/dashboard.js` (lines 83-90), `js/case-detail.js` (lines 143-152)
**Severity:** MEDIUM

```javascript
const ATTORNEYS = [
    { id: 1, full_name: 'Kevin Lipton' },
    { id: 2, full_name: 'Michael Falsafi' }
];
```

**Issue:**
- Data duplicated in two files
- `fetchAttorneys()` function exists but returns hardcoded data (dead code)

**Fix:** Either centralize to shared module or implement actual API fetch.

---

### 12. Missing Database Index
**File:** `database/migrations/010_create_dashboard_tables.sql`
**Lines:** 56-59
**Severity:** MEDIUM

Missing index on `generated_documents.generated_at` column.

**Risk:** Date range queries will perform full table scans.

**Fix:** Add index:
```sql
CREATE INDEX IF NOT EXISTS idx_generated_documents_generated_at
ON generated_documents(generated_at DESC);
```

---

### 13. View Performance - Correlated Subqueries
**File:** `database/migrations/011_create_dashboard_view.sql`
**Lines:** 78-91
**Severity:** MEDIUM

```sql
(SELECT COUNT(*) FROM case_activities ca WHERE ca.dashboard_id = cd.id) AS activity_count,
(SELECT MAX(ca.performed_at) FROM case_activities ca WHERE ca.dashboard_id = cd.id) AS last_activity_at,
(SELECT COUNT(*) FROM case_notes cn WHERE cn.dashboard_id = cd.id AND cn.is_deleted = false) AS note_count,
```

**Risk:** N+1 query pattern - each row triggers multiple subqueries.

**Fix:** Refactor to use LEFT JOIN with GROUP BY aggregation.

---

### 14. Error Information Leakage
**File:** `routes/intakes-jsonb.js`
**Lines:** 873, 943, 1020
**Severity:** MEDIUM

```javascript
message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
```

**Risk:** Developers might forget to set NODE_ENV in production. Stack traces could leak.

**Fix:** Always sanitize error messages, use error codes instead.

---

### 15. Backup Files in Repository
**Files:** `routes/forms.js.formsbak`, `routes/forms.js.formsbak2`, `routes/forms.js.formsbak3`, `routes/pipeline.js.bak3`, `routes/pipeline.js.bak4`
**Severity:** MEDIUM

5 backup files exist in routes directory.

**Fix:** Delete backup files, use git history instead:
```bash
rm routes/*.bak* routes/*.formsbak*
```

---

## Low Priority Issues (Nice to Have)

### 16. Magic Numbers
**File:** `routes/dashboard.js`
**Lines:** 65, 216, 434, 451

```javascript
const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
```

**Fix:** Use named constants:
```javascript
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
```

---

### 17. Large File Size
**File:** `routes/intakes-jsonb.js`
**Size:** 2,079 lines

The buildingIssues object construction spans 500+ lines.

**Fix:** Extract to separate utility module.

---

### 18. TODO Comment - Incomplete Feature
**File:** `js/intake-modal.js`
**Lines:** 822-826

```javascript
function previewIntake(intakeId) {
    // TODO: Implement preview modal with full intake details
```

**Fix:** Complete implementation or remove dead code.

---

### 19. Inconsistent Primary Key Types
**File:** `database/migrations/010_create_dashboard_tables.sql`

New tables use `SERIAL PRIMARY KEY` while existing schema uses `UUID PRIMARY KEY`.

**Impact:** Schema inconsistency (not a functional issue).

---

### 20. Missing updated_at Trigger
**File:** `database/migrations/010_create_dashboard_tables.sql`

The `generated_documents` table lacks `updated_at` column and trigger.

**Fix:** Add for consistency with other tables.

---

## Positive Findings

| Category | Status | Notes |
|----------|--------|-------|
| SQL Injection Protection | ✅ PASS | All queries use parameterized queries |
| XSS Prevention (case-detail.js) | ✅ PASS | Proper `escapeHtml()` function used |
| XSS Prevention (issue-details-panel.js) | ✅ PASS | Clean implementation |
| Error Handling | ✅ PASS | Try-catch on all DB operations |
| Secrets Management | ✅ PASS | No hardcoded API keys or secrets |
| Async/Await Usage | ✅ PASS | Proper async handling throughout |

---

## Action Summary

| Priority | Count | Action |
|----------|-------|--------|
| CRITICAL | 4 | Must fix before commit |
| HIGH | 6 | Should fix before deploy |
| MEDIUM | 5 | Consider fixing |
| LOW | 5 | Nice to have |

---

## Recommended Approach

### Option A: Quick Fix (Critical Only)
Fix items 1-4 before committing. Deploy, then address rest in follow-up PR.
**Time:** ~1 hour

### Option B: Thorough Fix (Critical + High)
Fix items 1-10 before committing. Cleaner deploy.
**Time:** ~2-3 hours

### Option C: Full Cleanup
Fix all items 1-20. Most thorough but longer.
**Time:** ~4-6 hours

---

## Review Metadata

- **Review Date:** December 16, 2025
- **Reviewer:** Automated code review (Claude)
- **Branch:** feature/phase-7-crm-dashboard
- **Commits Ahead of Main:** 55
