# Quick Start: Manual Validation of Form Submissions

This is a simplified guide to get you started validating form submissions quickly. For comprehensive details, see [MANUAL_VALIDATION_PLAN.md](MANUAL_VALIDATION_PLAN.md).

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Pick a Form to Validate

```bash
cd "normalization work"
venv/bin/python3 validate_form.py --list
```

This shows the 10 most recent form submissions.

### Step 2: Run the Pipeline

```bash
# Copy any form to test with (or use the one already there)
cp "../data/form-entry-1762795845839-a71rqbo8i.json" formtest.json

# Run the pipeline
venv/bin/python3 run_pipeline.py
```

**Output**: Creates 5 timestamped files:
- `output_phase1_[timestamp].json` - Normalized data
- `output_phase2_[timestamp].json` - Datasets (HoH × Defendants)
- `output_phase3_[timestamp].json` - Boolean flags
- `output_phase4_[timestamp].json` - Profile filtering
- `output_phase5_[timestamp].json` - Set splitting

### Step 3: Generate Validation Summary

```bash
venv/bin/python3 validation_summary.py
```

This creates a human-readable report showing:
- ✅ Issues selected in the form
- ✅ Discovery arrays extracted (Phase 1)
- ✅ Flags generated (Phase 3)
- ✅ Profile counts (Phase 4)
- ✅ Set information (Phase 5)

---

## 🔍 What to Look For

### Critical Validation Points

#### 1. **Form → Phase 1**: Discovery Arrays Match
Look at the validation summary output. You should see:
```
✅ vermin: 6 items match
✅ insects: 10 items match
✅ plumbing: 15 items match
```

**If you see ❌**: The discovery flattening failed for that category.

#### 2. **Phase 1 → Phase 3**: Flags Are Set

For every issue selected, specific flags should be `true`. Common mappings:

| Form Selection | Expected Flag(s) |
|----------------|------------------|
| Vermin: Rats/Mice | `HasRatsMice`, `HasVermin` |
| Insects: Roaches | `HasRoaches` |
| Insects: Bedbugs | `HasBedbugs` |
| HVAC: Air Conditioner | `HasAC`, `HasHVAC` |
| Plumbing: Sewage coming out | `HasSewageComingOut`, `HasPlumbingIssues` |
| Plumbing: Leaks | `HasLeaks`, `HasPlumbingIssues` |
| Health hazard: Mold | `HasMold`, `HasHealthHazardIssues` |
| Doors: Broken | `HasBrokenDoors`, `HasDoorIssues` |

**Check the validation summary** - it groups flags by category so you can spot-check.

#### 3. **Phase 3 → Phase 4**: Interrogatory Counts Make Sense

For a typical case with many issues selected, expect:

**SROGs**:
- Base: `SROGsGeneral (56)` + `IsManager/IsOwner (20-22)` = ~76
- Each major issue adds: 10-24 interrogatories
- **Typical total**: 300-1,500 interrogatories

**PODs**:
- Base: `PODsGeneral` + role flags
- Each issue adds: 3-10 documents
- **Typical total**: 100-500 documents

**Admissions**:
- Base: `AdmissionsGeneral` + role flags
- Each issue adds: 2-8 admissions
- **Typical total**: 80-300 admissions

#### 4. **Phase 4 → Phase 5**: Set Splitting Is Correct

California law limits **120 interrogatories per set**.

**For SROGs with 1,502 interrogatories**:
- Expected sets: 1,502 ÷ 120 = 13 sets
- Set 1 should include: `SROGsGeneral`, `IsManager`/`IsOwner` (first-set-only flags)
- Sets 2-13: Remaining issue-specific interrogatories

---

## 📊 Manual Validation Checklist

Print this and check off as you validate:

### Form Submission (formtest.json)
- [ ] Has at least one plaintiff with `HeadOfHousehold: true`
- [ ] Has at least one defendant
- [ ] HoH plaintiff has `PlaintiffItemNumberDiscovery` object
- [ ] Discovery object has issue arrays (e.g., `Vermin`, `Insects`)

### Phase 1 Output
- [ ] Plaintiff count matches form
- [ ] Defendant count matches form
- [ ] Discovery arrays extracted correctly (check validation summary)
- [ ] No mismatch errors for selected issues

### Phase 2 Output
- [ ] Dataset count = (# HoH Plaintiffs) × (# Defendants)
- [ ] Each dataset has one plaintiff + one defendant
- [ ] Discovery data present in each dataset

### Phase 3 Output
- [ ] Boolean flags set for selected issues
- [ ] Aggregate flags set (e.g., `HasVermin`, `HasPlumbingIssues`)
- [ ] Defendant role flag set (`IsManager` or `IsOwner`)
- [ ] Total true flags: 100-150 typical for complex case

### Phase 4 Output
- [ ] Profile datasets created (SROGs, PODs, Admissions)
- [ ] Interrogatory counts present for each profile
- [ ] Total SROGs interrogatories: 300-1,500 typical
- [ ] Flags with count = 0 are excluded

### Phase 5 Output
- [ ] Sets created based on 120 interrogatory limit
- [ ] Set 1 includes first-set-only flags
- [ ] Set 2+ do NOT include first-set-only flags
- [ ] Sum of set counts = Phase 4 total
- [ ] Filenames formatted correctly

---

## 🐛 Common Issues

### Issue: "government" or "trash" arrays show MISMATCH

**Cause**: These field names don't exactly match between form and Phase 1 normalizer.

**Check**:
```bash
cd "normalization work"
# Check form field name
cat formtest.json | grep -A2 "Government\|Trash"

# Check Phase 1 output
cat output_phase1_*.json | grep -A2 "government\|trash"
```

**Fix**: Update the field mapping in `src/phase1/discovery_flattener.py`

### Issue: Phase 4 shows 0 profiles or missing data

**Cause**: The document types may not have been selected, or profile structure changed.

**Check**:
```bash
# Check Phase 4 structure
cd "normalization work"
cat output_phase4_*.json | python3 -m json.tool | head -50
```

### Issue: Set count doesn't match expected

**Expected Formula**:
```
Sets = ceiling(Total Interrogatories / 120)
```

**Check**:
```bash
cd "normalization work"
# Get total interrogatories from Phase 4
cat output_phase4_*.json | python3 -c "import json, sys; data=json.load(sys.stdin); print(sum(data['datasets'][0]['srogs']['interrogatory_counts'].values()))"

# Get actual set count from Phase 5
cat output_phase5_*.json | python3 -c "import json, sys; data=json.load(sys.stdin); print(len(data['datasets'][0]['srogs']['sets']))"
```

---

## 📁 Example: Validating Form `form-entry-1762795845839-a71rqbo8i.json`

This form has:
- 1 Head of Household plaintiff: Clark Kent
- 1 Defendant: htd ewt (Manager)
- 15 issue categories selected
- Comprehensive issues: Vermin, Insects, HVAC, Plumbing, Health Hazards, Structure, etc.

### Expected Results:

**Phase 1**:
- ✅ 1 plaintiff extracted
- ✅ 1 defendant extracted
- ✅ 15 discovery arrays with items

**Phase 2**:
- ✅ 1 dataset (1 HoH × 1 Defendant)

**Phase 3**:
- ✅ 130 flags set to true
- ✅ Key flags: `HasRatsMice`, `HasMold`, `HasSewageComingOut`, `HasBrokenDoors`, `IsManager`

**Phase 4 (SROGs)**:
- ✅ 1,502 total interrogatories
- ✅ Top counts:
  - `SROGsGeneral`: 56
  - `HasMold`: 24
  - `IsOwner`: 22
  - `IsManager`: 20
  - `HasVermin`: 20

**Phase 5 (SROGs)**:
- ✅ Expected: 13 sets (1,502 ÷ 120 = 12.5 → round up to 13)
- ✅ Set 1: Includes `SROGsGeneral` and `IsManager`
- ✅ Sets 2-13: Issue-specific interrogatories

### Validation Workflow:

1. **Copy the form**:
   ```bash
   cd "normalization work"
   cp "../data/form-entry-1762795845839-a71rqbo8i.json" formtest.json
   ```

2. **Run pipeline**:
   ```bash
   venv/bin/python3 run_pipeline.py
   ```

3. **Generate summary**:
   ```bash
   venv/bin/python3 validation_summary.py
   ```

4. **Spot-check key mappings**:
   - Look for "Vermin: Rats/Mice" in form → `HasRatsMice` in Phase 3
   - Look for "Health hazard: Mold" → `HasMold: 24` in Phase 4 SROGs
   - Look for "Plumbing: Sewage coming out" → `HasSewageComingOut: 15` in Phase 4

5. **Verify totals**:
   ```bash
   # Check SROGS total
   cat output_phase4_20251110_130213.json | python3 -c "import json, sys; data=json.load(sys.stdin); print('SROGs:', sum(data['datasets'][0]['srogs']['interrogatory_counts'].values()))"

   # Check set count
   cat output_phase5_20251110_130213.json | python3 -c "import json, sys; data=json.load(sys.stdin); print('Sets:', len(data['datasets'][0]['srogs']['sets']))"
   ```

---

## 🎯 High-Impact Issues to Always Check

These issues have the highest interrogatory counts and should always be verified:

1. **Mold** (24 SROGs) - Highest single issue count
2. **Security Deposit** (20 SROGs) - Second highest
3. **Rats/Mice** (18 SROGs) - Common pest issue
4. **Elevator** (18 SROGs) - Common area issue
5. **Broken Doors** (17 SROGs) - Habitability issue
6. **Harassment** (16 SROGs aggregate) - Serious tenant issue
7. **Sewage Coming Out** (15 SROGs) - Health hazard
8. **Health Hazard Issues** (15 SROGs aggregate) - Aggregate flag

**How to Check**:
1. Look at form: Is the issue selected?
2. Check Phase 1: Is it in the discovery array?
3. Check Phase 3: Is the flag set to true?
4. Check Phase 4 SROGs: Is the count correct? (e.g., `HasMold: 24`)
5. Check Phase 5: Are those interrogatories distributed across sets?

---

## 📝 Recording Your Validation

Create a simple spreadsheet:

| Issue | Form? | Phase 1? | Phase 3 Flag? | Phase 4 Count | Expected Count | Match? |
|-------|-------|----------|---------------|---------------|----------------|--------|
| Mold | ✓ | ✓ | HasMold: true | 24 | 24 | ✓ |
| Rats/Mice | ✓ | ✓ | HasRatsMice: true | 18 | 18 | ✓ |
| Sewage | ✓ | ✓ | HasSewageComingOut: true | 15 | 15 | ✓ |

Or use the comprehensive checklist in [MANUAL_VALIDATION_PLAN.md](MANUAL_VALIDATION_PLAN.md) (Section 7).

---

## 🔗 Quick Reference

### File Locations
- **Form submissions**: `/Users/ryanhaines/Desktop/Lipton Webserver/data/form-entry-*.json`
- **Test input**: `normalization work/formtest.json`
- **Phase outputs**: `normalization work/output_phase[1-5]_[timestamp].json`
- **Profile definitions**: `normalization work/src/phase4/profiles/*.py`

### Helper Scripts
- **List forms**: `venv/bin/python3 validate_form.py --list`
- **Run pipeline**: `venv/bin/python3 run_pipeline.py`
- **Generate summary**: `venv/bin/python3 validation_summary.py`

### Key Commands
```bash
# Get SROGS total interrogatories
cat output_phase4_*.json | python3 -c "import json, sys; data=json.load(sys.stdin); print(sum(data['datasets'][0]['srogs']['interrogatory_counts'].values()))"

# Get set count
cat output_phase5_*.json | python3 -c "import json, sys; data=json.load(sys.stdin); print(len(data['datasets'][0]['srogs']['sets']))"

# List all true flags
cat output_phase3_*.json | python3 -c "import json, sys; data=json.load(sys.stdin); flags=[k for k,v in data['datasets'][0]['flags'].items() if v]; print('\n'.join(sorted(flags)))"
```

---

## ✅ You're Ready!

You now have:
1. ✅ **MANUAL_VALIDATION_PLAN.md** - Comprehensive 600+ line validation guide
2. ✅ **VALIDATION_QUICK_START.md** (this file) - Quick reference for daily use
3. ✅ **validate_form.py** - Helper script to run pipeline on any form
4. ✅ **validation_summary.py** - Generates human-readable validation reports
5. ✅ Working pipeline that processes forms through all 5 phases

### Next Steps:
1. Run validation on 3-5 different forms to get familiar with the process
2. Document any patterns or issues you find
3. Use the comprehensive plan for edge cases or deep-dive validation

**Happy validating!** 🎉
