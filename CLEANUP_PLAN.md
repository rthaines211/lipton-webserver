# CODEBASE CLEANUP PLAN

**Generated:** 2025-11-18
**Branch:** feature/load-from-intake-modal
**Total Files Analyzed:** ~676 files (excluding node_modules, .git)

---

## EXECUTIVE SUMMARY

This codebase has accumulated technical debt through normal development cycles, including:
- **8 backup files** that should be deleted
- **3 duplicate route files** handling intakes (needs consolidation)
- **2 duplicate database service files** (needs consolidation)
- **43 markdown documentation files** (13 should be archived)
- **3 separate migration directories** (needs consolidation)
- **Multiple build artifacts** that can be safely deleted
- **Unused `/server/` directory** from abandoned refactoring

**Estimated cleanup impact:**
- Remove ~20 files immediately (zero risk)
- Consolidate ~8 duplicate files (low-medium risk)
- Archive ~13 documentation files (zero risk)
- Free ~50MB disk space (build artifacts)
- Improve code clarity and maintainability

---

## REPOSITORY OVERVIEW

### Structure
```
Lipton Webserver/
├── Core Application (Node.js/Express)
│   ├── server.js (main entry point)
│   ├── routes/ (API endpoints)
│   ├── services/ (business logic)
│   ├── middleware/ (Express middleware)
│   └── config/ (configuration)
│
├── Frontend
│   ├── js/ (vanilla JavaScript)
│   ├── client-intake/ (React TypeScript app)
│   └── dist/ (build artifacts)
│
├── Database
│   ├── database/ (schemas)
│   ├── migrations/ (SQL migrations - ACTIVE)
│   └── db/ (migration runner)
│
├── Python API
│   └── api/ (FastAPI normalization pipeline)
│
├── Testing
│   └── tests/ (Jest + Playwright)
│
├── Documentation (43 files)
│   ├── Current docs (6 files)
│   └── Historical docs (37 files)
│
└── Scripts
    └── 34 shell scripts for deployment/utilities
```

### Technology Stack
- **Backend:** Node.js 18+, Express.js, PostgreSQL 14+
- **Frontend:** React 18 + TypeScript, Vanilla JS
- **Python:** FastAPI normalization pipeline
- **Testing:** Jest, Playwright, pytest
- **Deployment:** Docker, Google Cloud Run

---

## CLEANUP PHASES

### PHASE 0: IMMEDIATE DELETIONS (Zero Risk - 5 minutes)

These files have **zero references** in the codebase and can be deleted immediately:

#### Backup Files (8 files)
```bash
# Server backups
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.backup
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.syntaxfix
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.day3bak
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.day3bak2
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.day3bak3
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.day4bak
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/server.js.bak

# Route backup
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/routes/intakes.js.bak
```

#### Temporary Files (1 file)
```bash
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/js/sse-client.js.tmp
```

#### Database Backup (1 file)
```bash
# Move to archive or delete if no longer needed
rm /Users/ryanhaines/Desktop/Lipton\ Webserver/backup_20251022.sql
```

**Total:** 10 files
**Risk:** ✅ ZERO
**Time:** 5 minutes
**Impact:** Cleaner repository, no functional changes

---

### PHASE 1: CONSOLIDATION (Low-Medium Risk - 2-3 hours)

These files appear to be duplicates or unused but require verification before deletion.

#### A. Duplicate Intake Routes (CRITICAL ISSUE)

**Problem:** Three versions of intake routes exist:

| File | Lines | Status | Imported in server.js? |
|------|-------|--------|----------------------|
| `routes/intakes-jsonb.js` | 524 | **ACTIVE** | ✅ Yes (line 94) |
| `routes/intakes.js` | 750 | Unknown | ❌ No |
| `routes/intakes-expanded.js` | 768 | Unknown | ❌ No |

**Verification Steps:**
1. Grep for dynamic imports:
   ```bash
   cd /Users/ryanhaines/Desktop/Lipton\ Webserver
   grep -r "require.*intakes\.js" .
   grep -r "require.*intakes-expanded" .
   grep -r "import.*intakes" .
   ```

2. Check test files:
   ```bash
   grep -r "intakes\.js" tests/
   grep -r "intakes-expanded" tests/
   ```

3. Check other branches:
   ```bash
   git branch -a
   git log --all --source -- routes/intakes.js
   git log --all --source -- routes/intakes-expanded.js
   ```

**Recommendation:**
- ✅ Keep: `routes/intakes-jsonb.js` (currently active)
- ⚠️ Delete: `routes/intakes-expanded.js` (appears to be duplicate)
- ⚠️ Delete: `routes/intakes.js` (appears to be old version)

**Action:**
```bash
# After verification
rm routes/intakes.js
rm routes/intakes-expanded.js
```

---

#### B. Duplicate Database Services

**Problem:** Two database service files with similar functionality:

| File | Lines | Pattern | Used By |
|------|-------|---------|---------|
| `services/database-service.js` | 267 | Class-based | `routes/intakes-jsonb.js` |
| `services/database.js` | 215 | Singleton | `services/intake-service.js`, `routes/health.js` |

**Verification Steps:**
1. Check all imports:
   ```bash
   grep -r "require.*database-service" .
   grep -r "require.*database\.js" .
   grep -r "from.*database" .
   ```

2. Compare functionality:
   ```bash
   diff services/database-service.js services/database.js
   ```

**Recommendation:**
- Choose ONE canonical database service
- Update all imports to use canonical version
- Delete the other

**Action:**
```bash
# After choosing canonical version (likely database-service.js)
# Update imports in:
# - services/intake-service.js
# - routes/health.js

# Then delete
rm services/database.js
```

---

#### C. Unused Server Directory

**Problem:** Entire `/server/` directory exists but appears unused:

```
/server/
├── index.js (233 lines) - Alternative entry point
├── routes/
├── services/
├── config/
└── models/
```

**Current Entry Point:** `server.js` (specified in package.json line 5)

**Verification Steps:**
1. Check if any imports resolve to `/server/`:
   ```bash
   grep -r "../server/" .
   grep -r "./server/" .
   grep -r "server/index" .
   ```

2. Check package.json:
   ```bash
   cat package.json | grep main
   # Should show: "main": "server.js"
   ```

**Recommendation:**
- If `/server/` directory is NOT referenced: DELETE entire directory
- This appears to be an abandoned Phase 1 refactoring attempt

**Action:**
```bash
# After verification
rm -rf server/
```

---

### PHASE 2: DOCUMENTATION REORGANIZATION (Zero Risk - 1 hour)

**Problem:** 43 markdown files in root directory, many are historical/completed work.

#### Documentation Audit

**Keep in Root (6 files):**
- `00_START_HERE.md` - Entry point
- `README.md` - Project overview
- `QUICKSTART_LOCAL_DEV.md` - Local setup
- `CODEBASE_DOCUMENTATION.md` - Complete reference (1,758 lines)
- `STATUS.md` - Current status
- `CLEANUP_PLAN.md` - This file

**Archive to `/docs/archive/completed-weeks/` (13 files):**
```
WEEK_1_DAY_1_COMPLETE.md
WEEK_1_DAY_2_COMPLETE.md
WEEK_1_DAY_3_COMPLETE.md
WEEK_1_DAY_4_COMPLETE.md
WEEK_2_COMPLETE_SUMMARY.md
WEEK_2_5_COMPLETE_REFACTORING.md
WEEK_3_CLEANUP_AND_TESTING_COMPLETE.md
WEEK_3_COMPLETE_LOGGING.md
WEEK_3_DEPLOY_COMPLETE.md
WEEK_4_EXPANDED_FORM_COMPLETE.md
WEEK_4_POC_COMPLETE.md
WORKFLOW_SIMPLIFICATION_COMPLETE.md
(... other completed weekly summaries)
```

**Action Plan:**
```bash
# Create archive directory
mkdir -p docs/archive/completed-weeks

# Move completed week files
mv WEEK_*_COMPLETE.md docs/archive/completed-weeks/
mv WORKFLOW_SIMPLIFICATION_COMPLETE.md docs/archive/completed-weeks/

# Create archive for old action plans
mkdir -p docs/archive/action-plans
mv *_ACTION_PLAN.md docs/archive/action-plans/ 2>/dev/null || true
```

**Impact:** Cleaner root directory, historical docs preserved

---

### PHASE 3: MIGRATION CONSOLIDATION (Medium Risk - 2 hours)

**Problem:** Migration files scattered across 3 directories with conflicting numbering:

```
/database/migrations/
├── 001_create_intake_schema.sql
└── 001_rollback_intake_schema.sql

/migrations/ (ACTIVE)
├── 001_add_pdf_generation_jobs.sql
├── 001_create_intake_tables.sql
├── 001_rollback.sql
├── add-building-issues-columns.sql
├── add-missing-pest-columns.sql
├── fix-plumbing-columns.sql
├── remove-duplicate-pest-columns.sql
└── remove-legacy-issue-columns.sql

/db/migrations/
└── run-migrations.js
```

**Issues:**
- Multiple files with `001_` prefix
- Unclear migration ordering
- No single source of truth

**Consolidation Plan:**

1. **Audit all migrations:**
   ```bash
   # List all migration files
   find . -name "*.sql" -path "*/migrations/*" | sort
   ```

2. **Determine execution order:**
   - Check which migrations have already run in production
   - Verify migration history in database
   - Check `run-migrations.js` for execution logic

3. **Renumber migrations:**
   ```
   /migrations/
   ├── 001_create_intake_tables.sql (base schema)
   ├── 002_add_pdf_generation_jobs.sql
   ├── 003_add_building_issues_columns.sql
   ├── 004_add_missing_pest_columns.sql
   ├── 005_fix_plumbing_columns.sql
   ├── 006_remove_duplicate_pest_columns.sql
   ├── 007_remove_legacy_issue_columns.sql
   └── rollback/ (rollback scripts)
       ├── 001_rollback.sql
       └── ...
   ```

4. **Delete legacy directories:**
   ```bash
   rm -rf database/migrations/
   rm -rf Dev\ Setup/migrations/
   ```

5. **Move migration runner:**
   ```bash
   mv db/migrations/run-migrations.js migrations/run-migrations.js
   rmdir db/migrations
   ```

**Impact:** Single source of truth for migrations, clear execution order

---

### PHASE 4: BUILD ARTIFACTS (Zero Risk - 10 minutes)

**Problem:** Build artifacts committed to repository (should be gitignored).

#### Deletable Build Output

```bash
# JavaScript bundles
rm -rf dist/

# React build output
rm -rf client-intake/dist/

# VitePress cache
rm -rf docs/.vitepress/cache/

# Verify .gitignore contains these directories
echo "
dist/
client-intake/dist/
docs/.vitepress/cache/
" >> .gitignore
```

**Size Freed:** ~50MB
**Risk:** ✅ ZERO (regenerated on build)

**Rebuild Commands:**
```bash
# Rebuild main app
npm run build

# Rebuild React app
cd client-intake && npm run build

# Rebuild docs
cd docs && npm run docs:build
```

---

### PHASE 5: DATA DIRECTORIES (Use Judgment - 1 hour)

#### A. `/normalization work/` Directory

**Contents:**
- Python files (`api/`, `venv/`)
- JSON test outputs (`output_phase*.json`)
- Master data files (`master_*.json`)
- API logs (`api.log`)
- Phase documentation

**Questions:**
- Is this directory actively used for development?
- Is this the Python normalization pipeline source?
- Should this be moved to `/api/`?

**Action:**
```bash
# If active: Keep as-is
# If completed: Archive or delete
# If part of pipeline: Move to /api/normalization-work/
```

---

#### B. `/Processed Test/` Directory

**Contents:**
- 55 JSON test files
- Test cases for attorney scenarios (ClarkKent, TonyStark, etc.)

**Questions:**
- Are these used by Jest/Playwright tests?
- Are these legacy test fixtures?

**Action:**
```bash
# If used by tests:
mkdir -p tests/fixtures
mv Processed\ Test/* tests/fixtures/

# If legacy:
mkdir -p archive/test-data
mv Processed\ Test archive/test-data/
```

---

#### C. `/Dev Setup/` Directory

**Contents:**
- Legacy setup files
- Old migration files

**Recommendation:** Delete if no longer used

```bash
rm -rf Dev\ Setup/
```

---

### PHASE 6: SCRIPT CONSOLIDATION (Medium Risk - 2 hours)

**Problem:** 34 shell scripts in root directory with unclear organization:

```
deploy-*.sh (multiple deployment scripts)
fix-*.sh (problem-specific fixes)
run-*.sh (various utilities)
setup-*.sh (environment setup)
test-*.sh (testing utilities)
```

**Consolidation Plan:**

1. **Create scripts directory structure:**
   ```bash
   mkdir -p scripts/{deploy,fix,test,setup,utils}
   ```

2. **Categorize and move scripts:**
   ```bash
   mv deploy-*.sh scripts/deploy/
   mv fix-*.sh scripts/fix/
   mv test-*.sh scripts/test/
   mv setup-*.sh scripts/setup/
   ```

3. **Create script catalog:**
   ```bash
   # Create scripts/README.md documenting each script
   ```

4. **Archive old scripts:**
   ```bash
   mkdir -p scripts/archive
   # Move deprecated scripts to archive
   ```

**Impact:** Better organization, clearer purpose of each script

---

## VERIFICATION CHECKLIST

Before deleting any file, verify:

- [ ] File is not imported anywhere (grep for references)
- [ ] File is not used in tests
- [ ] File is not referenced in configuration
- [ ] File is not used in other branches
- [ ] File is not dynamically loaded at runtime
- [ ] File is not referenced in documentation

**Verification Commands:**
```bash
# Check for imports
grep -r "require.*filename" .
grep -r "import.*filename" .

# Check in tests
grep -r "filename" tests/

# Check in all branches
git log --all --source -- path/to/filename

# Check for dynamic requires
grep -r "require(\`" .
grep -r 'require(`' .
```

---

## RISK ASSESSMENT

### High Risk Operations (Require Testing)
- Deleting route files (verify not used)
- Consolidating database services (verify all imports)
- Deleting `/server/` directory (verify not imported)
- Renumbering migrations (verify DB state)

### Medium Risk Operations (Require Verification)
- Moving documentation files
- Consolidating migration directories
- Reorganizing scripts

### Zero Risk Operations (Safe Immediately)
- Deleting backup files
- Deleting empty temp files
- Deleting build artifacts
- Deleting old SQL backups

---

## CLEANUP SCHEDULE

### Week 1: Immediate Wins (Phase 0)
**Time:** 5 minutes
**Files:** 10 files
**Risk:** Zero

Tasks:
- Delete 8 backup files
- Delete 1 temp file
- Delete 1 SQL backup

---

### Week 2: Critical Consolidation (Phase 1)
**Time:** 2-3 hours
**Files:** ~5 files + 1 directory
**Risk:** Low-Medium

Tasks:
- Verify and delete duplicate route files (2 files)
- Consolidate database services (1 file)
- Verify and delete `/server/` directory

**Testing Required:**
- Run full test suite after each deletion
- Verify application starts successfully
- Test intake form submission
- Test database connections

---

### Week 3: Organization (Phases 2, 3, 6)
**Time:** 4-5 hours
**Files:** ~20 files reorganized
**Risk:** Low

Tasks:
- Archive 13 documentation files
- Consolidate migration directories
- Reorganize 34 shell scripts
- Create documentation for scripts

---

### Week 4: Optional Cleanup (Phases 4, 5)
**Time:** 1-2 hours
**Files:** Build artifacts + data directories
**Risk:** Zero (artifacts), Medium (data)

Tasks:
- Delete build artifacts (can rebuild)
- Audit data directories
- Archive or delete as appropriate

---

## SUCCESS METRICS

After cleanup, you should see:

✅ **Root directory:**
- 6 core documentation files (down from 43)
- 0 backup files (down from 8)
- 0 temporary files
- 1 entry point (server.js)

✅ **Routes directory:**
- 1 intake route file (down from 3)
- Clear, single-purpose route handlers

✅ **Services directory:**
- 1 database service (down from 2)
- No duplicate business logic

✅ **Migrations directory:**
- Single source of truth
- Clear numbering (001, 002, 003...)
- Organized rollback scripts

✅ **Scripts directory:**
- Organized by category
- Documented purpose
- Archived old scripts

✅ **Repository size:**
- ~50MB smaller (build artifacts removed)
- ~20 fewer files
- Clearer structure

---

## ROLLBACK PLAN

If cleanup causes issues:

1. **Git safety net:**
   ```bash
   # Create cleanup branch before starting
   git checkout -b cleanup/phase-0
   git add -A
   git commit -m "Checkpoint before cleanup Phase 0"
   ```

2. **For each phase:**
   ```bash
   git checkout -b cleanup/phase-N
   # Perform cleanup
   git add -A
   git commit -m "Cleanup Phase N: [description]"
   # Test thoroughly
   # If issues: git checkout main
   ```

3. **Backup critical files:**
   ```bash
   mkdir -p ../cleanup-backup-$(date +%Y%m%d)
   cp -r . ../cleanup-backup-$(date +%Y%m%d)/
   ```

---

## NEXT STEPS

1. **Review this plan** with team/stakeholders
2. **Create backup branch** before starting
3. **Execute Phase 0** (immediate deletions)
4. **Test thoroughly** after Phase 0
5. **Execute Phase 1** (consolidation) with testing
6. **Continue phases** as time permits

**Estimated Total Time:** 8-12 hours across 4 weeks
**Estimated Cleanup:** 20-30 files, 50MB, clearer structure

---

## QUESTIONS FOR REVIEW

Before proceeding, clarify:

1. **Is `/server/` directory from an abandoned refactoring?**
   - If yes: Delete entire directory
   - If no: Document its purpose

2. **Which intake route is canonical?**
   - Current answer: `intakes-jsonb.js`
   - Verify: Check if others are used anywhere

3. **Are migration directories intentionally separate?**
   - Current answer: No, appears accidental
   - Action: Consolidate to single `/migrations/`

4. **Is `/normalization work/` active development?**
   - If yes: Keep and document
   - If no: Archive or delete

5. **Should build artifacts be in .gitignore?**
   - Current answer: Yes
   - Action: Add to .gitignore and delete

---

**Generated by:** Claude Code Codebase Analysis
**Date:** 2025-11-18
**Version:** 1.0
