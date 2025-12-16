# Intake-to-DocGen Testing Suite

**Complete testing documentation for the Client Intake → Document Generation workflow.**

---

## Overview

This testing suite provides step-by-step instructions to test the complete intake-to-docgen pipeline from the **user's perspective**. All tests focus on ensuring every field works correctly and the user experience is smooth.

**What Gets Tested:**
- ✅ All 30 building issue categories
- ✅ All 158 individual checkboxes
- ✅ All 9 simple toggle categories
- ✅ All property and plaintiff fields
- ✅ Complete data flow: intake → database → API → doc gen form

---

## Test Files (Execute in Order)

### 📋 [TEST_01_ENVIRONMENT_SETUP.md](TEST_01_ENVIRONMENT_SETUP.md)
**Time:** 10-15 minutes

Get your local development environment ready:
- Start PostgreSQL and Node server
- Run database migrations
- Verify issue categories loaded (30 categories, 158 options)
- Confirm intake form and doc gen form load correctly
- Set up browser DevTools for monitoring

**Prerequisites:** Node.js, PostgreSQL installed

---

### 📝 [TEST_02_CLIENT_INTAKE_SUBMISSION.md](TEST_02_CLIENT_INTAKE_SUBMISSION.md)
**Time:** 30-45 minutes

Submit a comprehensive test intake with **every checkbox**:

**Section 1: Personal & Contact (8 fields)**
- First name, last name, DOB, email, phone

**Section 2: Property & Lease (8 fields)**
- Address, unit, city, state, ZIP, rent, units in building

**Section 3: Building Issues (30 categories, 158 checkboxes)**

**Categories with Individual Checkboxes (21 categories):**
1. Vermin (6 boxes) - Rats/Mice, Bats, Pigeons, Skunks, Raccoons, Opossums
2. Insects (10 boxes) - Ants, Roaches, Flies, Bedbugs, Wasps, Hornets, Spiders, Termites, Mosquitos, Bees
3. HVAC (3 boxes) - Air conditioner, Heater, Ventilation
4. Electrical (7 boxes) - Outlets, Panel, Wall switches, Exterior/Interior lighting, Fixtures, Fans
5. Fire Hazard (5 boxes) - Smoke alarms, Fire extinguisher, Non-compliant electricity, Non-GFI outlets, CO detectors
6. Government (7 boxes) - Health dept, Housing authority, Code enforcement, Fire dept, Police, Environmental health, Health services
7. Appliances (7 boxes) - Stove, Dishwasher, Washer/dryer, Oven, Microwave, Garbage disposal, Refrigerator
8. Plumbing (15 boxes) - Toilet, Water pressure, Clogged bath/sinks/shower, Hot/cold water, Fixtures, Sewage, Leaks, etc.
9. Cabinets (3 boxes) - Broken, Hinges, Alignment
10. Flooring (4 boxes) - Uneven, Carpet, Nails, Tiles
11. Windows (6 boxes) - Broken, Screens, Leaks, Locks, Missing, Broken screens
12. Doors (8 boxes) - Broken, Knobs, Locks, Hinges, Sliding doors, Waterproofing, Water intrusion, Won't close
13. Structural (15 boxes) - Ceiling bumps/holes/stains, Wall stains/holes, Paint, Deck, Waterproofing, Stairs, Floods, Leaks
14. Common Areas (16 boxes) - Mailbox, Parking, Car damage, Flooding, Entrances, Pool, Jacuzzi, Laundry, Rec room, Gym, Elevator, Filth, Vermin, Insects, Gate, Blocked areas
15. Trash (2 boxes) - Inadequate receptacles, Improper servicing
16. Nuisance (4 boxes) - Drugs, Smoking, Noisy neighbors, Gangs
17. Health Hazard (8 boxes) - Mold, Mildew, Mushrooms, Sewage, Fumes, Chemical contamination, Toxic water, Odors
18. Harassment (15 boxes) - Unlawful detainer, Eviction threats, By defendant/maintenance/manager/owner/tenants, Illegitimate notices, Refusal to repair, Threats, Aggressive language, Physical threats, Singling out, Duplicative notices, Untimely response
19. Notices (6 boxes) - 3-day, 24-hour, 30-day, 60-day, To quit, Perform or quit
20. Utility (5 boxes) - Gas leak, Water shutoffs, Electricity shutoffs, Heat shutoff, Gas shutoff
21. Safety (6 boxes) - Broken security gate, Broken doors, Unauthorized entries, Broken buzzer, Security cameras, Inoperable locks

**Simple Toggles (9 categories):**
22-30. Injury Issues, Nonresponsive Landlord, Unauthorized Entries, Stolen Items, Damaged Items, Age Discrimination, Racial Discrimination, Disability Discrimination, Security Deposit Issues

**Result:** Intake Number (e.g., INT-20251216-1234) - **WRITE THIS DOWN**

---

### 🔍 [TEST_03_INTAKE_DATA_VERIFICATION.md](TEST_03_INTAKE_DATA_VERIFICATION.md)
**Time:** 15-20 minutes

Verify data saved correctly:
- Query database for your intake
- Verify all personal/property fields saved
- Check building_issues JSONB contains 150+ keys
- Test API endpoints (list, get by ID, doc-gen-format)
- Verify field mappings transform correctly
- Save `/tmp/intake-docgen-format.json` for comparison

**Critical Checks:**
- Personal info: First name, last name, DOB, email, phone
- Property info: Address, unit, city, state, ZIP, county, rent
- Building issues: All 158 checkboxes + 9 toggles present in JSONB
- API returns 200 OK for all endpoints
- doc-gen-format endpoint returns flat hyphenated keys

---

### 🎯 [TEST_04_LOAD_INTO_DOCGEN.md](TEST_04_LOAD_INTO_DOCGEN.md)
**Time:** 30-40 minutes

Test the "Load from Intake" feature - **THE CRITICAL TEST**:

**Modal Workflow:**
1. Open doc gen form at `http://localhost:3000`
2. Click "Load from Client Intake" button
3. Modal opens showing intake list
4. Find your test intake (John Doe, 123 Main Street)
5. Click "Select" button
6. Modal closes, form populates automatically

**Verification - Property Fields (11 fields):**
- Property address, unit, city, state, ZIP, county, filing city/county, rent, units in building

**Verification - Plaintiff Fields (10 fields):**
- First name, last name, full name, phone, email, DOB, age, is adult, head of household, age category

**Verification - Category Toggles (21 toggles):**
- Verify ALL 21 category master toggles are ON

**Verification - Individual Checkboxes (158 checkboxes):**

Expand each category and verify ALL checkboxes are CHECKED:
- Vermin: 6/6 ✓
- Insects: 10/10 ✓
- HVAC: 3/3 ✓
- Electrical: 7/7 ✓
- Fire Hazard: 5/5 ✓
- Government: 7/7 ✓
- Appliances: 7/7 ✓
- Plumbing: 15/15 ✓
- Cabinets: 3/3 ✓
- Flooring: 4/4 ✓
- Windows: 6/6 ✓
- Doors: 8/8 ✓
- Structural: 15/15 ✓
- Common Areas: 16/16 ✓
- Trash: 2/2 ✓
- Nuisance: 4/4 ✓
- Health Hazard: 8/8 ✓
- Harassment: 15/15 ✓
- Notices: 6/6 ✓
- Utility: 5/5 ✓
- Safety: 6/6 ✓

**Verification - Simple Toggles (9 toggles):**
- All 9 categories ON

**User Experience Check:**
- Form is editable after loading
- No console errors
- Visual state is clear

---

### ✅ [TEST_05_FIELD_CONSISTENCY_CHECKLIST.md](TEST_05_FIELD_CONSISTENCY_CHECKLIST.md)
**Time:** 20-30 minutes

Master verification matrix for 200 total fields:

**Comprehensive Checklist:**
- 11 property fields
- 10 plaintiff fields
- 21 category toggles
- 158 individual checkboxes (all categories expanded)
- 9 simple toggles

**Field-by-Field Tables:**
- Each category has its own checklist table
- Document which fields pass/fail
- Record exact field IDs
- Note any missing mappings

**Result:**
- Success Rate: _____%
- Status: ✅ PASS (≥95%) / ⚠️ NEEDS WORK (90-94%) / ❌ FAIL (<90%)
- Missing Mappings Report

---

## Quick Reference

### Total Coverage

| Category | Count |
|----------|-------|
| **Property Fields** | 11 |
| **Plaintiff Fields** | 10 |
| **Category Toggles** | 21 |
| **Individual Checkboxes** | 158 |
| **Simple Toggles** | 9 |
| **TOTAL FIELDS** | **200** |

### Test Execution Time

| Test | Time |
|------|------|
| TEST_01: Environment Setup | 10-15 min |
| TEST_02: Intake Submission | 30-45 min |
| TEST_03: Data Verification | 15-20 min |
| TEST_04: Load Into DocGen | 30-40 min |
| TEST_05: Consistency Checklist | 20-30 min |
| **TOTAL** | **~2 hours** |

### Categories by Checkbox Count

| Rank | Category | Checkboxes |
|------|----------|------------|
| 1 | Common Areas | 16 |
| 2 | Plumbing | 15 |
| 2 | Structural | 15 |
| 2 | Harassment | 15 |
| 5 | Insects | 10 |
| 6 | Doors | 8 |
| 6 | Health Hazard | 8 |
| 8 | Electrical | 7 |
| 8 | Government | 7 |
| 8 | Appliances | 7 |
| 11 | Vermin | 6 |
| 11 | Windows | 6 |
| 11 | Notices | 6 |
| 11 | Safety | 6 |
| 15 | Fire Hazard | 5 |
| 15 | Utility | 5 |
| 17 | Flooring | 4 |
| 17 | Nuisance | 4 |
| 19 | HVAC | 3 |
| 19 | Cabinets | 3 |
| 21 | Trash | 2 |

---

## Success Criteria

### Passing Thresholds

**TEST_01 (Environment Setup):**
- ✅ Server running (200 OK)
- ✅ Database accessible
- ✅ 30 categories, 158 options loaded
- ✅ Forms load without errors

**TEST_02 (Intake Submission):**
- ✅ All 30 categories selectable
- ✅ All 158 checkboxes checkable
- ✅ Form submits successfully (200 OK)
- ✅ Intake number generated

**TEST_03 (Data Verification):**
- ✅ All form data in database
- ✅ building_issues JSONB has 150+ keys
- ✅ API endpoints return 200 OK
- ✅ doc-gen-format transformation works

**TEST_04 (Load Into DocGen):**
- ✅ Modal opens and lists intakes
- ✅ All 21 category toggles ON
- ✅ All 158 checkboxes CHECKED
- ✅ All 9 simple toggles ON
- ✅ All property/plaintiff fields populated
- ✅ Form is editable

**TEST_05 (Consistency Checklist):**
- ✅ 95%+ field success rate (190+ / 200 fields)
- ✅ All critical fields mapped
- ✅ No missing category mappings
- ✅ Field values match exactly

**Overall Success:** ALL 5 tests PASS

---

## Troubleshooting

### Common Issues

**Environment Setup Fails:**
- Check PostgreSQL running: `pg_isready`
- Check server running: `curl http://localhost:3000/health`
- Verify migrations ran: `psql legal_forms_db_dev -c "SELECT COUNT(*) FROM issue_categories;"`

**Intake Submission Fails:**
- Check browser console for JavaScript errors
- Verify all required fields filled
- Check server logs for API errors
- Ensure `USE_NEW_INTAKE_SCHEMA=true` in .env

**Data Not in Database:**
- Form submission may have failed silently
- Check Network tab for failed POST request
- Check server terminal for errors
- Verify database connection string in .env

**Modal Doesn't Open:**
- Check if js/intake-modal.js file exists
- Hard refresh browser: Cmd+Shift+R
- Check Network tab for failed script loads
- Verify button has correct event listener

**Checkboxes Don't Populate:**
- Check `/tmp/intake-docgen-format.json` exists
- Compare field IDs in JSON to form HTML
- Missing mappings = bug in routes/intakes-jsonb.js
- Document which specific checkboxes failed
- Use TEST_05 checklist to identify gaps

---

## Reporting Issues

If you find bugs or missing mappings, create a report with:

### Required Information
1. **Which test failed:** TEST_01 / TEST_02 / TEST_03 / TEST_04 / TEST_05
2. **Specific field/checkbox:** Name and expected field ID
3. **What you expected:** Value/state
4. **What actually happened:** Actual value/state
5. **Browser console errors:** Screenshot or text
6. **Server logs:** Any relevant error messages

### Example Bug Report

```
TEST: TEST_04 - Load Into DocGen
CATEGORY: Plumbing
CHECKBOX: "Clogged toilets"
EXPECTED FIELD ID: plumbing-Cloggedtoilets-1
EXPECTED STATE: CHECKED
ACTUAL STATE: UNCHECKED
NOTES: This checkbox is in the intake data (see /tmp/intake-docgen-format.json)
but doesn't populate in the form. Likely missing from field mapping.
```

---

## File Locations

**Test Documentation:**
```
docs/testing/
├── README.md (this file)
├── TEST_01_ENVIRONMENT_SETUP.md
├── TEST_02_CLIENT_INTAKE_SUBMISSION.md
├── TEST_03_INTAKE_DATA_VERIFICATION.md
├── TEST_04_LOAD_INTO_DOCGEN.md
└── TEST_05_FIELD_CONSISTENCY_CHECKLIST.md
```

**Code Under Test:**
```
client-intake/src/components/IntakeFormExpanded.tsx (intake form)
shared/components/ (shared checkbox components)
shared/config/issue-categories-config.ts (category definitions)
routes/intakes-jsonb.js (API endpoint + transformations)
js/intake-modal.js (load from intake modal)
index.html (doc gen form)
```

**Database:**
```
database/migrations/002_create_shared_taxonomy.sql (categories/options)
database/migrations/003_create_intake_issue_tables.sql (intake tables)
database/seed-data/issue-categories.csv (30 categories)
database/seed-data/issue-options.csv (158 options)
```

---

## Version History

**v1.0 - 2025-12-16**
- Initial comprehensive testing suite
- 5 test files covering complete workflow
- 200 total fields (11 property + 10 plaintiff + 21 toggles + 158 checkboxes + 9 simple toggles)
- User-focused testing approach
- Complete checkbox coverage

---

## Next Steps

After completing all 5 tests:

1. **If all tests pass:** Ready for Phase 3D (cloud dev deployment)
2. **If minor issues found:** File bug reports, fix mappings, retest
3. **If major issues found:** Review transformation code, verify database data, run automated tests

---

**Testing Philosophy:**
> "Test from the user's perspective. If an attorney can't successfully load an intake and generate documents, the feature doesn't work - no matter what the technical tests say."

---

**Created:** 2025-12-16
**Updated:** 2025-12-16
**Maintainer:** Development Team
**Purpose:** Ensure 100% field consistency in intake-to-docgen pipeline
