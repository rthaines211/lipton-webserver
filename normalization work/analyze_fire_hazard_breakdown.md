# Fire Hazard Interrogatory Breakdown Analysis

## Actual Template Output for Set 1

Found **11 fire/safety related interrogatories** in the generated document:

### HasFireHazard (aggregate) - Generates 6 interrogatories
- **87**: ADMIT there were FIRE HAZARD PROBLEMS at the PROPERTY
- **88**: ADMIT PLAINTIFF made complaints about FIRE HAZARD PROBLEMS
- **89**: ADMIT YOU never ERADICATED the FIRE HAZARD PROBLEMS
- **91**: ADMIT FIRE HAZARD PROBLEMS made PROPERTY UNTENANTABLE
- **92**: ADMIT DEFENDANTS were collecting more rent than entitled
- **93**: ADMIT FIRE HAZARDS pose severe dangers

### HasNonGfiElectricalOutlets - Generates 1 interrogatory
- **95**: ADMIT PLAINTIFF couldn't use PROPERTY due to nonGFI outlets

### HasSmokeAlarms - Generates 2 interrogatories
- **39**: ADMIT PLAINTIFF couldn't use smoke alarm(s) during TENANCY
- **96**: ADMIT PLAINTIFF couldn't use PROPERTY due to smoke alarm issues

### HasFireExtinguisher - Generates 1 interrogatory
- **97**: ADMIT fire extinguisher issues contributed to anxiety

### HasElectrical (mentions outlets) - 1 interrogatory
- **32**: ADMIT PLAINTIFF couldn't use electrical outlets (this is under HasElectrical, not HasFireHazard)

**Total: 11 interrogatories** (though #32 might be counted under HasElectrical instead)

---

## Comparison

| Source | Count | Notes |
|--------|-------|-------|
| **Discovery Doc Profiles.md (Spec)** | 7 | HasFireHazard should generate 7 |
| **admissions_complete.py (Code)** | 2 | Code says HasFireHazard generates only 2 ❌ |
| **Actual Template Output** | ~6-7 | Template generates 6 interrogatories for HasFireHazard alone |
| **Plus Sub-Flags** | +4 | SmokeAlarms(2) + FireExtinguisher(1) + NonGfiOutlets(1) |
| **Total Fire-Related** | ~10-11 | All fire/safety interrogatories combined |

---

## Current Profile Counts

```python
"HasSmokeAlarms": 1,              # ❌ Actual: 2
"HasFireExtinguisher": 1,         # ✅ Correct
"HasNonCompliantElectricity": 1,  # Not sure if used
"HasNonGfiElectricalOutlets": 1,  # ✅ Correct
"HasCarbonmonoxideDetectors": 1,  # Not present in this test
"HasFireHazard": 2,               # ❌ Actual: 6-7
```

---

## Correct Counts Should Be

```python
"HasFireHazard": 7,               # Matches spec ✅
"HasSmokeAlarms": 2,              # Currently 1 ❌
"HasFireExtinguisher": 1,         # Already correct ✅
"HasNonCompliantElectricity": 1,  # Need to verify
"HasNonGfiElectricalOutlets": 1,  # Already correct ✅
"HasCarbonmonoxideDetectors": 1,  # Need to verify
```

---

## Why This Matters

When Python calculates how many interrogatories fit in Set 1:
- It counts `HasFireHazard` as contributing **2** interrogatories
- But the template actually generates **6-7** interrogatories
- This creates a **+4 to +5 discrepancy** just for this one flag!

Multiply this across all the aggregate flags with incorrect counts, and you get:
- Set 1: Expected 120, got 126 (+6)
- Set 2: Expected 120, got 173 (+53)
- Set 3: Expected 18, got 63 (+45)

The Python splitter thinks it's putting flags in one set, but the template generates way more interrogatories than the Python code thinks, causing overflow into subsequent sets.
