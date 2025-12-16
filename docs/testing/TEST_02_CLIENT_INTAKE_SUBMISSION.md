# TEST 02: Client Intake Form Submission - Complete Test

**Purpose:** Submit a comprehensive client intake form testing **EVERY single checkbox** across all 30 building issue categories.

**Time Required:** 30-45 minutes

**Prerequisites:**
- TEST_01 completed (environment setup)
- Server running at `http://localhost:3000`
- Browser open with DevTools

**What We're Testing:**
- All form fields populate correctly
- All 30 building issue categories with 158 individual checkboxes
- Form validation works
- Form submission succeeds
- Data saves to database

---

## Step 1: Navigate to Client Intake Form

### 1.1 Open the Form

```
http://localhost:3000/client-intake
```

**Expected:**
- Form loads with "Client Intake Form" heading
- Progress bar shows "Step 1 of 3 (33%)"
- Three sections visible in sidebar:
  1. Personal & Contact Information
  2. Property & Lease Information
  3. Building & Housing Issues

### 1.2 Verify Console is Clean

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for errors

**Expected:** No errors (console is clean)

---

## Step 2: Fill Section 1 - Personal & Contact Information

### 2.1 Personal Information

Fill out these fields:

| Field | Test Data |
|-------|-----------|
| **First Name** | John |
| **Last Name** | Doe |
| **Date of Birth** | 01/15/1985 |
| **Email Address** | john.doe.test@example.com |
| **Phone** | (555) 123-4567 |

### 2.2 Verify Field Validation

Try submitting with missing required field:
1. Clear "Email Address" field
2. Click "Next" button

**Expected:**
- Red error message appears: "Email is required"
- Form does NOT advance to next section
- Email field is highlighted

3. Fill email back in: `john.doe.test@example.com`
4. Click "Next"

**Expected:**
- Form advances to Section 2
- Progress bar updates to "Step 2 of 3 (67%)"

---

## Step 3: Fill Section 2 - Property & Lease Information

### 3.1 Property Address

| Field | Test Data |
|-------|-----------|
| **Street Address** | 123 Main Street |
| **Unit Number** | Apt 4B |
| **City** | Los Angeles |
| **State** | California |
| **ZIP Code** | 90001 |
| **County** | Los Angeles |

### 3.2 Property Details

| Field | Test Data |
|-------|-----------|
| **# of Units in Building** | 24 |
| **Current Rent** | $1,800 |

### 3.3 Lease & Legal Information

| Field | Test Data | Type |
|-------|-----------|------|
| **Have you signed a retainer with another attorney?** | No | Radio |
| **Are you the head of household?** | Yes | Radio |

### 3.4 Advance to Section 3

Click "Next" button

**Expected:**
- Form advances to Section 3
- Progress bar shows "Step 3 of 3 (100%)"
- Section heading: "Building & Housing Issues"
- 30 category cards visible (we'll test each one)

---

## Step 4: Test ALL Building Issue Categories (30 Categories, 158 Checkboxes)

**Instructions:** For each category below, check **ALL checkboxes** to ensure complete coverage.

---

### Category 1: Vermin/Pests (6 checkboxes)

1. Click **"Vermin/Pests"** toggle to expand section
2. Check ALL boxes:
   - [ ] Rats/Mice
   - [ ] Skunks
   - [ ] Bats
   - [ ] Raccoons
   - [ ] Pigeons
   - [ ] Opossums

**Expected:** All 6 checkboxes check successfully. Category toggle shows checkmark.

---

### Category 2: Insect Infestation (10 checkboxes)

1. Click **"Insect Infestation"** toggle
2. Check ALL boxes:
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

**Expected:** All 10 checkboxes check successfully.

---

### Category 3: HVAC Issues (3 checkboxes)

1. Click **"HVAC Issues"** toggle
2. Check ALL boxes:
   - [ ] Air conditioner
   - [ ] Heater
   - [ ] Ventilation

**Expected:** All 3 checkboxes check successfully.

---

### Category 4: Electrical Problems (7 checkboxes)

1. Click **"Electrical Problems"** toggle
2. Check ALL boxes:
   - [ ] Outlets
   - [ ] Panel
   - [ ] Wall switches
   - [ ] Exterior lighting
   - [ ] Interior lighting
   - [ ] Light fixtures
   - [ ] Fans

**Expected:** All 7 checkboxes check successfully.

---

### Category 5: Fire Hazards (5 checkboxes)

1. Click **"Fire Hazards"** toggle
2. Check ALL boxes:
   - [ ] Smoke alarms
   - [ ] Fire extinguisher
   - [ ] Non-compliant electricity
   - [ ] Non-GFI outlets near water
   - [ ] Carbon monoxide detectors

**Expected:** All 5 checkboxes check successfully.

---

### Category 6: Government Contact (7 checkboxes)

1. Click **"Government Contact"** toggle
2. Check ALL boxes:
   - [ ] Health department
   - [ ] Housing authority
   - [ ] Code enforcement
   - [ ] Fire department
   - [ ] Police department
   - [ ] Department of environmental health
   - [ ] Department of health services

**Expected:** All 7 checkboxes check successfully.

---

### Category 7: Appliance Issues (7 checkboxes)

1. Click **"Appliance Issues"** toggle
2. Check ALL boxes:
   - [ ] Stove
   - [ ] Dishwasher
   - [ ] Washer/dryer
   - [ ] Oven
   - [ ] Microwave
   - [ ] Garbage disposal
   - [ ] Refrigerator

**Expected:** All 7 checkboxes check successfully.

---

### Category 8: Plumbing Problems (15 checkboxes)

1. Click **"Plumbing Problems"** toggle
2. Check ALL boxes:
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

**Expected:** All 15 checkboxes check successfully.

---

### Category 9: Cabinet Issues (3 checkboxes)

1. Click **"Cabinet Issues"** toggle
2. Check ALL boxes:
   - [ ] Broken
   - [ ] Hinges
   - [ ] Alignment

**Expected:** All 3 checkboxes check successfully.

---

### Category 10: Flooring Problems (4 checkboxes)

1. Click **"Flooring Problems"** toggle
2. Check ALL boxes:
   - [ ] Uneven
   - [ ] Carpet
   - [ ] Nails sticking out
   - [ ] Tiles

**Expected:** All 4 checkboxes check successfully.

---

### Category 11: Window Issues (6 checkboxes)

1. Click **"Window Issues"** toggle
2. Check ALL boxes:
   - [ ] Broken
   - [ ] Screens
   - [ ] Leaks
   - [ ] Do not lock
   - [ ] Missing windows
   - [ ] Broken or missing screens

**Expected:** All 6 checkboxes check successfully.

---

### Category 12: Door Problems (8 checkboxes)

1. Click **"Door Problems"** toggle
2. Check ALL boxes:
   - [ ] Broken
   - [ ] Knobs
   - [ ] Locks
   - [ ] Broken hinges
   - [ ] Sliding glass doors
   - [ ] Ineffective waterproofing
   - [ ] Water intrusion and/or insects
   - [ ] Do not close properly

**Expected:** All 8 checkboxes check successfully.

---

### Category 13: Structural Issues (15 checkboxes)

1. Click **"Structural Issues"** toggle
2. Check ALL boxes:
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
   - [ ] Ineffective waterproofing of the tubs or toilet
   - [ ] Ineffective Weatherproofing of any windows doors

**Expected:** All 15 checkboxes check successfully.

---

### Category 14: Common Area Problems (16 checkboxes)

1. Click **"Common Area Problems"** toggle
2. Check ALL boxes:
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

**Expected:** All 16 checkboxes check successfully.

---

### Category 15: Trash Problems (2 checkboxes)

1. Click **"Trash Problems"** toggle
2. Check ALL boxes:
   - [ ] Inadequate number of receptacles
   - [ ] Improper servicing/emptying

**Expected:** All 2 checkboxes check successfully.

---

### Category 16: Nuisance Issues (4 checkboxes)

1. Click **"Nuisance Issues"** toggle
2. Check ALL boxes:
   - [ ] Drugs
   - [ ] Smoking
   - [ ] Noisy neighbors
   - [ ] Gangs

**Expected:** All 4 checkboxes check successfully.

---

### Category 17: Health Hazards (8 checkboxes)

1. Click **"Health Hazards"** toggle
2. Check ALL boxes:
   - [ ] Mold
   - [ ] Mildew
   - [ ] Mushrooms
   - [ ] Raw sewage on exterior
   - [ ] Noxious fumes
   - [ ] Chemical/paint contamination
   - [ ] Toxic water pollution
   - [ ] Offensive odors

**Expected:** All 8 checkboxes check successfully.

---

### Category 18: Harassment (15 checkboxes)

1. Click **"Harassment"** toggle
2. Check ALL boxes:
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
   - [ ] Notices singling out one tenant but not uniformly given to all tenants
   - [ ] Duplicative notices
   - [ ] Untimely response from landlord

**Expected:** All 15 checkboxes check successfully.

---

### Category 19: Notices Received (6 checkboxes)

1. Click **"Notices Received"** toggle
2. Check ALL boxes:
   - [ ] 3-day
   - [ ] 24-hour
   - [ ] 30-day
   - [ ] 60-day
   - [ ] To quit
   - [ ] Perform or quit

**Expected:** All 6 checkboxes check successfully.

---

### Category 20: Utility Interruptions (5 checkboxes)

1. Click **"Utility Interruptions"** toggle
2. Check ALL boxes:
   - [ ] Gas leak
   - [ ] Water shutoffs
   - [ ] Electricity shutoffs
   - [ ] Heat shutoff
   - [ ] Gas shutoff

**Expected:** All 5 checkboxes check successfully.

---

### Category 21: Safety Issues (6 checkboxes)

1. Click **"Safety Issues"** toggle
2. Check ALL boxes:
   - [ ] Broken/inoperable security gate
   - [ ] Broken doors
   - [ ] Unauthorized entries
   - [ ] Broken buzzer to get in
   - [ ] Security cameras
   - [ ] Inoperable locks

**Expected:** All 6 checkboxes check successfully.

---

### Categories 22-30: Simple Toggles (No Individual Checkboxes)

The remaining 9 categories are **simple toggle categories** (no individual checkboxes to select). Just toggle them ON:

22. **Injury Issues** - Toggle ON
23. **Nonresponsive Landlord** - Toggle ON
24. **Unauthorized Entries** - Toggle ON
25. **Stolen Items** - Toggle ON
26. **Damaged Items** - Toggle ON
27. **Age Discrimination** - Toggle ON
28. **Racial Discrimination** - Toggle ON
29. **Disability Discrimination** - Toggle ON
30. **Security Deposit Issues** - Toggle ON

**Expected:** All 9 toggles turn ON successfully.

---

## Step 5: Verify Checkbox Summary

### 5.1 Count Selected Categories

Scroll through the form and count how many categories have checkmarks/are active.

**Expected:** All 30 categories should show as active/selected.

### 5.2 Verify Console for Errors

Check browser console:

**Expected:** No JavaScript errors (console is clean)

---

## Step 6: Submit the Form

### 6.1 Click Submit Button

1. Scroll to bottom of Section 3
2. Click **"Submit Intake"** button

**Expected:**
- Loading spinner appears briefly
- Form submits successfully
- You see success message: "Intake form submitted successfully!"

### 6.2 Note the Intake Number

After successful submission, you should see:

```
✅ Intake Submitted Successfully!
Intake Number: INT-20251216-XXXX
```

**WRITE DOWN THIS INTAKE NUMBER - YOU'LL NEED IT FOR NEXT TESTS**

Example: `INT-20251216-1234`

---

## Step 7: Verify Network Request

### 7.1 Check Network Tab

1. Open DevTools Network tab
2. Find the POST request to `/api/intakes` or `/api/intakes-jsonb`
3. Click on it
4. Check Response tab

**Expected Response:**
```json
{
  "success": true,
  "intakeId": "some-uuid",
  "intakeNumber": "INT-20251216-XXXX",
  "message": "Intake submitted successfully"
}
```

**Status Code:** 200 OK

### 7.2 Verify Request Payload

1. Click on request in Network tab
2. Go to "Payload" or "Request" tab
3. Verify data structure

**Expected:**
- All form fields present
- `buildingIssues` object contains all 30 categories
- Each checked category has `true` value
- Categories with individual checkboxes have specific options selected

---

## Step 8: Visual User Experience Verification

### 8.1 Form Flow Smoothness

Rate the following (subjective but important):

- [ ] **Progress bar updated correctly** at each step
- [ ] **No page flickering** or layout shifts
- [ ] **Checkboxes respond immediately** to clicks
- [ ] **Category toggles expand/collapse smoothly**
- [ ] **Submit button showed loading state** during submission
- [ ] **Success message was clear and visible**

### 8.2 Mobile Responsiveness (Optional but Recommended)

If testing on desktop, open DevTools and toggle device emulation:

1. Open DevTools (F12)
2. Click device icon (Cmd+Shift+M)
3. Select "iPhone 12 Pro" or "iPad"
4. Navigate to form: `http://localhost:3000/client-intake`

**Expected:**
- Form layout adapts to smaller screen
- All fields accessible
- Checkboxes large enough to click
- No horizontal scrolling

---

## Step 9: Test Summary Checklist

Before proceeding to next test, verify:

### Form Fields
- [ ] All 8 personal/contact fields filled correctly
- [ ] All 8 property fields filled correctly
- [ ] All 2 legal fields selected

### Building Issues (158 Total Checkboxes)
- [ ] Category 1: Vermin (6/6 checkboxes)
- [ ] Category 2: Insects (10/10 checkboxes)
- [ ] Category 3: HVAC (3/3 checkboxes)
- [ ] Category 4: Electrical (7/7 checkboxes)
- [ ] Category 5: Fire Hazards (5/5 checkboxes)
- [ ] Category 6: Government (7/7 checkboxes)
- [ ] Category 7: Appliances (7/7 checkboxes)
- [ ] Category 8: Plumbing (15/15 checkboxes)
- [ ] Category 9: Cabinets (3/3 checkboxes)
- [ ] Category 10: Flooring (4/4 checkboxes)
- [ ] Category 11: Windows (6/6 checkboxes)
- [ ] Category 12: Doors (8/8 checkboxes)
- [ ] Category 13: Structural (15/15 checkboxes)
- [ ] Category 14: Common Areas (16/16 checkboxes)
- [ ] Category 15: Trash (2/2 checkboxes)
- [ ] Category 16: Nuisance (4/4 checkboxes)
- [ ] Category 17: Health Hazards (8/8 checkboxes)
- [ ] Category 18: Harassment (15/15 checkboxes)
- [ ] Category 19: Notices (6/6 checkboxes)
- [ ] Category 20: Utility (5/5 checkboxes)
- [ ] Category 21: Safety (6/6 checkboxes)
- [ ] Categories 22-30: Simple toggles (9/9 categories)

**Total: 158 checkboxes + 9 simple toggles = 30 categories tested ✅**

### Form Submission
- [ ] Form submitted successfully (200 OK)
- [ ] Intake number received (noted down)
- [ ] Success message displayed
- [ ] No console errors
- [ ] Network request shows correct data

---

## Step 10: Record Test Results

**Intake Number:** _____________________ (write it here)

**Test Date:** _____________________

**Checkboxes Tested:** 158 / 158

**Simple Toggles Tested:** 9 / 9

**Total Categories Tested:** 30 / 30

**Test Result:** ✅ PASS / ❌ FAIL

**Notes/Issues:**
_______________________________________
_______________________________________
_______________________________________

---

## Troubleshooting

### Issue: Checkboxes don't check when clicked

**Solution:**
1. Check browser console for JavaScript errors
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Verify shared components loaded: Check Network tab for `/shared/` resources

### Issue: Form won't submit

**Solution:**
1. Check for validation errors (look for red text)
2. Ensure all required fields filled
3. Check console for errors
4. Verify server is running: `curl http://localhost:3000/health`

### Issue: Categories don't expand when toggled

**Solution:**
1. Check console for React errors
2. Verify issue-categories-config.ts loaded
3. Regenerate config: `npm run generate:issue-config`
4. Restart server and hard refresh browser

### Issue: Success message doesn't appear after submit

**Solution:**
1. Check Network tab - did request return 200?
2. Check Response tab - is there an error message?
3. Check server terminal - are there any errors?
4. Verify database is running: `pg_isready`

---

## Next Steps

**✅ Intake Submission Complete!**

You now have a comprehensive test intake in the database with:
- Full client information
- Complete property details
- ALL 158 checkboxes + 9 simple toggles tested

➡️ Proceed to **TEST_03_INTAKE_DATA_VERIFICATION.md** to verify the data saved correctly in the database.

---

**Created:** 2025-12-16
**Test Coverage:** 100% of checkboxes (158 + 9 toggles = 30 categories)
**Time to Complete:** 30-45 minutes
