# TEST 03: Intake Data Verification

**Purpose:** Verify that the submitted intake data saved correctly in the database and is accessible via API.

**Time Required:** 15-20 minutes

**Prerequisites:**
- TEST_02 completed (intake form submitted)
- Have your **Intake Number** from TEST_02 (e.g., `INT-20251216-1234`)
- Server still running at `http://localhost:3000`

**What We're Testing:**
- Data saved to `client_intakes` table
- Building issues saved correctly
- API endpoints return correct data
- All 158 checkboxes + 9 toggles preserved in database

---

## Step 1: Find Your Intake ID

### 1.1 Get Intake ID from Database

Open terminal and connect to database:

```bash
psql legal_forms_db_dev
```

Query for your intake:

```sql
SELECT
    id,
    intake_number,
    first_name,
    last_name,
    created_at
FROM client_intakes
WHERE intake_number = 'INT-20251216-XXXX'  -- Replace with your intake number
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
```
                  id                  |   intake_number    | first_name | last_name |         created_at
--------------------------------------+--------------------+------------+-----------+----------------------------
 12345678-1234-1234-1234-123456789012 | INT-20251216-1234  | John       | Doe       | 2025-12-16 10:30:45.123456
```

**WRITE DOWN THE ID (UUID):** _________________________________

---

## Step 2: Verify Personal & Contact Information

### 2.1 Check Main Fields

Still in `psql`, run:

```sql
SELECT
    first_name,
    last_name,
    date_of_birth,
    email_address,
    primary_phone,
    is_head_of_household
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';  -- Replace with your ID
```

**Expected Values:**
- `first_name`: John
- `last_name`: Doe
- `date_of_birth`: 1985-01-15
- `email_address`: john.doe.test@example.com
- `primary_phone`: (555) 123-4567
- `is_head_of_household`: true

**✅ Verification:** All fields match test data from TEST_02.

---

## Step 3: Verify Property Information

### 3.1 Check Property Address (JSONB)

```sql
SELECT
    property_address->>'street' AS street,
    property_address->>'unit' AS unit,
    property_address->>'city' AS city,
    property_address->>'state' AS state,
    property_address->>'zipCode' AS zip,
    property_county
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';
```

**Expected Values:**
- `street`: 123 Main Street
- `unit`: Apt 4B
- `city`: Los Angeles
- `state`: California
- `zip`: 90001
- `property_county`: Los Angeles

**✅ Verification:** All property fields match.

### 3.2 Check Lease Information

```sql
SELECT
    tenancy_info->>'monthlyRent' AS rent,
    tenancy_info->>'unitsInBuilding' AS units,
    retainer_info->>'hasRetainerWithAnotherAttorney' AS has_retainer
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';
```

**Expected Values:**
- `rent`: 1800 (or "1800")
- `units`: 24 (or "24")
- `has_retainer`: false

**✅ Verification:** Lease info saved correctly.

---

## Step 4: Verify Building Issues (Critical Test)

### 4.1 Check Building Issues JSONB Structure

```sql
SELECT jsonb_pretty(building_issues)
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE'
LIMIT 50;  -- Show first 50 lines
```

**Expected Output:** JSONB object containing all checked issues.

Example snippet:
```json
{
  "pestRats": true,
  "pestMice": true,
  "pestBats": true,
  "pestAnts": true,
  "pestRoaches": true,
  "hvacAirConditioner": true,
  "hvacHeater": true,
  ...
}
```

### 4.2 Count Total Issues Selected

```sql
SELECT
    id,
    jsonb_object_keys(building_issues) AS issue_key
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';
```

**Count the results.** You should see many rows (one per checkbox).

**Expected:** At minimum 150+ issues (since you checked ALL boxes).

### 4.3 Verify Specific Categories

Check that specific categories exist:

```sql
-- Vermin category
SELECT
    building_issues->>'pestRats' AS rats,
    building_issues->>'pestMice' AS mice,
    building_issues->>'pestBats' AS bats,
    building_issues->>'pestSkunks' AS skunks,
    building_issues->>'pestRaccoons' AS raccoons,
    building_issues->>'pestOpossums' AS opossums
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';
```

**Expected:** All values should be `true` or `"true"`.

**✅ Verification:** Vermin checkboxes saved.

```sql
-- Plumbing category (15 items)
SELECT
    building_issues->>'plumbingToilet' AS toilet,
    building_issues->>'plumbingNohotwater' AS no_hot_water,
    building_issues->>'plumbingLeaks' AS leaks,
    building_issues->>'plumbingSewagecomingout' AS sewage
FROM client_intakes
WHERE id = 'YOUR-UUID-HERE';
```

**Expected:** All values are `true`.

**✅ Verification:** Plumbing checkboxes saved.

---

## Step 5: Test API Endpoints (User Perspective)

### 5.1 List All Intakes

Open new terminal (keep psql running in other), run:

```bash
curl -s http://localhost:3000/api/intakes-jsonb | jq . | head -50
```

**Expected:**
- Returns JSON array of intakes
- Your test intake appears in the list
- Status code: 200

**User Experience Check:**
- Response is fast (< 1 second)
- Data is readable
- No errors in server logs

### 5.2 Get Specific Intake by ID

```bash
curl -s http://localhost:3000/api/intakes-jsonb/YOUR-UUID-HERE | jq . | head -100
```

**Expected:**
- Returns full intake data
- Includes `building_issues` object
- Status code: 200

**✅ Verification:** API returns complete intake data.

### 5.3 Get Intake in Doc-Gen Format (Critical for Next Test)

This endpoint transforms intake data for document generation:

```bash
curl -s "http://localhost:3000/api/intakes-jsonb/YOUR-UUID-HERE/doc-gen-format" | jq . | head -100
```

**Expected Output Structure:**
```json
{
  "property-address": "123 Main Street",
  "apartment-unit": "Apt 4B",
  "city": "Los Angeles",
  "state": "California",
  "zip-code": "90001",
  "plaintiff-1-first-name": "John",
  "plaintiff-1-last-name": "Doe",
  "plaintiff-1-phone": "(555) 123-4567",
  "plaintiff-1-email": "john.doe.test@example.com",
  "vermin-toggle-1": true,
  "vermin-RatsMice-1": true,
  "insect-toggle-1": true,
  "insect-Ants-1": true,
  "insect-Roaches-1": true,
  ...
}
```

**Critical Verifications:**

1. **Property fields exist:**
   - `property-address`
   - `apartment-unit`
   - `city`, `state`, `zip-code`

2. **Plaintiff fields exist:**
   - `plaintiff-1-first-name`
   - `plaintiff-1-last-name`
   - `plaintiff-1-phone`
   - `plaintiff-1-email`

3. **Category toggles exist:**
   - `vermin-toggle-1: true`
   - `insect-toggle-1: true`
   - `hvac-toggle-1: true`
   - `electrical-toggle-1: true`
   - (All 21 categories with individual checkboxes)

4. **Individual checkboxes exist:**
   - `vermin-RatsMice-1: true`
   - `insect-Ants-1: true`
   - `plumbing-Toilet-1: true`
   - (All checked boxes from your test)

### 5.4 Save Doc-Gen Format Output for Comparison

```bash
curl -s "http://localhost:3000/api/intakes-jsonb/YOUR-UUID-HERE/doc-gen-format" | jq . > /tmp/intake-docgen-format.json
```

**This file will be used in TEST_04 to compare against doc gen form population.**

---

## Step 6: Verify Field Mapping Accuracy

### 6.1 Check Category Toggle Fields

Count the toggle fields in doc-gen format:

```bash
cat /tmp/intake-docgen-format.json | grep "toggle-1" | wc -l
```

**Expected:** 21 lines (21 categories with individual checkboxes have toggles).

Categories 22-30 are simple toggles stored differently.

### 6.2 Check Individual Checkbox Fields

Count individual checkbox fields:

```bash
cat /tmp/intake-docgen-format.json | grep -E '"(vermin|insect|hvac|electrical|plumbing|structure)-' | wc -l
```

**Expected:** 150+ lines (all the individual checkboxes you checked).

### 6.3 Spot Check Specific Mappings

Check that database field names map to doc-gen format correctly:

```bash
# Check vermin
cat /tmp/intake-docgen-format.json | grep '"vermin-'
```

**Expected Output:**
```json
"vermin-toggle-1": true,
"vermin-RatsMice-1": true,
"vermin-Bats-1": true,
"vermin-Skunks-1": true,
"vermin-Raccoons-1": true,
"vermin-Pigeons-1": true,
"vermin-Opossums-1": true,
```

**✅ Verification:** All 6 vermin checkboxes present and true.

```bash
# Check plumbing (should have 15 items)
cat /tmp/intake-docgen-format.json | grep '"plumbing-' | wc -l
```

**Expected:** At least 15 lines (plumbing has 15 checkboxes).

---

## Step 7: Verify Data Consistency

### 7.1 Compare Database to API Output

**From Database (Step 4.3):**
- `pestRats: true`
- `pestMice: true`

**From API (Step 6.3):**
- `vermin-RatsMice-1: true` (combines Rats + Mice)
- `vermin-Bats-1: true`

**✅ Verification:** Database checkbox mappings translate correctly to doc-gen format.

### 7.2 Exit PostgreSQL

```bash
\q
```

---

## Step 8: User Experience Verification

Now test from an **attorney's perspective** - can they find and preview this intake?

### 8.1 Test Intake List Endpoint

```bash
curl -s "http://localhost:3000/api/intakes-jsonb?limit=10" | jq '. | length'
```

**Expected:** Returns number of intakes (at least 1 - yours).

### 8.2 Test Intake Search (by Name)

```bash
curl -s "http://localhost:3000/api/intakes-jsonb?search=John" | jq .
```

**Expected:** Your test intake appears in results.

**User Experience Check:**
- Search is fast (< 1 second)
- Results include relevant fields (name, address, intake number)
- Easy to identify the correct intake

### 8.3 Test Intake Search (by Address)

```bash
curl -s "http://localhost:3000/api/intakes-jsonb?search=Main Street" | jq .
```

**Expected:** Your test intake appears in results.

---

## Step 9: Verification Checklist

Before proceeding to TEST_04, confirm:

### Database Storage
- [ ] **Personal info saved:** First name, last name, DOB, email, phone
- [ ] **Property info saved:** Address, unit, city, state, ZIP, county
- [ ] **Lease info saved:** Rent, units in building, retainer status
- [ ] **Building issues saved:** JSONB object with 150+ keys
- [ ] **All checkboxes preserved:** Spot checks confirm data integrity

### API Endpoints
- [ ] **GET /api/intakes-jsonb** - Returns list of intakes
- [ ] **GET /api/intakes-jsonb/:id** - Returns full intake data
- [ ] **GET /api/intakes-jsonb/:id/doc-gen-format** - Returns transformed data
- [ ] **Search works:** Can find intake by name or address
- [ ] **All responses return 200 OK**
- [ ] **No errors in server logs**

### Field Mapping
- [ ] **Property fields** map correctly (hyphenated keys)
- [ ] **Plaintiff fields** map correctly (plaintiff-1-* prefix)
- [ ] **Category toggles** exist for all 21 checkbox categories
- [ ] **Individual checkboxes** map correctly (category-option-1 format)
- [ ] **Field counts match:** 158 checkboxes represented

### Data Integrity
- [ ] **No data loss:** All form inputs saved
- [ ] **Correct data types:** Strings, booleans, numbers appropriate
- [ ] **JSONB format valid:** Can query building_issues object
- [ ] **Intake number generated:** Unique identifier assigned
- [ ] **Timestamps recorded:** created_at, updated_at present

---

## Step 10: Record Verification Results

**Intake ID (UUID):** _____________________________________

**Intake Number:** _____________________________________

**Database Verification:** ✅ PASS / ❌ FAIL

**API Endpoints:** ✅ PASS / ❌ FAIL

**Field Mapping:** ✅ PASS / ❌ FAIL

**Data Integrity:** ✅ PASS / ❌ FAIL

**Overall Test Result:** ✅ PASS / ❌ FAIL

**Issues Found:**
_______________________________________
_______________________________________
_______________________________________

---

## Troubleshooting

### Issue: Intake not found in database

**Solution:**
```sql
-- Check recent intakes
SELECT id, intake_number, first_name, last_name, created_at
FROM client_intakes
ORDER BY created_at DESC
LIMIT 5;

-- If empty, form submission may have failed
-- Return to TEST_02 and resubmit
```

### Issue: Building issues JSONB is empty or null

**Solution:**
```sql
-- Check if building_issues column exists
\d client_intakes

-- Check if data is in old format
SELECT building_issues IS NOT NULL, building_issues
FROM client_intakes
WHERE id = 'YOUR-UUID';

-- If null, form may have submitted without issues
-- This is a bug - return to TEST_02 and ensure all checkboxes are checked
```

### Issue: API returns 404 for intake ID

**Solution:**
```bash
# Verify intake ID is correct
psql legal_forms_db_dev -c "SELECT id FROM client_intakes ORDER BY created_at DESC LIMIT 1;"

# Copy the exact UUID and try again
curl -s http://localhost:3000/api/intakes-jsonb/<UUID-HERE>
```

### Issue: Doc-gen-format endpoint returns empty object

**Solution:**
1. Check server logs for transformation errors
2. Verify building_issues JSONB has data
3. Check routes/intakes-jsonb.js for mapping logic
4. Verify form submission included building issues

### Issue: Field mappings don't match doc-gen format

**Solution:**
- This indicates a mapping bug in routes/intakes-jsonb.js
- Compare database field names to doc-gen format output
- File a bug report with specific field mismatches

---

## Next Steps

**✅ Data Verification Complete!**

You've confirmed:
- All form data saved to database correctly
- API endpoints return complete data
- Field mappings transform correctly to doc-gen format
- Data integrity maintained (no loss or corruption)

The `/tmp/intake-docgen-format.json` file now contains your intake in doc-gen format. This will be used in TEST_04 to verify the "Load from Intake" feature populates the doc gen form correctly.

➡️ Proceed to **TEST_04_LOAD_INTO_DOCGEN.md** to test loading this intake into the document generation form.

---

**Created:** 2025-12-16
**Focus:** Data integrity & API functionality from user perspective
**Time to Complete:** 15-20 minutes
