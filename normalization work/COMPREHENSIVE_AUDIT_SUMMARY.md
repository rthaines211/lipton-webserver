# Comprehensive Profile Audit Summary

**Date**: 2025-11-10
**Issue**: Set splitting and count mismatches across all three discovery document profiles

---

## Executive Summary

**ALL THREE PROFILES** have significant discrepancies between their Python code counts and the Discovery Doc Profiles.md specification. This is causing the document generation to produce far more interrogatories than the Python splitting algorithm expects, resulting in:

- **Admissions Set 1**: 126 instead of 120 (+6 extra)
- **Admissions Set 2**: 173 instead of 120 (+53 extra)
- **Admissions Set 3**: 63 instead of 18 (+45 extra)

---

## 🔵 ADMISSIONS Profile

**Discrepancies**: 41 mismatches
**Total Impact**: -102 interrogatories (spec says 365, code calculates 263)

### Critical Issues (> 5 count difference)

| Flag | Spec | Code | Diff |
|------|------|------|------|
| `HasNonresponsiveLandlord` | 12 | 1 | **-11** ❌ |
| `HasAgeDiscrimination` | 10 | 1 | **-9** ❌ |
| `HasDisabilityDiscrimination` | 10 | 1 | **-9** ❌ |
| `HasRacialDiscrimination` | 10 | 1 | **-9** ❌ |
| `HasGovContact` | 9 | 1 | **-8** ❌ |
| `HasRatsMice` | 1 | 8 | **+7** ❌ |
| `HasTrashProblems` | 7 | 1 | **-6** ❌ |
| `HasFireHazard` | 7 | 2 | **-5** ❌ |
| `HasStructure` | 6 | 1 | **-5** ❌ |
| `HasFloors` | 6 | 1 | **-5** ❌ |
| `HasWindows` | 6 | 1 | **-5** ❌ |
| `HasDoors` | 6 | 1 | **-5** ❌ |
| `HasCommonArea` | 6 | 1 | **-5** ❌ |
| `HasSafety` | 6 | 1 | **-5** ❌ |
| `HasCabinets` | 6 | 1 | **-5** ❌ |
| `HasHvac` | 6 | 2 | **-4** ❌ |
| `HasElectrical` | 6 | 2 | **-4** ❌ |
| `HasPlumbing` | 6 | 2 | **-4** ❌ |
| `HasHealthHazards` | 6 | 2 | **-4** ❌ |
| `HasHarassment` | 5 | 1 | **-4** ❌ |
| `HasNuisance` | 5 | 1 | **-4** ❌ |
| `HasUnlawfulDetainer` | 5 | 1 | **-4** ❌ |

### Missing Flags in Code

- `HasGasShutoff` (singular - code has HasGasShutoffs plural)
- `HasHeatShutoff` (singular - code has HasHeatShutoffs plural)
- `HasNoncompliantElectricity` (code has HasNonCompliantElectricity)

---

## 🟢 SROGS Profile

**Discrepancies**: 112 count mismatches
**Naming Issues**: 14 different flag names

### Naming Problems

The SROGs profile uses different aggregate flag names than the spec:

| Code Has | Spec Expects |
|----------|--------------|
| `HasElectricalIssues` | Individual flags only |
| `HasPlumbingIssues` | Individual flags only |
| `HasFireHazardIssues` | Individual flags only |
| `HasFlooringIssues` | Individual flags only |
| `HasWindowsIssues` | Individual flags only |
| `HasDoorIssues` | Individual flags only |
| `HasStructureIssues` | Individual flags only |
| `HasCommonAreasIssues` | Individual flags only (note: Areas vs Area) |
| `HasNuisanceIssues` | Individual flags only |
| `HasHealthHazardIssues` | Individual flags only |
| `HasHarassmentIssues` | Individual flags only |
| `HasHVAC` | Individual HVAC flags only |
| `HasRaccoons` | `HasRacoons` (one 'c') |
| `HasCodeEn` | `HasCodeEnforcement` (truncated) |

### Critical Count Issues (> 10 difference)

| Flag | Spec | Code | Diff |
|------|------|------|------|
| `HasLeaksInGarage` | 20 | 6 | **-14** ❌ |
| `HasSafety` | 20 | 6 | **-14** ❌ |
| `HasAgeDiscrimination` | 21 | 8 | **-13** ❌ |
| `HasDisabilityDiscrimination` | 20 | 9 | **-11** ❌ |
| `HasSecurityCameras` | 14 | 3 | **-11** ❌ |
| `HasMosquitos` | 13 | 3 | **-10** ❌ |

**Note**: SROGs has MANY more discrepancies. Nearly every flag has a count mismatch.

---

## 🟠 PODS Profile

**Discrepancies**: 116 mismatches

### Characteristics

PODs is unique in that:
- Most individual flags are set to `1` in the code
- The spec expects `4` or `5` for most flags
- This is a **systematic undercount** across almost every flag

### Critical Issues (> 15 difference)

| Flag | Spec | Code | Diff |
|------|------|------|------|
| `HasAgeDiscrimination` | 21 | 1 | **-20** ❌ |
| `HasDisabilityDiscrimination` | 20 | 1 | **-19** ❌ |
| `HasRacialDiscrimination` | 19 | 1 | **-18** ❌ |

### Systematic Undercount Pattern

**Nearly ALL flags** in PODs are set to `1` when they should be `4` or `5`:

- **120+ flags** should be `4` or `5` but are set to `1`
- This represents a **massive systematic undercount**
- PODs is essentially counting **1/5th** of what it should

### Missing Flag

- `HasNoncompliantElectricity` - missing from code entirely

---

## Root Cause Analysis

### Why This Happened

1. **The Docmosis templates were built using the spec counts** in Discovery Doc Profiles.md
2. **The Python profiles were modified** at some point to have lower counts
3. **The templates and Python code diverged**
4. **The templates are generating the "correct" count** based on the spec
5. **The Python splitter thinks it's allocating fewer interrogatories** than actually get generated

### The Mismatch Flow

```
Python Profile Says:
  "HasFireHazard: 2 interrogatories"

Docmosis Template Actually Generates:
  6-7 interrogatories for HasFireHazard

Result:
  Python thinks Set 1 can hold more flags
  Template generates way more than expected
  Overflow spills into subsequent sets
```

---

## Impact on Set Splitting

### Admissions Example

**Python Calculation**:
- Set 1: 50 flags × (average 2.4 interrogatories/flag) = 120 interrogatories ✅

**Template Reality**:
- Set 1: 50 flags × (average 2.5+ interrogatories/flag) = **126 interrogatories** ❌
- Set 2: 120 flags × (average 1.0 interrogatories/flag calculated, but **1.44 actual**) = **173 interrogatories** ❌
- Set 3: 18 flags × (average 1.0 interrogatories/flag calculated, but **3.5 actual**) = **63 interrogatories** ❌

---

## Solution

### Option 1: Update Python Profiles to Match Spec (RECOMMENDED)

**Pros**:
- Templates already work correctly
- Spec is the source of truth
- One-time fix

**Cons**:
- Need to update 3 profile files
- Many changes required

### Option 2: Update Spec to Match Python

**Pros**:
- Documents current state
- No code changes

**Cons**:
- Templates would still be wrong
- Doesn't solve the actual problem

### Option 3: Audit Templates and Create New Spec

**Pros**:
- Most accurate
- Definitive source of truth

**Cons**:
- Time-consuming
- Templates are binary .docx files

---

## Recommended Action Plan

1. ✅ **Fix Admissions Profile** - Update counts to match spec
2. ✅ **Fix SROGs Profile** - Update counts AND flag names to match spec
3. ✅ **Fix PODs Profile** - Update counts to match spec
4. ✅ **Test with "NEW TEST" case** - Verify sets split correctly
5. ✅ **Document the changes** - Update profile documentation

---

## Files Requiring Updates

1. `normalization work/src/phase4/profiles/admissions_complete.py`
2. `normalization work/src/phase4/profiles/srogs_complete.py`
3. `normalization work/src/phase4/profiles/pods_complete.py`

---

## Testing Strategy

After fixes:
1. Run the pipeline on "NEW TEST" case
2. Verify interrogatory counts match expectations:
   - Admissions Set 1: Should be ~120 (not 126)
   - Admissions Set 2: Should be ~120 (not 173)
   - Admissions Set 3: Should be ~18 (not 63)
3. Inspect generated .docx files to confirm counts
4. Verify set boundaries are respected

---

## Notes

- The Discovery Doc Profiles.md specification appears to be the **source of truth**
- The Docmosis templates were built against this spec
- The Python profiles have drifted from the spec over time
- This audit reveals the extent of the drift: **267 total discrepancies across all profiles**
