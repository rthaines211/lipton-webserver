# Manual Validation Plan: Form Submissions → Document Profiles

## Purpose
This guide provides a systematic approach to manually validate that form submissions are correctly corresponding with document profiles (SROGs, PODs, Admissions) throughout the 5-phase pipeline.

---

## Table of Contents
1. [Overview of the Validation Flow](#overview)
2. [Prerequisites](#prerequisites)
3. [Validation Checkpoints](#validation-checkpoints)
4. [Step-by-Step Validation Process](#step-by-step-process)
5. [Common Issues & What to Look For](#common-issues)
6. [Validation Checklist Template](#checklist-template)

---

## Overview of the Validation Flow {#overview}

### Architecture Summary
```
Form Submission (JSON)
    ↓
Phase 1: Input Normalization (flatten discovery → boolean flags)
    ↓
Phase 2: Dataset Builder (HoH Plaintiffs × Defendants)
    ↓
Phase 3: Flag Processors (180+ flags based on issues)
    ↓
Phase 4: Document Profiles (filter by doc type)
    ↓
Phase 5: Set Splitting (max 120 interrogatories per set)
    ↓
Generated Documents
```

### Critical Validation Points
1. **Form → Phase 1**: Are issue arrays correctly extracted?
2. **Phase 1 → Phase 3**: Are boolean flags correctly set?
3. **Phase 3 → Phase 4**: Do document profiles include/exclude correct flags?
4. **Phase 4 → Output**: Are interrogatory counts accurate?

---

## Prerequisites {#prerequisites}

### Required Files
- [ ] Form submission JSON: `data/form-entry-*.json`
- [ ] Phase 1 output: `normalization work/output_phase1_*.json`
- [ ] Phase 2 output: `normalization work/output_phase2_*.json`
- [ ] Phase 3 output: `normalization work/output_phase3_*.json`
- [ ] Phase 4 output: `normalization work/output_phase4_*.json`
- [ ] Phase 5 output: `normalization work/output_phase5_*.json`

### Reference Documents
- [ ] SROGs Profile: `normalization work/src/phase4/profiles/srogs_complete.py`
- [ ] PODs Profile: `normalization work/src/phase4/profiles/pods_complete.py`
- [ ] Admissions Profile: `normalization work/src/phase4/profiles/admissions_complete.py`
- [ ] Transformation Service: `server/services/transformation-service.js`

### Tools
- [ ] Text editor with JSON formatting
- [ ] Spreadsheet application (Excel/Google Sheets)
- [ ] Python interpreter (optional, for checking interrogatory counts)

---

## Validation Checkpoints {#validation-checkpoints}

### Checkpoint 1: Form Submission Structure
**Location**: `data/form-entry-[timestamp]-[id].json`

**What to Validate**:
- [ ] Case information present (`Full_Address`, `Filing city`, `Filing county`)
- [ ] At least one plaintiff with `HeadOfHousehold: true`
- [ ] At least one defendant
- [ ] Head of Household has `PlaintiffItemNumberDiscovery` object
- [ ] Discovery object contains issue arrays (e.g., `Vermin`, `Insects`, `HVAC`)

**Example Check**:
```json
{
  "PlaintiffDetails": [
    {
      "HeadOfHousehold": true,  ✓ Must be true for at least one plaintiff
      "PlaintiffItemNumberDiscovery": {
        "VerminIssue": true,     ✓ Category flag present
        "Vermin": [              ✓ Array with specific selections
          "Rats/Mice",
          "Skunks"
        ]
      }
    }
  ]
}
```

---

### Checkpoint 2: Phase 1 Output (Input Normalization)
**Location**: `normalization work/output_phase1_[timestamp].json`

**What to Validate**:

#### A. Case Info Extraction
- [ ] `property_address` matches form's `Full_Address.StreetAddress`
- [ ] `city` matches form's `Filing city`
- [ ] `county` matches form's `Filing county`
- [ ] `filing_location` is properly formatted
- [ ] `submitter_email` matches form's `Notification Email`

#### B. Plaintiff Extraction
For each plaintiff in the form:
- [ ] `plaintiff_id` is 6-character unique ID (matches form's `Id`)
- [ ] `first_name`, `last_name` match form names
- [ ] `full_name` is properly formatted
- [ ] `plaintiff_type` extracted correctly (`Individual`, `Guardian`, etc.)
- [ ] `is_head_of_household` matches form's `HeadOfHousehold`
- [ ] `unit_number` extracted if present

#### C. Discovery Flattening (MOST CRITICAL)
For Head of Household plaintiffs, verify discovery arrays are present:

**Form Example**:
```json
"PlaintiffItemNumberDiscovery": {
  "VerminIssue": true,
  "Vermin": ["Rats/Mice", "Skunks", "Bats"],
  "InsectIssues": true,
  "Insects": ["Roaches", "Ants", "Bedbugs"],
  "HVACIssues": true,
  "HVAC": ["Air Conditioner", "Heater"]
}
```

**Phase 1 Output Should Contain**:
```json
"discovery": {
  "vermin": ["Rats/Mice", "Skunks", "Bats"],
  "insects": ["Roaches", "Ants", "Bedbugs"],
  "hvac": ["Air Conditioner", "Heater"],
  "has_vermin_issue": true,
  "has_insect_issues": true,
  "has_hvac_issues": true
}
```

**Validation Table for Discovery Mapping**:

| Form Field | Phase 1 Discovery Key | Expected Value |
|------------|----------------------|----------------|
| `Vermin` | `vermin` | Array of strings |
| `Insects` | `insects` | Array of strings |
| `HVAC` | `hvac` | Array of strings |
| `Electrical` | `electrical` | Array of strings |
| `Fire Hazard` | `fire_hazard` | Array of strings |
| `Specific Government Entity Contacted` | `government` | Array of strings |
| `Plumbing` | `plumbing` | Array of strings |
| `Cabinets` | `cabinets` | Array of strings |
| `Flooring` | `flooring` | Array of strings |
| `Windows` | `windows` | Array of strings |
| `Doors` | `doors` | Array of strings |
| `Structure` | `structure` | Array of strings |
| `Common areas` | `common_areas` | Array of strings |
| `Nuisance` | `nuisance` | Array of strings |
| `Health hazard` | `health_hazard` | Array of strings |
| `Harassment` | `harassment` | Array of strings |
| `Select Notices Issues` | `notices` | Array of strings |
| `Select Utilities Issues` | `utilities` | Array of strings |
| `Select Safety Issues` | `safety` | Array of strings |
| `Appliances` | `appliances` | Array of strings |
| `Select Trash Problems` | `trash` | Array of strings |

#### D. Defendant Extraction
For each defendant:
- [ ] `defendant_id` is 6-character unique ID
- [ ] `full_name` matches form
- [ ] `entity_type` extracted (LLC, Corporation, Individual, etc.)
- [ ] `role` extracted (`Manager`, `Owner`, or defaults to `Defendant`)

---

### Checkpoint 3: Phase 2 Output (Dataset Builder)
**Location**: `normalization work/output_phase2_[timestamp].json`

**What to Validate**:

#### A. Dataset Count
```
Expected Datasets = (Number of HoH Plaintiffs) × (Number of Defendants)
```

**Example**:
- 1 Head of Household plaintiff
- 2 Defendants
- **Expected**: 2 datasets

#### B. Each Dataset Structure
For each dataset:
- [ ] `dataset_id` is unique
- [ ] `plaintiff` object contains ONE HoH plaintiff
- [ ] `defendant` object contains ONE defendant
- [ ] `plaintiff.discovery` is present and populated
- [ ] `case_info` is identical across all datasets
- [ ] `case_context` contains aggregate plaintiff/defendant information

#### C. Non-HoH Plaintiffs
- [ ] Non-HoH plaintiffs appear in `case_context.all_plaintiffs_summary`
- [ ] Non-HoH plaintiffs do NOT generate separate datasets
- [ ] Their names are included in aggregate plaintiff listings

---

### Checkpoint 4: Phase 3 Output (Flag Processing)
**Location**: `normalization work/output_phase3_[timestamp].json`

**What to Validate**:

#### A. Boolean Flag Generation
For each dataset, verify flags are set based on discovery arrays.

**Critical Mapping Rules**:

| Discovery Array Item | Expected Flags | Profile | Count (SROGs) |
|---------------------|----------------|---------|---------------|
| `vermin: ["Rats/Mice"]` | `HasRatsMice: true`<br>`HasVermin: true` | SROGs | 18 + 20 |
| `insects: ["Roaches"]` | `HasRoaches: true` | SROGs | 13 |
| `insects: ["Bedbugs"]` | `HasBedbugs: true` | SROGs | 13 |
| `hvac: ["Air Conditioner"]` | `HasAC: true`<br>`HasHVAC: true` | SROGs | 7 + 8 |
| `hvac: ["Heater"]` | `HasHeater: true`<br>`HasHVAC: true` | SROGs | 7 + 8 |
| `plumbing: ["Sewage coming out"]` | `HasSewageComingOut: true`<br>`HasPlumbingIssues: true` | SROGs | 15 + 12 |
| `plumbing: ["Leaks"]` | `HasLeaks: true`<br>`HasPlumbingIssues: true` | SROGs | 12 + 12 |
| `health_hazard: ["Mold"]` | `HasMold: true`<br>`HasHealthHazardIssues: true` | SROGs | 24 + 15 |
| `doors: ["Broken"]` | `HasBrokenDoors: true`<br>`HasDoorIssues: true` | SROGs | 17 + 10 |
| `structure: ["Hole in ceiling"]` | `HasHoleInCeiling: true`<br>`HasHolesInCeilingWalls: true`<br>`HasStructureIssues: true` | SROGs | 8 + 9 + 12 |

#### B. Aggregate Flags
Verify aggregate flags are set when ANY related specific flag is true:

| Aggregate Flag | Set to True If Any Of These Are True |
|----------------|--------------------------------------|
| `HasVermin` | `HasRatsMice`, `HasSkunks`, `HasBats`, `HasRaccoons`, `HasPigeons`, `HasOpossums` |
| `HasHVAC` | `HasAC`, `HasHeater`, `HasVentilation` |
| `HasElectricalIssues` | `HasOutlets`, `HasPanel`, `HasWallSwitches`, `HasExteriorLighting`, `HasInteriorLighting`, `HasLightFixtures`, `HasFans` |
| `HasPlumbingIssues` | `HasToilet`, `HasShower`, `HasBath`, `HasFixtures`, `HasLeaks`, etc. |
| `HasStructureIssues` | `HasHoleInCeiling`, `HasWaterStainsOnCeiling`, `HasHoleInWall`, etc. |

#### C. Defendant Role Flags
- [ ] `IsOwner: true` if defendant's `role == "Owner"`
- [ ] `IsManager: true` if defendant's `role == "Manager"`

#### D. General Flags (Profile-Specific)
- [ ] `SROGsGeneral: true` for SROGs profile (always set)
- [ ] `PODsGeneral: true` for PODs profile (always set)
- [ ] `AdmissionsGeneral: true` for Admissions profile (always set)

---

### Checkpoint 5: Phase 4 Output (Document Profiles)
**Location**: `normalization work/output_phase4_[timestamp].json`

**What to Validate**:

#### A. Profile Application
For each dataset, verify it has been duplicated into 3 profiles (if all selected):
- [ ] One with `doc_type: "SROGs"`
- [ ] One with `doc_type: "PODs"`
- [ ] One with `doc_type: "Admissions"`

**Expected Dataset Count**:
```
Phase 4 Datasets = (Phase 2 Datasets) × (Number of Selected Document Types)
```

**Example**:
- Phase 2: 2 datasets (1 HoH × 2 Defendants)
- Document types selected: SROGs, PODs, Admissions
- **Expected Phase 4 Datasets**: 6

#### B. Profile Metadata
For each dataset, verify:
- [ ] `profile` object exists
- [ ] `profile.doc_type` is one of: `"SROGs"`, `"PODs"`, `"Admissions"`
- [ ] `profile.template_name` matches doc type (e.g., `"SROGsMaster.docx"`)
- [ ] `profile.filename_suffix` is appropriate (e.g., `"Discovery Propounded SROGs"`)

#### C. Flag Filtering (CRITICAL)
Each profile should only include flags with interrogatory counts > 0 in that profile.

**Example Validation for SROGs**:

If Phase 3 dataset has:
```json
{
  "flags": {
    "HasRatsMice": true,
    "HasRoaches": true,
    "HasMold": true,
    "HasBrokenDoors": true,
    "SROGsGeneral": true,
    "IsManager": true
  }
}
```

Phase 4 SROGs dataset should have:
```json
{
  "flags": {
    "HasRatsMice": true,      // Count: 18
    "HasRoaches": true,        // Count: 13
    "HasMold": true,           // Count: 24
    "HasBrokenDoors": true,    // Count: 17
    "SROGsGeneral": true,      // Count: 56
    "IsManager": true          // Count: 20
  },
  "profile": {
    "doc_type": "SROGs",
    "interrogatory_counts": {
      "HasRatsMice": 18,
      "HasRoaches": 13,
      "HasMold": 24,
      "HasBrokenDoors": 17,
      "SROGsGeneral": 56,
      "IsManager": 20
    }
  }
}
```

**Flags with Count = 0 Should Be REMOVED**:
- If `HasLosAngeles: true` but not in Los Angeles, it should be excluded from PODs/Admissions (only SROGs)

#### D. Total Interrogatory Count
For each dataset, calculate:
```python
total_interrogatories = sum(profile['interrogatory_counts'].values())
```

Verify this number makes sense based on selected issues.

**Example Calculation**:
```
SROGsGeneral: 56
IsManager: 20
HasRatsMice: 18
HasRoaches: 13
HasMold: 24
-------------------
Total: 131 interrogatories
```

This total will be used for set splitting in Phase 5.

---

### Checkpoint 6: Phase 5 Output (Set Splitting)
**Location**: `normalization work/output_phase5_[timestamp].json`

**What to Validate**:

#### A. Set Splitting Logic
California court rules limit interrogatories to **120 per set**.

**Rules**:
1. **First-set-only flags** go in Set 1 (e.g., `SROGsGeneral`, `IsOwner`, `IsManager`)
2. Remaining flags are distributed across sets, max 120 per set
3. Each set has unique interrogatory numbering

**Example**:
- Total interrogatories: 131
- Set 1: `SROGsGeneral (56) + IsManager (20)` = 76 interrogatories
- Set 2: `HasRatsMice (18) + HasRoaches (13) + HasMold (24)` = 55 interrogatories
- **Result**: 2 sets

#### B. Set Metadata
For each set, verify:
- [ ] `set_number` starts at 1 and increments
- [ ] `filename` contains set number (e.g., `"Set 1 - Clark Kent v htd ewt - Discovery Propounded SROGs"`)
- [ ] `interrogatory_count` ≤ 120
- [ ] Sum of all set counts = total interrogatories from Phase 4

#### C. Filename Format
Verify filename follows pattern:
```
Set [N] - [Plaintiff Name] v [Defendant Name] - [Document Type Suffix]
```

**Example**:
```
Set 1 - Clark Kent v htd ewt - Discovery Propounded SROGs
Set 2 - Clark Kent v htd ewt - Discovery Propounded SROGs
```

#### D. First Set Only Flags
Verify these flags ONLY appear in Set 1:
- [ ] `SROGsGeneral` (SROGs only)
- [ ] `PODsGeneral` (PODs only)
- [ ] `AdmissionsGeneral` (Admissions only)
- [ ] `IsOwner` (all profiles)
- [ ] `IsManager` (all profiles)

---

## Step-by-Step Validation Process {#step-by-step-process}

### Step 1: Select a Test Form Submission
1. Choose a form submission JSON: `data/form-entry-[timestamp]-[id].json`
2. Note the timestamp and case ID
3. Open in text editor with JSON formatting

### Step 2: Run the Pipeline
```bash
cd "normalization work"
python3 run_pipeline.py --input "../data/form-entry-[timestamp]-[id].json"
```

This generates 5 output files:
- `output_phase1_[timestamp].json`
- `output_phase2_[timestamp].json`
- `output_phase3_[timestamp].json`
- `output_phase4_[timestamp].json`
- `output_phase5_[timestamp].json`

### Step 3: Create Validation Spreadsheet

**Column Headers**:
| Form Field | Expected Phase 1 | Actual Phase 1 | Expected Flag (Phase 3) | Actual Flag | Expected Count (Phase 4) | Actual Count | Status |
|------------|------------------|----------------|-------------------------|-------------|--------------------------|--------------|--------|

### Step 4: Validate Discovery Mapping (Form → Phase 1)

**For Head of Household Plaintiff**:

1. In form submission, find `PlaintiffItemNumberDiscovery` object
2. For each issue category (e.g., `Vermin`, `Insects`), list selected items
3. In Phase 1 output, find `plaintiffs[0].discovery` object
4. Verify each array is present with correct items

**Example Entry**:
| Form Field | Expected Phase 1 | Actual Phase 1 | Status |
|------------|------------------|----------------|--------|
| `Vermin: ["Rats/Mice", "Skunks"]` | `vermin: ["Rats/Mice", "Skunks"]` | `vermin: ["Rats/Mice", "Skunks"]` | ✓ PASS |
| `Insects: ["Roaches", "Ants"]` | `insects: ["Roaches", "Ants"]` | `insects: ["Roaches", "Ants"]` | ✓ PASS |

### Step 5: Validate Flag Generation (Phase 1 → Phase 3)

1. In Phase 3 output, find `datasets[0].flags`
2. For each discovery array item from Phase 1, verify corresponding flag is `true`
3. Use the flag mapping table from Checkpoint 4

**Example Entry**:
| Discovery Item | Expected Flag | Actual Flag | Status |
|----------------|---------------|-------------|--------|
| `vermin: ["Rats/Mice"]` | `HasRatsMice: true` | `HasRatsMice: true` | ✓ PASS |
| `vermin: ["Rats/Mice"]` | `HasVermin: true` (aggregate) | `HasVermin: true` | ✓ PASS |
| `insects: ["Roaches"]` | `HasRoaches: true` | `HasRoaches: true` | ✓ PASS |

### Step 6: Validate Profile Filtering (Phase 3 → Phase 4)

1. Open `srogs_complete.py` and find `interrogatory_counts` dictionary
2. For each flag in Phase 3 output with value `true`:
   - Look up the flag in `interrogatory_counts`
   - Note the count value
3. In Phase 4 output, verify:
   - Flag is present if count > 0
   - Flag is absent if count = 0 or flag not in dictionary
   - Count value matches profile definition

**Example Entry**:
| Flag (Phase 3) | Profile Count | Present in Phase 4? | Actual Count | Status |
|----------------|---------------|---------------------|--------------|--------|
| `HasRatsMice: true` | 18 | Yes | 18 | ✓ PASS |
| `HasRoaches: true` | 13 | Yes | 13 | ✓ PASS |
| `HasMold: true` | 24 | Yes | 24 | ✓ PASS |
| `SROGsGeneral: true` | 56 | Yes | 56 | ✓ PASS |

### Step 7: Validate Interrogatory Counts

1. For each Phase 4 dataset, sum all interrogatory counts
2. Record total
3. In Phase 5 output, verify:
   - Number of sets is correct based on 120 per set limit
   - Sum of set counts equals Phase 4 total

**Example Entry**:
| Profile | Phase 4 Total | Expected Sets | Actual Sets | Set 1 Count | Set 2 Count | Sum Matches? | Status |
|---------|---------------|---------------|-------------|-------------|-------------|--------------|--------|
| SROGs | 131 | 2 | 2 | 76 | 55 | Yes | ✓ PASS |

### Step 8: Validate Filename Generation

1. Extract plaintiff and defendant names from form
2. For each Phase 5 output set, verify filename matches pattern:
   ```
   Set [N] - [Plaintiff] v [Defendant] - [Doc Type Suffix]
   ```

**Example Entry**:
| Set # | Expected Filename | Actual Filename | Status |
|-------|-------------------|-----------------|--------|
| 1 | `Set 1 - Clark Kent v htd ewt - Discovery Propounded SROGs` | `Set 1 - Clark Kent v htd ewt - Discovery Propounded SROGs` | ✓ PASS |

### Step 9: Spot-Check Specific Issue Flags

Pick 5-10 high-impact issues and trace through entire pipeline:

**Example Issue**: **Mold**

| Stage | Expected | Actual | Status |
|-------|----------|--------|--------|
| Form | `Health hazard: ["Mold"]` | Present | ✓ |
| Phase 1 | `health_hazard: ["Mold"]` | Present | ✓ |
| Phase 3 | `HasMold: true`, `HasHealthHazardIssues: true` | Both true | ✓ |
| Phase 4 (SROGs) | Count: 24 (HasMold) + 15 (HasHealthHazardIssues) | 24 + 15 | ✓ |
| Phase 5 | Included in interrogatory total | Yes | ✓ |

**High-Impact Issues to Spot-Check**:
1. Mold (highest SROG count: 24)
2. Security Deposit (count: 20)
3. Rats/Mice (count: 18)
4. Broken Doors (count: 17)
5. Harassment (count: 16)
6. Sewage Coming Out (count: 15)
7. Elevator (count: 18)

### Step 10: Cross-Reference with Database

If form was submitted to database:

1. Find case in PostgreSQL:
   ```sql
   SELECT * FROM cases WHERE raw_payload->>'serverTimestamp' = '[timestamp]';
   ```

2. Verify parties were created:
   ```sql
   SELECT * FROM parties WHERE case_id = [case_id];
   ```

3. Verify issue selections were correlated:
   ```sql
   SELECT p.full_name, ic.category_code, io.option_name
   FROM party_issue_selections pis
   JOIN parties p ON pis.party_id = p.id
   JOIN issue_options io ON pis.issue_option_id = io.id
   JOIN issue_categories ic ON io.category_id = ic.id
   WHERE p.case_id = [case_id]
   ORDER BY p.full_name, ic.category_code, io.option_name;
   ```

4. Compare database selections with Phase 1 discovery arrays

---

## Common Issues & What to Look For {#common-issues}

### Issue 1: Missing Discovery Arrays
**Symptom**: Phase 1 plaintiff has no `discovery` object or empty arrays

**Root Causes**:
- Plaintiff is not Head of Household (only HoH have discovery)
- Form submission was corrupted
- Transformation service failed to map checkboxes

**How to Check**:
1. In form JSON, verify `HeadOfHousehold: true`
2. Verify `PlaintiffItemNumberDiscovery` object exists
3. Check issue arrays are not empty

### Issue 2: Wrong Flag Names
**Symptom**: Phase 3 flag names don't match Phase 4 profile expectations

**Root Causes**:
- Flag processor naming doesn't match profile dictionary keys
- Case sensitivity mismatch (e.g., `hasRatsMice` vs `HasRatsMice`)

**How to Check**:
1. Open `srogs_complete.py` and note exact flag names
2. In Phase 3 output, verify flag names match exactly (case-sensitive)

### Issue 3: Aggregate Flags Not Set
**Symptom**: Specific flags are true (e.g., `HasRatsMice`) but aggregate flag is false (e.g., `HasVermin`)

**Root Causes**:
- Flag processor didn't compute aggregate
- Logic error in flag processor

**How to Check**:
1. Find all specific flags in a category (e.g., `HasRatsMice`, `HasSkunks`)
2. Verify corresponding aggregate flag is true (e.g., `HasVermin`)

### Issue 4: Interrogatory Count Mismatch
**Symptom**: Phase 4 interrogatory count doesn't match profile definition

**Root Causes**:
- Profile was updated but cached version used
- Flag wasn't properly filtered

**How to Check**:
1. Open profile Python file (e.g., `srogs_complete.py`)
2. Find flag in `interrogatory_counts` dictionary
3. Verify number matches Phase 4 output

### Issue 5: Incorrect Set Splitting
**Symptom**: Sets exceed 120 interrogatories or first-set flags appear in later sets

**Root Causes**:
- Set splitter logic error
- First-set-only flags not properly identified

**How to Check**:
1. For Set 1, verify it includes first-set-only flags (`SROGsGeneral`, `IsOwner`, `IsManager`)
2. Verify no set exceeds 120 interrogatories
3. Verify first-set flags don't appear in Set 2+

### Issue 6: Missing Datasets
**Symptom**: Phase 2 has fewer datasets than expected

**Root Causes**:
- Not all plaintiffs are Head of Household
- Defendants missing from form submission

**How to Check**:
```
Expected = (# of HoH Plaintiffs) × (# of Defendants)
```

Count HoH plaintiffs in form: `HeadOfHousehold: true`
Count defendants: `DefendantDetails2` array length

### Issue 7: Profile Not Applied
**Symptom**: Phase 4 dataset missing profile metadata or flags not filtered

**Root Causes**:
- Document type not selected in form
- Profile application failed

**How to Check**:
1. In form JSON, check document types selected (if field exists)
2. Verify Phase 4 has datasets for each selected type

### Issue 8: Non-HoH Plaintiffs Generate Datasets
**Symptom**: Phase 2 has more datasets than expected

**Root Causes**:
- Non-HoH plaintiffs incorrectly treated as HoH
- `is_head_of_household` flag set incorrectly in Phase 1

**How to Check**:
1. In form, count plaintiffs with `HeadOfHousehold: true`
2. In Phase 1, verify only those plaintiffs have `is_head_of_household: true`
3. In Phase 2, verify dataset count matches expected

---

## Validation Checklist Template {#checklist-template}

### Case Information
- [ ] Case ID: _________________
- [ ] Timestamp: _________________
- [ ] Form Entry File: _________________
- [ ] Validator Name: _________________
- [ ] Date of Validation: _________________

---

### Phase 1: Input Normalization
- [ ] Property address matches form
- [ ] Plaintiff names extracted correctly (count: ____)
- [ ] Defendant names extracted correctly (count: ____)
- [ ] Head of Household identified (count: ____)
- [ ] Discovery arrays present for HoH plaintiffs
- [ ] All 24 issue categories checked

**Discovery Array Validation** (check all that apply):
- [ ] Vermin issues mapped correctly
- [ ] Insect issues mapped correctly
- [ ] HVAC issues mapped correctly
- [ ] Electrical issues mapped correctly
- [ ] Fire hazard issues mapped correctly
- [ ] Government entities mapped correctly
- [ ] Plumbing issues mapped correctly
- [ ] Cabinet issues mapped correctly
- [ ] Flooring issues mapped correctly
- [ ] Window issues mapped correctly
- [ ] Door issues mapped correctly
- [ ] Structure issues mapped correctly
- [ ] Common area issues mapped correctly
- [ ] Nuisance issues mapped correctly
- [ ] Health hazard issues mapped correctly
- [ ] Harassment issues mapped correctly
- [ ] Notice issues mapped correctly
- [ ] Utility issues mapped correctly
- [ ] Safety issues mapped correctly
- [ ] Appliance issues mapped correctly
- [ ] Trash issues mapped correctly

---

### Phase 2: Dataset Builder
- [ ] Dataset count = (HoH Plaintiffs) × (Defendants): ____ × ____ = ____
- [ ] Each dataset has one plaintiff, one defendant
- [ ] Non-HoH plaintiffs appear in case context only
- [ ] Discovery data present in each dataset

---

### Phase 3: Flag Processing
- [ ] Boolean flags generated from discovery arrays
- [ ] Aggregate flags set correctly
- [ ] Defendant role flags set correctly
- [ ] Spot-checked 10 flags: ___ passed, ___ failed

**Critical Flags to Verify**:
- [ ] HasMold (if mold selected)
- [ ] HasRatsMice (if rats/mice selected)
- [ ] HasBrokenDoors (if broken doors selected)
- [ ] HasSewageComingOut (if sewage selected)
- [ ] HasVermin (aggregate)
- [ ] HasPlumbingIssues (aggregate)
- [ ] IsOwner or IsManager (based on defendant role)

---

### Phase 4: Document Profiles
- [ ] Dataset count = (Phase 2) × (# of doc types): ____ × ____ = ____
- [ ] SROGs profile applied (if selected)
- [ ] PODs profile applied (if selected)
- [ ] Admissions profile applied (if selected)
- [ ] Flags filtered by profile (zero-count flags removed)
- [ ] Interrogatory counts match profile definitions
- [ ] Total interrogatories calculated: ____

**Profile-Specific Checks**:

**SROGs**:
- [ ] SROGsGeneral: true (count: 56)
- [ ] IsOwner or IsManager present (counts: 22/20)
- [ ] Total interrogatories: ____

**PODs**:
- [ ] PODsGeneral: true
- [ ] Total interrogatories: ____

**Admissions**:
- [ ] AdmissionsGeneral: true
- [ ] Total interrogatories: ____

---

### Phase 5: Set Splitting
- [ ] Sets created based on 120 interrogatory limit
- [ ] First-set-only flags in Set 1 only
- [ ] Sum of set counts = Phase 4 total
- [ ] Filenames formatted correctly

**Per-Set Validation**:

**Set 1**:
- [ ] Contains first-set-only flags
- [ ] Interrogatory count ≤ 120: ____ interrogatories
- [ ] Filename: _________________________________

**Set 2** (if applicable):
- [ ] No first-set-only flags
- [ ] Interrogatory count ≤ 120: ____ interrogatories
- [ ] Filename: _________________________________

**Set 3** (if applicable):
- [ ] No first-set-only flags
- [ ] Interrogatory count ≤ 120: ____ interrogatories
- [ ] Filename: _________________________________

---

### Overall Validation Summary
- [ ] All 5 phases completed successfully
- [ ] No data loss between phases
- [ ] Issue selections correctly mapped to interrogatories
- [ ] Document profiles applied correctly
- [ ] Ready for document generation

**Total Issues Found**: ____
**Critical Issues**: ____
**Minor Issues**: ____

**Validation Result**: ☐ PASS  ☐ FAIL  ☐ PASS WITH NOTES

**Notes**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Quick Reference: Issue → Flag → Count

### Top 20 Most Common Issues

| Issue Selected | Phase 1 Array | Phase 3 Flag | SROGs Count | PODs Count | Admissions Count |
|----------------|---------------|--------------|-------------|------------|------------------|
| Mold | `health_hazard: ["Mold"]` | `HasMold: true` | 24 | 8 | 6 |
| Rats/Mice | `vermin: ["Rats/Mice"]` | `HasRatsMice: true` | 18 | 6 | 4 |
| Roaches | `insects: ["Roaches"]` | `HasRoaches: true` | 13 | 5 | 3 |
| Bedbugs | `insects: ["Bedbugs"]` | `HasBedbugs: true` | 13 | 5 | 3 |
| Broken Doors | `doors: ["Broken"]` | `HasBrokenDoors: true` | 17 | 6 | 4 |
| Sewage Coming Out | `plumbing: ["Sewage coming out"]` | `HasSewageComingOut: true` | 15 | 7 | 5 |
| Leaks | `plumbing: ["Leaks"]` | `HasLeaks: true` | 12 | 6 | 4 |
| Air Conditioner | `hvac: ["Air Conditioner"]` | `HasAC: true` | 7 | 3 | 2 |
| Heater | `hvac: ["Heater"]` | `HasHeater: true` | 7 | 3 | 2 |
| Elevator | `common_areas: ["Elevator"]` | `HasElevator: true` | 18 | 8 | 6 |
| Security Deposit | Direct boolean | `HasSecurityDeposit: true` | 20 | 10 | 8 |
| Harassment | `harassment: [items]` | `HasHarassmentIssues: true` | 16 | 8 | 6 |
| Health Hazard | `health_hazard: [items]` | `HasHealthHazardIssues: true` | 15 | 7 | 5 |
| Structure Issues | `structure: [items]` | `HasStructureIssues: true` | 12 | 6 | 4 |
| Plumbing Issues | `plumbing: [items]` | `HasPlumbingIssues: true` | 12 | 6 | 4 |
| Fire Hazard | `fire_hazard: [items]` | `HasFireHazardIssues: true` | 12 | 6 | 4 |
| Electrical Issues | `electrical: [items]` | `HasElectricalIssues: true` | 10 | 5 | 3 |
| Door Issues | `doors: [items]` | `HasDoorIssues: true` | 10 | 5 | 3 |
| Government Contact | `government: [items]` | `HasGovernmentEntityContacted: true` | 10 | 5 | 3 |
| Common Areas | `common_areas: [items]` | `HasCommonAreasIssues: true` | 10 | 5 | 3 |

---

## Troubleshooting Commands

### Run Pipeline with Verbose Output
```bash
cd "normalization work"
python3 run_pipeline.py --input "../data/form-entry-[timestamp]-[id].json" --verbose
```

### Check Specific Phase Output
```bash
# View Phase 1 output
cat "output_phase1_[timestamp].json" | python3 -m json.tool | less

# View Phase 3 flags only
cat "output_phase3_[timestamp].json" | python3 -c "import json, sys; data=json.load(sys.stdin); print(json.dumps(data['datasets'][0]['flags'], indent=2))"

# Count Phase 4 interrogatories
cat "output_phase4_[timestamp].json" | python3 -c "import json, sys; data=json.load(sys.stdin); print(sum(data['datasets'][0]['profile']['interrogatory_counts'].values()))"
```

### Compare Form vs Phase 1
```bash
# Extract form discovery arrays
cat "../data/form-entry-[timestamp]-[id].json" | python3 -c "import json, sys; data=json.load(sys.stdin); print(json.dumps(data['PlaintiffDetails'][0]['PlaintiffItemNumberDiscovery'], indent=2))"

# Extract Phase 1 discovery arrays
cat "output_phase1_[timestamp].json" | python3 -c "import json, sys; data=json.load(sys.stdin); print(json.dumps(data['plaintiffs'][0]['discovery'], indent=2))"
```

---

## Summary

This manual validation plan provides a systematic approach to verify that:
1. Form submissions are correctly parsed
2. Discovery arrays are properly extracted and flattened
3. Boolean flags are accurately generated
4. Document profiles filter flags appropriately
5. Interrogatory counts match profile definitions
6. Set splitting follows court rules

By following this plan, you can identify issues at each stage of the pipeline and ensure form submissions correctly correspond to generated documents.

---

**Last Updated**: November 10, 2025
**Version**: 1.0
