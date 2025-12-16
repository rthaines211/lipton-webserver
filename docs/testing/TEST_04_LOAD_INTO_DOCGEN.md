# TEST 04: Load Intake into Document Generation Form

**Purpose:** Test the "Load from Client Intake" feature - verify ALL fields and checkboxes populate correctly in the doc gen form.

**Time Required:** 30-40 minutes

**Prerequisites:**
- TEST_03 completed (intake verified in database)
- Have your **Intake ID (UUID)** from TEST_03
- Server running at `http://localhost:3000`
- File `/tmp/intake-docgen-format.json` exists (from TEST_03)

**What We're Testing:**
- "Load from Intake" button works
- Modal displays intake list
- Selecting intake populates ALL form fields
- All 158 checkboxes + 9 toggles map correctly
- Attorney can see and edit populated data
- User experience is smooth and intuitive

---

## Step 1: Open Document Generation Form

### 1.1 Navigate to Doc Gen

```
http://localhost:3000
```

**Expected:**
- Main document generation form loads
- You see tabs for different document types
- Property information section visible at top
- Form is empty (no data populated yet)

### 1.2 Locate "Load from Intake" Button

Look for button at the **top of the form** (above Property section).

**Expected:**
- Button labeled: **"Load from Client Intake"** or **"🔍 Load from Client Intake"**
- Button is clearly visible
- Button has search/magnifying glass icon

**✅ Checkpoint:** Button exists and is clickable.

---

## Step 2: Open Load from Intake Modal

### 2.1 Click the Button

Click **"Load from Client Intake"** button.

**Expected:**
- Modal window opens (overlay appears)
- Modal size: 800×600px approximately
- Modal has header: "Load from Client Intake"
- Modal has close button (X) in top right
- Modal shows loading spinner initially

**User Experience Check:**
- Modal opens smoothly (no lag)
- Backdrop dims the main form
- Modal is centered on screen

### 2.2 Wait for Intake List to Load

Wait 1-2 seconds for intakes to load.

**Expected:**
- Loading spinner disappears
- Table of intakes appears
- Your test intake is visible in the list
- Table shows: Name, Address, Intake Number, Date, Status

**✅ Checkpoint:** Intake list loads and displays correctly.

---

## Step 3: Find Your Test Intake

### 3.1 Visual Scan

Look through the intake list for your test data:

**Search For:**
- Name: **John Doe**
- Address: **123 Main Street**
- Intake Number: **INT-20251216-XXXX** (yours from TEST_02)

**Expected:** Your intake is visible in the table.

### 3.2 Use Search (Optional)

If many intakes exist, use search:

1. Find search input box at top of modal
2. Type: `John`
3. Press Enter or wait for auto-search

**Expected:**
- Table filters to show only "John" intakes
- Your test intake remains visible
- Search is fast (< 1 second)

**User Experience Check:**
- Search is responsive
- Results update smoothly
- Clear which intake matches search

---

## Step 4: Select Your Intake

### 4.1 Click "Select" Button

Find your test intake row and click the **"Select"** button.

**Expected:**
- Button shows loading state briefly
- Modal closes automatically
- Main form now populated with data
- Success notification appears (green toast): "Intake loaded successfully"

**User Experience Check:**
- Modal closes smoothly
- Form updates without page refresh
- No flickering or layout shifts
- Loading state is clear

### 4.2 Verify Success Message

Look for success notification (usually top-right of screen).

**Expected Message:**
```
✅ Intake loaded successfully!
Loaded intake: INT-20251216-XXXX
```

**✅ Checkpoint:** Intake loaded, form populated, success message visible.

---

## Step 5: Verify Property Information Fields

### 5.1 Property Address Section

Scroll to Property section and verify these fields are populated:

| Field Label | Expected Value |
|-------------|----------------|
| **Property Address** | 123 Main Street |
| **Apartment/Unit** | Apt 4B |
| **City** | Los Angeles |
| **State** | California |
| **ZIP Code** | 90001 |
| **Filing County** | Los Angeles |

**Visual Check:** All fields have values (not empty).

**✅ Verification:** All 6 property fields populated correctly.

---

## Step 6: Verify Plaintiff Information

### 6.1 Plaintiff #1 Fields

Find the Plaintiff section and verify:

| Field Label | Expected Value |
|-------------|----------------|
| **Plaintiff 1 - First Name** | John |
| **Plaintiff 1 - Last Name** | Doe |
| **Plaintiff 1 - Phone** | (555) 123-4567 |
| **Plaintiff 1 - Email** | john.doe.test@example.com |
| **Plaintiff 1 - Date of Birth** | 01/15/1985 |
| **Plaintiff 1 - Age** | 39 (or current age) |

**User Experience Check:**
- All plaintiff fields visible and readable
- Phone format matches (formatted or raw both OK)
- Age calculated correctly from DOB

**✅ Verification:** All 6 plaintiff fields populated correctly.

---

## Step 7: Verify Building Issues - Category Toggles

**This is the most critical part of testing.** You need to verify ALL 30 categories loaded correctly.

### 7.1 Scroll to Building Issues Section

Find the section with building issue categories (might be labeled "Discovery" or "Issues").

**Expected Layout:**
- Categories organized into sections (Vermin, Insects, HVAC, etc.)
- Each category has a toggle/checkbox
- Expanding a category shows individual checkboxes

### 7.2 Verify Category Master Toggles (21 Categories)

Check that these category MASTER checkboxes are **CHECKED** (enabled):

1. [ ] **Vermin Issue** - Toggle is ON
2. [ ] **Insect Issues** - Toggle is ON
3. [ ] **HVAC Issues** - Toggle is ON
4. [ ] **Electrical Issues** - Toggle is ON
5. [ ] **Fire Hazard Issues** - Toggle is ON
6. [ ] **Government Entity Contacted** - Toggle is ON
7. [ ] **Appliances Issues** - Toggle is ON
8. [ ] **Plumbing Issues** - Toggle is ON
9. [ ] **Cabinet Issues** - Toggle is ON
10. [ ] **Flooring Issues** - Toggle is ON
11. [ ] **Windows Issues** - Toggle is ON
12. [ ] **Door Issues** - Toggle is ON
13. [ ] **Structure Issues** - Toggle is ON
14. [ ] **Common Areas Issues** - Toggle is ON
15. [ ] **Trash Problems** - Toggle is ON
16. [ ] **Nuisance Issues** - Toggle is ON
17. [ ] **Health Hazard Issues** - Toggle is ON
18. [ ] **Harassment Issues** - Toggle is ON
19. [ ] **Notices** - Toggle is ON
20. [ ] **Utility Interruptions** - Toggle is ON
21. [ ] **Safety Issues** - Toggle is ON

**User Experience Check:**
- All toggles visually indicate "ON" state (checkmark, blue color, etc.)
- Easy to distinguish checked vs unchecked
- Categories are organized and labeled clearly

**✅ Checkpoint:** All 21 category toggles are ON.

---

## Step 8: Verify Individual Checkboxes - ALL 158 Boxes

Now expand EACH category and verify the individual checkboxes are checked.

### Category 1: Vermin Issue (6 checkboxes)

1. Expand "Vermin Issue" section
2. Verify ALL boxes are CHECKED:
   - [ ] Rats/Mice
   - [ ] Bats
   - [ ] Pigeons
   - [ ] Skunks
   - [ ] Raccoons
   - [ ] Opossums

**✅ Verification:** 6/6 vermin checkboxes checked.

---

### Category 2: Insect Issues (10 checkboxes)

1. Expand "Insect Issues" section
2. Verify ALL boxes are CHECKED:
   - [ ] Ants
   - [ ] Roaches
   - [ ] Flies
   - [ ] Bedbugs
   - [ ] Wasps
   - [ ] Hornets
   - [ ] Spiders
   - [ ] Termites
   - [ ] Mosquitos
   - [ ] Bees

**✅ Verification:** 10/10 insect checkboxes checked.

---

### Category 3: HVAC Issues (3 checkboxes)

1. Expand "HVAC Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Air conditioner
   - [ ] Heater
   - [ ] Ventilation

**✅ Verification:** 3/3 HVAC checkboxes checked.

---

### Category 4: Electrical Issues (7 checkboxes)

1. Expand "Electrical Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Outlets
   - [ ] Panel
   - [ ] Wall switches
   - [ ] Exterior lighting
   - [ ] Interior lighting
   - [ ] Light fixtures
   - [ ] Fans

**✅ Verification:** 7/7 electrical checkboxes checked.

---

### Category 5: Fire Hazard (5 checkboxes)

1. Expand "Fire Hazard"
2. Verify ALL boxes CHECKED:
   - [ ] Smoke alarms
   - [ ] Fire extinguisher
   - [ ] Non-compliant electricity
   - [ ] Non-GFI outlets near water
   - [ ] Carbon monoxide detectors

**✅ Verification:** 5/5 fire hazard checkboxes checked.

---

### Category 6: Government Contact (7 checkboxes)

1. Expand "Government Entity Contacted"
2. Verify ALL boxes CHECKED:
   - [ ] Health department
   - [ ] Housing authority
   - [ ] Code enforcement
   - [ ] Fire department
   - [ ] Police department
   - [ ] Department of environmental health
   - [ ] Department of health services

**✅ Verification:** 7/7 government checkboxes checked.

---

### Category 7: Appliances (7 checkboxes)

1. Expand "Appliances Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Stove
   - [ ] Dishwasher
   - [ ] Washer/dryer
   - [ ] Oven
   - [ ] Microwave
   - [ ] Garbage disposal
   - [ ] Refrigerator

**✅ Verification:** 7/7 appliance checkboxes checked.

---

### Category 8: Plumbing (15 checkboxes) ⭐ LARGEST CATEGORY

1. Expand "Plumbing Issues"
2. Verify ALL 15 boxes CHECKED:
   - [ ] Toilet
   - [ ] Insufficient water pressure
   - [ ] Clogged bath
   - [ ] Shower
   - [ ] No hot water
   - [ ] Clogged sinks
   - [ ] Bath
   - [ ] No cold water
   - [ ] Clogged shower
   - [ ] Fixtures
   - [ ] Sewage coming out
   - [ ] No Clean Water Supply
   - [ ] Leaks
   - [ ] Clogged toilets
   - [ ] Unsanitary water

**✅ Verification:** 15/15 plumbing checkboxes checked.

---

### Category 9: Cabinets (3 checkboxes)

1. Expand "Cabinet Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Broken
   - [ ] Hinges
   - [ ] Alignment

**✅ Verification:** 3/3 cabinet checkboxes checked.

---

### Category 10: Flooring (4 checkboxes)

1. Expand "Flooring Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Uneven
   - [ ] Carpet
   - [ ] Nails sticking out
   - [ ] Tiles

**✅ Verification:** 4/4 flooring checkboxes checked.

---

### Category 11: Windows (6 checkboxes)

1. Expand "Windows Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Broken
   - [ ] Screens
   - [ ] Leaks
   - [ ] Do not lock
   - [ ] Missing windows
   - [ ] Broken or missing screens

**✅ Verification:** 6/6 window checkboxes checked.

---

### Category 12: Doors (8 checkboxes)

1. Expand "Door Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Broken
   - [ ] Knobs
   - [ ] Locks
   - [ ] Broken hinges
   - [ ] Sliding glass doors
   - [ ] Ineffective waterproofing
   - [ ] Water intrusion and/or insects
   - [ ] Do not close properly

**✅ Verification:** 8/8 door checkboxes checked.

---

### Category 13: Structural (15 checkboxes) ⭐ LARGEST CATEGORY

1. Expand "Structure Issues"
2. Verify ALL 15 boxes CHECKED:
   - [ ] Bumps in ceiling
   - [ ] Hole in ceiling
   - [ ] Water stains on ceiling
   - [ ] Water stains on wall
   - [ ] Hole in wall
   - [ ] Paint
   - [ ] Exterior deck/porch
   - [ ] Waterproof toilet
   - [ ] Waterproof tub
   - [ ] Staircase
   - [ ] Basement flood
   - [ ] Leaks in garage
   - [ ] Soft spots due to leaks
   - [ ] Ineffective waterproofing of tubs or toilet
   - [ ] Ineffective weatherproofing of windows/doors

**✅ Verification:** 15/15 structural checkboxes checked.

---

### Category 14: Common Areas (16 checkboxes) ⭐ LARGEST CATEGORY

1. Expand "Common Areas Issues"
2. Verify ALL 16 boxes CHECKED:
   - [ ] Mailbox broken
   - [ ] Parking area issues
   - [ ] Damage to cars
   - [ ] Flooding
   - [ ] Entrances blocked
   - [ ] Swimming pool
   - [ ] Jacuzzi
   - [ ] Laundry room
   - [ ] Recreation room
   - [ ] Gym
   - [ ] Elevator
   - [ ] Filth/Rubbish/Garbage
   - [ ] Vermin
   - [ ] Insects
   - [ ] Broken gate
   - [ ] Blocked areas/doors

**✅ Verification:** 16/16 common area checkboxes checked.

---

### Category 15: Trash (2 checkboxes)

1. Expand "Trash Problems"
2. Verify ALL boxes CHECKED:
   - [ ] Inadequate number of receptacles
   - [ ] Improper servicing/emptying

**✅ Verification:** 2/2 trash checkboxes checked.

---

### Category 16: Nuisance (4 checkboxes)

1. Expand "Nuisance Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Drugs
   - [ ] Smoking
   - [ ] Noisy neighbors
   - [ ] Gangs

**✅ Verification:** 4/4 nuisance checkboxes checked.

---

### Category 17: Health Hazard (8 checkboxes)

1. Expand "Health Hazard Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Mold
   - [ ] Mildew
   - [ ] Mushrooms
   - [ ] Raw sewage on exterior
   - [ ] Noxious fumes
   - [ ] Chemical/paint contamination
   - [ ] Toxic water pollution
   - [ ] Offensive odors

**✅ Verification:** 8/8 health hazard checkboxes checked.

---

### Category 18: Harassment (15 checkboxes) ⭐ LARGEST CATEGORY

1. Expand "Harassment Issues"
2. Verify ALL 15 boxes CHECKED:
   - [ ] Unlawful detainer
   - [ ] Eviction threats
   - [ ] By defendant
   - [ ] By maintenance man/workers
   - [ ] By manager/building staff
   - [ ] By owner
   - [ ] Other tenants
   - [ ] Illegitimate notices
   - [ ] Refusal to make timely repairs
   - [ ] Written threats
   - [ ] Aggressive/inappropriate language
   - [ ] Physical threats or touching
   - [ ] Notices singling out one tenant
   - [ ] Duplicative notices
   - [ ] Untimely response from landlord

**✅ Verification:** 15/15 harassment checkboxes checked.

---

### Category 19: Notices (6 checkboxes)

1. Expand "Notices" section
2. Verify ALL boxes CHECKED:
   - [ ] 3-day
   - [ ] 24-hour
   - [ ] 30-day
   - [ ] 60-day
   - [ ] To quit
   - [ ] Perform or quit

**✅ Verification:** 6/6 notice checkboxes checked.

---

### Category 20: Utility (5 checkboxes)

1. Expand "Utility Interruptions"
2. Verify ALL boxes CHECKED:
   - [ ] Gas leak
   - [ ] Water shutoffs
   - [ ] Electricity shutoffs
   - [ ] Heat shutoff
   - [ ] Gas shutoff

**✅ Verification:** 5/5 utility checkboxes checked.

---

### Category 21: Safety (6 checkboxes)

1. Expand "Safety Issues"
2. Verify ALL boxes CHECKED:
   - [ ] Broken/inoperable security gate
   - [ ] Broken doors
   - [ ] Unauthorized entries
   - [ ] Broken buzzer to get in
   - [ ] Security cameras
   - [ ] Inoperable locks

**✅ Verification:** 6/6 safety checkboxes checked.

---

### Categories 22-30: Simple Toggles (No Individual Checkboxes)

Verify these 9 simple toggle categories are ON:

22. [ ] **Injury Issues** - Toggle is ON
23. [ ] **Nonresponsive Landlord** - Toggle is ON
24. [ ] **Unauthorized Entries** - Toggle is ON
25. [ ] **Stolen Items** - Toggle is ON
26. [ ] **Damaged Items** - Toggle is ON
27. [ ] **Age Discrimination** - Toggle is ON
28. [ ] **Racial Discrimination** - Toggle is ON
29. [ ] **Disability Discrimination** - Toggle is ON
30. [ ] **Security Deposit Issues** - Toggle is ON

**✅ Verification:** All 9 simple toggles are ON.

---

## Step 9: Manual Count Verification

### 9.1 Count Your Checked Boxes

Total checkboxes you should have verified:

| Category | Count |
|----------|-------|
| Vermin | 6 |
| Insects | 10 |
| HVAC | 3 |
| Electrical | 7 |
| Fire Hazard | 5 |
| Government | 7 |
| Appliances | 7 |
| Plumbing | 15 |
| Cabinets | 3 |
| Flooring | 4 |
| Windows | 6 |
| Doors | 8 |
| Structural | 15 |
| Common Areas | 16 |
| Trash | 2 |
| Nuisance | 4 |
| Health Hazard | 8 |
| Harassment | 15 |
| Notices | 6 |
| Utility | 5 |
| Safety | 6 |
| **TOTAL** | **158** |
| Simple Toggles | 9 |
| **GRAND TOTAL** | **30 categories** |

**✅ Final Verification:** 158 checkboxes + 9 toggles = 30 categories fully tested.

---

## Step 10: Test Attorney Workflow

### 10.1 Verify Form is Editable

Try editing a populated field:

1. Click on "Plaintiff 1 - First Name" field
2. Change "John" to "Jonathan"
3. Tab to next field

**Expected:**
- Field accepts changes
- No errors appear
- Attorney can modify loaded data

**User Experience Check:** Attorney can edit any field after loading.

### 10.2 Try Unchecking a Checkbox

1. Find "Vermin Issue" → "Rats/Mice" checkbox
2. Uncheck it
3. Re-check it

**Expected:**
- Checkbox responds to clicks
- Visual state updates immediately
- No errors in console

**✅ Verification:** Loaded form is fully editable.

---

## Step 11: Compare Against Expected Data

### 11.1 Open Saved JSON File

```bash
cat /tmp/intake-docgen-format.json | jq . | head -100
```

### 11.2 Spot Check 10 Random Fields

Compare JSON values to form fields:

| Field in JSON | Field in Form | Match? |
|---------------|---------------|--------|
| `property-address` | Property Address field | [ ] Yes |
| `plaintiff-1-first-name` | Plaintiff 1 First Name | [ ] Yes |
| `plaintiff-1-phone` | Plaintiff 1 Phone | [ ] Yes |
| `vermin-toggle-1` | Vermin master toggle | [ ] Yes |
| `vermin-RatsMice-1` | Rats/Mice checkbox | [ ] Yes |
| `plumbing-Toilet-1` | Toilet checkbox | [ ] Yes |
| `structure-Holeinceiling-1` | Hole in ceiling | [ ] Yes |
| `harassment-Evictionthreats-1` | Eviction threats | [ ] Yes |
| `city` | City field | [ ] Yes |
| `zip-code` | ZIP Code field | [ ] Yes |

**✅ Verification:** JSON data matches form fields.

---

## Step 12: User Experience Final Check

### 12.1 Overall Flow Rating

Rate the user experience (1-5 stars):

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Modal Loading Speed** | ⭐⭐⭐⭐⭐ | Fast / Slow / Medium |
| **Finding Intake** | ⭐⭐⭐⭐⭐ | Easy / Difficult |
| **Form Population** | ⭐⭐⭐⭐⭐ | Instant / Laggy |
| **Visual Clarity** | ⭐⭐⭐⭐⭐ | Clear / Confusing |
| **Editability** | ⭐⭐⭐⭐⭐ | Smooth / Buggy |
| **Overall** | ⭐⭐⭐⭐⭐ | Would use / Wouldn't use |

### 12.2 Check Browser Console

Open Console tab:

**Expected:** No errors (console is clean).

**If errors exist:** Document them for bug report.

---

## Step 13: Test Summary Checklist

Before proceeding to TEST_05, verify:

### Modal Functionality
- [ ] "Load from Intake" button works
- [ ] Modal opens smoothly
- [ ] Intake list loads and displays
- [ ] Search/filter works (if tested)
- [ ] Select button works
- [ ] Modal closes after selection
- [ ] Success message appears

### Field Population
- [ ] All 6 property fields populated
- [ ] All 6 plaintiff fields populated
- [ ] Defendant fields populated (if applicable)
- [ ] Lease information populated

### Building Issues Population
- [ ] All 21 category master toggles ON
- [ ] All 158 individual checkboxes CHECKED
- [ ] All 9 simple toggles ON
- [ ] Categories organized logically
- [ ] Visual state clearly shows "checked"

### Data Consistency
- [ ] JSON data matches form fields
- [ ] No missing checkboxes
- [ ] No extra checkboxes (false positives)
- [ ] Field values exact match (no truncation)

### User Experience
- [ ] Loading is fast (< 2 seconds)
- [ ] No errors in console
- [ ] Form is editable after load
- [ ] Visual design is clear
- [ ] Attorney would find this useful

---

## Step 14: Record Test Results

**Test Date:** _____________________

**Intake ID Used:** _____________________

**Fields Populated:** ✅ All / ⚠️ Some Missing / ❌ Failed

**Checkboxes Loaded:** _____ / 158

**Simple Toggles:** _____ / 9

**Category Toggles:** _____ / 21

**Overall Test Result:** ✅ PASS / ❌ FAIL

**Time Saved vs Manual Entry:** _____ minutes

**User Experience Rating:** ⭐⭐⭐⭐⭐

**Issues Found:**
_______________________________________
_______________________________________
_______________________________________

**Missing/Incorrect Mappings:**
_______________________________________
_______________________________________

---

## Troubleshooting

### Issue: "Load from Intake" button doesn't exist

**Solution:**
1. Check URL: Should be `http://localhost:3000` (doc gen form)
2. Hard refresh: Cmd+Shift+R
3. Check if modal script loaded: DevTools → Network → search "intake-modal.js"
4. Verify js/intake-modal.js file exists

### Issue: Modal shows "No intakes found"

**Solution:**
```bash
# Verify intake exists in database
psql legal_forms_db_dev -c "SELECT id, intake_number, first_name FROM client_intakes ORDER BY created_at DESC LIMIT 5;"

# If empty, return to TEST_02 and submit intake again
```

### Issue: Modal opens but doesn't load intakes

**Solution:**
1. Check browser console for errors
2. Check Network tab for failed requests to `/api/intakes-jsonb`
3. Verify server is running
4. Check server logs for API errors

### Issue: Some checkboxes don't populate

**Solution:**
1. Check `/tmp/intake-docgen-format.json` - are those checkboxes present?
2. If present in JSON but not in form: MAPPING BUG
3. Document which checkboxes failed to map
4. Compare checkbox IDs in form HTML to JSON keys
5. File bug report with specific field names

### Issue: Checkbox counts don't match (e.g., only 150/158)

**Solution:**
- This indicates missing field mappings
- Use TEST_05 checklist to identify exactly which checkboxes are missing
- Check routes/intakes-jsonb.js for incomplete mappings
- Common issue: New checkboxes added to intake but not mapped to doc-gen format

### Issue: Fields populate but values are wrong/truncated

**Solution:**
1. Compare form values to `/tmp/intake-docgen-format.json`
2. Check if transformation is corrupting data
3. Verify no character limit issues on form fields
4. Check for encoding issues (special characters)

---

## Next Steps

**✅ Load Into Doc Gen Complete!**

If all checkboxes populated correctly:
- **SUCCESS** - The intake-to-docgen mapper is working perfectly
- All 158 checkboxes mapped correctly
- All 9 simple toggles activated
- All form fields populated accurately

➡️ Proceed to **TEST_05_FIELD_CONSISTENCY_CHECKLIST.md** for a comprehensive field-by-field verification matrix to catch any edge cases.

---

**Created:** 2025-12-16
**Focus:** Complete checkbox verification from user perspective
**Time to Complete:** 30-40 minutes
**Critical Test:** This verifies the entire intake → doc gen pipeline works end-to-end
