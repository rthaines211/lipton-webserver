# TEST 01: Environment Setup & Verification

**Purpose:** Get your local development environment ready for comprehensive intake-to-docgen testing.

**Time Required:** 10-15 minutes

**Prerequisites:**
- Node.js installed
- PostgreSQL installed and running
- Repository cloned to your machine

---

## Step 1: Start PostgreSQL Database

### 1.1 Verify PostgreSQL is Running

```bash
# Check if PostgreSQL is running
pg_isready

# Expected output:
# /tmp:5432 - accepting connections
```

If not running:
```bash
# macOS (if using Homebrew):
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Check again:
pg_isready
```

### 1.2 Verify Database Exists

```bash
# List databases
psql -l | grep legal_forms

# Expected: You should see 'legal_forms_db_dev' or similar
```

If database doesn't exist, create it:
```bash
createdb legal_forms_db_dev
```

---

## Step 2: Run Database Migrations

### 2.1 Navigate to Project Directory

```bash
cd "/Users/ryanhaines/.claude-worktrees/Lipton Webserver/musing-sinoussi"
```

### 2.2 Check Current Migration Status

```bash
# Connect to database
psql legal_forms_db_dev

# Check if intake tables exist
\dt client_intakes

# Expected: Table should exist
# If not, migrations need to be run
```

### 2.3 Run Migrations (if needed)

```bash
# Exit psql first
\q

# Run migrations 002-005 (if not already run)
psql legal_forms_db_dev -f database/migrations/002_create_shared_taxonomy.sql
psql legal_forms_db_dev -f database/migrations/003_create_intake_issue_tables.sql
psql legal_forms_db_dev -f database/migrations/004_add_delete_protection.sql
psql legal_forms_db_dev -f database/migrations/005_add_category_validation.sql
```

### 2.4 Verify Migrations Succeeded

```bash
psql legal_forms_db_dev

-- Check issue categories loaded
SELECT COUNT(*) FROM issue_categories;
-- Expected: 30

-- Check issue options loaded
SELECT COUNT(*) FROM issue_options;
-- Expected: 158

-- Check intake tables exist
\dt intake_*
-- Expected: intake_issue_selections, intake_issue_metadata

\q
```

**✅ Checkpoint:** You should see 30 categories and 158 options.

---

## Step 3: Install Dependencies

### 3.1 Install Node Modules

```bash
npm install
```

**Expected:** No errors. Dependencies install successfully.

### 3.2 Build Client Intake (if needed)

```bash
cd client-intake
npm install
npm run build

# Expected: Build completes successfully
# Output files created in client-intake/dist/
```

### 3.3 Return to Root Directory

```bash
cd ..
```

---

## Step 4: Configure Environment Variables

### 4.1 Check Environment File

```bash
# Check if .env file exists
ls -la .env

# If not, copy from example
cp .env.example .env
```

### 4.2 Verify Database Connection String

```bash
# Open .env file
cat .env | grep DATABASE_URL
```

**Expected format:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/legal_forms_db_dev
```

### 4.3 Verify Intake Schema Flag

```bash
cat .env | grep USE_NEW_INTAKE_SCHEMA
```

**Expected:**
```
USE_NEW_INTAKE_SCHEMA=true
```

If missing, add it:
```bash
echo "USE_NEW_INTAKE_SCHEMA=true" >> .env
```

**✅ Checkpoint:** Database URL configured, new schema enabled.

---

## Step 5: Start the Server

### 5.1 Start Node Server

```bash
npm start
```

**Expected output:**
```
Server running on port 3000
Database connected successfully
```

**⚠️ Common Issues:**

**Issue:** "Port 3000 already in use"
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Try npm start again
```

**Issue:** "Database connection failed"
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Verify database exists: `psql -l | grep legal_forms`

---

## Step 6: Verify Server is Running

### 6.1 Test Health Endpoint

Open a **new terminal window** (keep server running in first terminal):

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 6.2 Test Client Intake Page Loads

**In your browser, navigate to:**
```
http://localhost:3000/client-intake
```

**Expected:**
- Page loads without errors
- You see "Client Intake Form" heading
- Form has 3 sections:
  1. Personal & Contact Information
  2. Property & Lease Information
  3. Building & Housing Issues
- Progress bar shows "Step 1 of 3 (33%)"

**✅ Checkpoint:** Intake form loads and displays correctly.

### 6.3 Test Doc Gen Form Loads

**In your browser, navigate to:**
```
http://localhost:3000
```

**Expected:**
- Main document generation form loads
- You see tabs for different document types
- Property information section visible
- **"Load from Client Intake" button visible** at top of form

**✅ Checkpoint:** Doc gen form loads with "Load from Intake" button visible.

---

## Step 7: Verify Issue Categories Configuration

### 7.1 Check Browser Console (Client Intake)

1. Navigate to: `http://localhost:3000/client-intake`
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Look for any errors (red text)

**Expected:** No errors. Console is clean.

### 7.2 Inspect Building Issues Section

1. Scroll down to **Section 3: Building & Housing Issues**
2. You should see **20 category cards**:
   - Vermin
   - Insect Issues
   - HVAC Issues
   - Electrical Issues
   - Fire Hazard
   - Appliances
   - Plumbing
   - Cabinets
   - Flooring
   - Windows
   - Doors
   - Structural Issues
   - Common Areas
   - Trash Problems
   - Nuisance
   - Health Hazard
   - Harassment
   - Government Entities Contacted
   - Notices
   - Safety Issues

3. Click on **"Vermin"** toggle
4. Expand section should show individual checkboxes:
   - Rats/Mice
   - Bats
   - Pigeons
   - Skunks
   - Raccoons
   - Opossums

**✅ Checkpoint:** All 20 categories visible and expandable.

---

## Step 8: Verify Database-Driven Configuration

### 8.1 Check Shared Config File

```bash
cat shared/config/issue-categories-config.ts | head -20
```

**Expected:** File contains TypeScript configuration with categories and options.

### 8.2 Regenerate Config (Optional Verification)

```bash
# Run config generation script
npm run generate:issue-config

# Check output
# Expected: "✅ Generated issue-categories-config.ts with 30 categories and 158 options"
```

**✅ Checkpoint:** Config generation works and produces valid output.

---

## Step 9: Browser DevTools Setup

### 9.1 Open Network Tab

1. Open browser DevTools (F12)
2. Click **Network** tab
3. Check **"Preserve log"** checkbox
4. Keep DevTools open during testing

**Why:** You'll monitor API requests during form submission and intake loading.

### 9.2 Open Console Tab

1. Click **Console** tab
2. Keep this visible to catch any JavaScript errors

**Why:** Errors will appear here if form validation or field mapping fails.

---

## Step 10: Final Verification Checklist

Before proceeding to intake submission testing, verify:

- [ ] **PostgreSQL running:** `pg_isready` returns "accepting connections"
- [ ] **Database exists:** `psql -l | grep legal_forms` shows database
- [ ] **Migrations complete:** 30 categories, 158 options in database
- [ ] **Server running:** `http://localhost:3000/health` returns OK
- [ ] **Client intake loads:** `http://localhost:3000/client-intake` displays form
- [ ] **Doc gen loads:** `http://localhost:3000` displays form with "Load from Intake" button
- [ ] **20 categories visible:** All building issue categories present in Section 3
- [ ] **No console errors:** Browser console is clean (no red errors)
- [ ] **Environment configured:** `.env` has `USE_NEW_INTAKE_SCHEMA=true`

**✅ ALL CHECKS PASSED:** Environment is ready for testing.

---

## Troubleshooting

### Issue: Migrations fail with "table already exists"

**Solution:**
```bash
# Check which migrations have already run
psql legal_forms_db_dev -c "\dt"

# If tables exist, migrations are already done
# Skip to verification step
```

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Also rebuild client-intake
cd client-intake
rm -rf node_modules
npm install
npm run build
cd ..
```

### Issue: Client intake page shows old form (9 sections)

**Solution:**
```bash
# Check environment variable
cat .env | grep USE_NEW_INTAKE_SCHEMA

# Should be: USE_NEW_INTAKE_SCHEMA=true
# If false or missing, update .env and restart server
```

### Issue: Categories not showing individual checkboxes

**Solution:**
```bash
# Regenerate configuration from database
npm run generate:issue-config

# Restart server
# Ctrl+C in server terminal
npm start

# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## Next Steps

**Environment is ready!** Proceed to:

➡️ **TEST_02_CLIENT_INTAKE_SUBMISSION.md** - Submit a complete intake form with every checkbox tested.

---

**Created:** 2025-12-16
**Test Environment:** Local Development
**Phase:** 1-4 (Post Phase 3.5 Simplification)
