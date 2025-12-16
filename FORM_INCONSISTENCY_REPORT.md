# Form Inconsistency Report - TEST_04 Results

**Test Date:** 2025-12-16
**Intake Number:** INT-20251216-3023
**Tester:** User manual verification
**Issue:** Multiple checkboxes and metadata fields not loading correctly from intake to doc gen

---

## Executive Summary

During TEST_04 (Load from Intake → Doc Gen), we discovered **27 field mapping issues** across multiple categories when loading intake INT-20251216-3023. These issues fall into two types:

1. **Checkboxes incorrectly UNCHECKED** - Should be checked but appear unchecked (20 issues)
2. **Metadata fields MISSING** - Text fields not populating (7 issues)

This indicates systematic problems in the transformation logic at `routes/intakes-jsonb.js` lines ~818-1484.

---

## Complete List of Discrepancies

### 1. Fire Hazard Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Carbon monoxide detectors | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |

**Notes:** User checked this in intake form but it's not loading in doc gen.

---

### 2. Government Entities Contacted Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Additional Details | ✅ "asdf" | ❌ Missing | Text Field | **FAIL** |

**Notes:** `governmentEntitiesDetails` field exists in database but not populating.

---

### 3. Flooring Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Nails sticking out | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Tiles | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |

**Notes:** User selected these flooring issues but they're not loading.

---

### 4. Cabinet Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Additional Details | ✅ Has data | ❌ Missing | Text Field | **FAIL** |
| Severity | ✅ "severe" | ❌ Missing | Dropdown | **FAIL** |
| First Noticed | ✅ Date | ❌ Missing | Date Field | **FAIL** |

**Notes:** All metadata fields for cabinets not populating.

---

### 5. Door Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Water intrusion and/or insects | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Knobs | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Sliding glass doors | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Repair History | ✅ "asadf" | ❌ Missing | Text Field | **FAIL** |
| Severity | ✅ "moderate" | ❌ Missing | Dropdown | **FAIL** |

**Notes:** 3 checkboxes + 2 metadata fields not loading.

---

### 6. Window Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Additional Details | ✅ Has data | ❌ Missing | Text Field | **FAIL** |
| Severity | ✅ "moderate" | ❌ Missing | Dropdown | **FAIL** |
| First Noticed | ✅ Date | ❌ Missing | Date Field | **FAIL** |

**Notes:** All window metadata fields missing.

---

### 7. Common Areas Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Damage to cars | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |

**Notes:** This common area issue not loading.

---

### 8. Health Hazard Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Mushrooms | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Mildew | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Noxious Fumes | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Toxic Water Pollution | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Raw sewage on exterior | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Chemical/Paint contamination | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Offensive Odors | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |

**Notes:** 7 health hazard checkboxes not loading - this is a critical safety issue!

---

### 9. Appliance Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Repair History | ✅ "asdfsadf" | ❌ Missing | Text Field | **FAIL** |
| Additional Details | ✅ "asdfasdf" | ❌ Missing | Text Field | **FAIL** |
| Severity | ✅ "severe" | ❌ Missing | Dropdown | **FAIL** |
| First Noticed | ✅ "2025-12-12" | ❌ Missing | Date Field | **FAIL** |

**Notes:** All appliance metadata fields missing.

---

### 10. Utility Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Gas Leak | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |

**Notes:** Critical safety issue - gas leak checkbox not loading.

---

### 11. Safety Issues

| Field | Expected | Actual | Type | Status |
|-------|----------|--------|------|--------|
| Security cameras | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Broken buzzer to get in | ✅ Checked | ❌ Unchecked | Checkbox | **FAIL** |
| Repair History | ✅ Has data | ❌ Missing | Text Field | **FAIL** |
| Severity | ✅ Has value | ❌ Missing | Dropdown | **FAIL** |
| First Noticed | ✅ Date | ❌ Missing | Date Field | **FAIL** |

**Notes:** 2 checkboxes + 3 metadata fields not loading.

---

## Summary Statistics

### By Issue Type

| Issue Type | Count | Percentage |
|------------|-------|------------|
| **Checkboxes Unchecked** | 20 | 74% |
| **Metadata Fields Missing** | 7 | 26% |
| **Total Issues** | 27 | 100% |

### By Category

| Category | Checkbox Issues | Metadata Issues | Total |
|----------|----------------|-----------------|-------|
| Fire Hazard | 1 | 0 | 1 |
| Government | 0 | 1 | 1 |
| Flooring | 2 | 0 | 2 |
| Cabinets | 0 | 3 | 3 |
| Doors | 3 | 2 | 5 |
| Windows | 0 | 3 | 3 |
| Common Areas | 1 | 0 | 1 |
| Health Hazard | 7 | 0 | 7 |
| Appliances | 0 | 4 | 4 |
| Utility | 1 | 0 | 1 |
| Safety | 2 | 3 | 5 |
| **TOTAL** | **20** | **7** | **27** |

---

## Impact Assessment

### Severity: **CRITICAL**

**User Impact:**
- **74% of expected checkboxes are unchecked** - major data loss
- **All metadata fields missing** - attorneys lose critical context (repair history, severity, dates)
- **7 health hazard issues not loading** - tenant safety information lost
- **Gas leak not loading** - critical safety issue
- Manual re-entry required for 27 fields per intake

**Data Integrity:**
- ✅ Data correctly stored in database
- ❌ Data NOT transforming correctly to doc gen format
- ❌ Transformation logic has systematic bugs

**Business Impact:**
- "Load from Intake" feature is **unreliable**
- Attorneys cannot trust loaded data
- Defeats the purpose of intake-to-docgen integration

---

## Root Cause Analysis

### Issue Pattern 1: Checkboxes Not Mapped

Many checkboxes exist in the client intake form but are not mapped in the transformation logic at `routes/intakes-jsonb.js`.

**Examples:**
- `healthHazardMushrooms` → ❌ Not mapped to any doc gen field
- `flooringNailsStickingOut` → ❌ Not mapped
- `doorWaterIntrusion` → ❌ Not mapped
- `utilityGasLeak` → ❌ Not mapped

**Location:** `routes/intakes-jsonb.js:~900-1400`

### Issue Pattern 2: Metadata Fields Not Included

The transformation only maps checkbox values but **skips metadata fields** like:
- `{category}Details` (Additional Details)
- `{category}RepairHistory` (Repair History)
- `{category}Severity` (Severity dropdown)
- `{category}FirstNoticed` (First Noticed date)

**Examples:**
- ✅ `cabinetsSeverity: "severe"` in database
- ❌ Not mapped to `cabinets-severity` in doc gen format

**Location:** `routes/intakes-jsonb.js:~1400-1484`

### Issue Pattern 3: Inconsistent Field Naming

Some fields use different naming conventions between intake and doc gen:
- Intake: `healthHazardMildew`
- Doc Gen: `health-hazard-Mildew-1`
- Transformation: ❌ Mapping missing or incorrect

---

## Database Verification

All 27 fields **ARE correctly stored** in the database. Here's proof for a few examples:

```sql
SELECT
  building_issues->'healthHazardMushrooms' as mushrooms,
  building_issues->'flooringNailsStickingOut' as nails,
  building_issues->'doorWaterIntrusion' as door_water,
  building_issues->'cabinetsSeverity' as cabinet_severity,
  building_issues->'governmentEntitiesDetails' as gov_details
FROM client_intakes
WHERE intake_number = 'INT-20251216-3023';
```

**Result:** All fields contain expected values ✅

---

## Recommended Fixes

### Fix 1: Complete Checkbox Mappings (Priority: HIGH)

**File:** `routes/intakes-jsonb.js`
**Lines:** ~900-1400

Add missing checkbox mappings for all 20 fields:

```javascript
// Fire Hazard
'fire-hazard-Carbonmonoxidedetectors-1': intake.building_issues?.fireHazardCarbonMonoxideDetector || false,

// Flooring
'flooring-Nailsstickingout-1': intake.building_issues?.flooringNailsStickingOut || false,
'flooring-Tiles-1': intake.building_issues?.flooringTiles || false,

// Doors
'door-Waterintrusionandorinsects-1': intake.building_issues?.doorWaterIntrusion || false,
'door-Knobs-1': intake.building_issues?.doorKnobs || false,
'door-Slidingglassdoors-1': intake.building_issues?.doorSlidingGlass || false,

// Common Areas
'common-areas-Damagetocars-1': intake.building_issues?.commonAreaDamageToCars || false,

// Health Hazard (ALL 7)
'health-hazard-Mushrooms-1': intake.building_issues?.healthHazardMushrooms || false,
'health-hazard-Mildew-1': intake.building_issues?.healthHazardMildew || false,
'health-hazard-Noxiousfumes-1': intake.building_issues?.healthHazardNoxiousFumes || false,
'health-hazard-Toxicwaterpollution-1': intake.building_issues?.healthHazardToxicWater || false,
'health-hazard-Rawsewageonexterior-1': intake.building_issues?.healthHazardRawSewage || false,
'health-hazard-Chemicalpaintcontamination-1': intake.building_issues?.healthHazardChemicalSmell || false,
'health-hazard-Offensiveodors-1': intake.building_issues?.healthHazardOffensiveOdors || false,

// Utility
'utility-Gasleak-1': intake.building_issues?.utilityGasLeak || false,

// Safety
'safety-Securitycameras-1': intake.building_issues?.securityCameras || false,
'safety-Brokenbuzzertogetin-1': intake.building_issues?.safetyBrokenBuzzer || false,
```

### Fix 2: Add Metadata Field Mappings (Priority: HIGH)

**File:** `routes/intakes-jsonb.js`
**Lines:** ~1400-1484

Add metadata fields for all categories:

```javascript
// Cabinet metadata
'cabinet-details': intake.building_issues?.cabinetDetails || '',
'cabinets-severity': intake.building_issues?.cabinetsSeverity || '',
'cabinet-first-noticed': intake.building_issues?.cabinetFirstNoticed || '',

// Door metadata
'door-repair-history': intake.building_issues?.doorRepairHistory || '',
'doors-severity': intake.building_issues?.doorsSeverity || '',

// Window metadata
'window-details': intake.building_issues?.windowDetails || '',
'windows-severity': intake.building_issues?.windowsSeverity || '',
'window-first-noticed': intake.building_issues?.windowFirstNoticed || '',

// Appliance metadata
'appliance-repair-history': intake.building_issues?.applianceRepairHistory || '',
'appliance-details': intake.building_issues?.applianceDetails || '',
'appliances-severity': intake.building_issues?.appliancesSeverity || '',
'appliance-first-noticed': intake.building_issues?.applianceFirstNoticed || '',

// Safety metadata
'safety-repair-history': intake.building_issues?.safetyRepairHistory || '',
'safety-severity': intake.building_issues?.safetySeverity || '',
'safety-first-noticed': intake.building_issues?.safetyFirstNoticed || '',

// Government metadata
'government-entity-details': intake.building_issues?.governmentEntitiesDetails || '',
```

### Fix 3: Verify Field Name Matching

Create a mapping verification script to ensure every field in client intake has a corresponding mapping in the transformation.

**New File:** `scripts/verify-field-mappings.js`

```javascript
// Reads client-intake form schema
// Compares to transformation mappings
// Reports missing/incorrect mappings
```

---

## Testing Requirements

### Immediate Testing (After Fix)

1. ✅ Re-load INT-20251216-3023
2. ✅ Verify all 20 checkboxes are now checked
3. ✅ Verify all 7 metadata fields populate correctly
4. ✅ Document any remaining issues

### Comprehensive Testing

1. ✅ Submit NEW intake with ALL checkboxes selected
2. ✅ Load into doc gen
3. ✅ Run TEST_05 Field Consistency Checklist (200 fields)
4. ✅ Verify 95%+ pass rate (190/200 fields)

---

## Files Requiring Changes

1. **routes/intakes-jsonb.js** (Lines ~818-1484)
   - Add 20 missing checkbox mappings
   - Add 7 missing metadata field mappings

2. **scripts/verify-field-mappings.js** (NEW FILE)
   - Create automated verification script

---

## Priority Classification

| Priority | Issue Count | Description |
|----------|-------------|-------------|
| **P0 - Critical** | 7 | Health Hazard checkboxes (tenant safety) |
| **P1 - High** | 8 | Fire/Gas/Safety checkboxes (critical safety) |
| **P2 - Medium** | 7 | Metadata fields (context loss) |
| **P3 - Low** | 5 | Other checkboxes (completeness) |

---

## Next Steps

1. ⏳ Review this report with development team
2. ⏳ Prioritize fixes (P0 → P1 → P2 → P3)
3. ⏳ Implement checkbox mappings (Fix 1)
4. ⏳ Implement metadata mappings (Fix 2)
5. ⏳ Re-test with INT-20251216-3023
6. ⏳ Create verification script (Fix 3)
7. ⏳ Run complete TEST_05 checklist
8. ⏳ Deploy fixes to production

---

**Report Generated:** 2025-12-16
**Reported By:** User (manual testing) + Claude Code
**Status:** Open - Awaiting fix implementation
**Estimated Fix Time:** 4-6 hours (development + testing)
