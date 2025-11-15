# Phase 4.5: Profile Consolidation

## Overview

Phase 4.5 creates **master JSON files** that consolidate all datasets by document profile type. This allows you to view all interrogatories, flags, and relevant information for a specific document type (SROGs, PODs, or Admissions) in a single comprehensive document.

## Purpose

In cases with multiple plaintiff-defendant pairs, Phase 4 creates separate profile datasets for each pair. Phase 4.5 consolidates these into master documents that show:

1. **All interrogatories across all pairs** for each profile type
2. **Which flags appear in which datasets**
3. **How many datasets use each flag**
4. **Top interrogatory counts** across all pairs
5. **Summary statistics** for the entire case

## Output Files

Phase 4.5 generates three master files (timestamped):

```
master_srogs_[timestamp].json      - SROGs consolidated master
master_pods_[timestamp].json       - PODs consolidated master
master_admissions_[timestamp].json - Admissions consolidated master
```

## Use Cases

### 1. **Reviewing All Interrogatories**
View all SROGs interrogatories for the entire case in one document, rather than jumping between multiple plaintiff-defendant pair files.

### 2. **Cross-Dataset Analysis**
See which flags are used by all datasets vs. only some datasets:
- `flags_used_by_all_datasets: 190` - All pairs have these flags
- `flags_used_by_some_datasets: 0` - Only some pairs have these flags

### 3. **Case-Wide Statistics**
Get aggregate statistics across all plaintiff-defendant pairs:
- Total interrogatories for the entire case
- Average interrogatories per plaintiff-defendant pair
- Total unique flags used
- Plaintiff-defendant pairs involved

### 4. **High-Value Flag Identification**
Quickly identify the top 20 flags by interrogatory count to understand which issues generate the most discovery requests.

## JSON Structure

```json
{
  "doc_type": "SROGS",
  "profile_key": "srogs",

  "datasets": [
    {
      "dataset_id": "1-eXV5dZ-XkoTBi-srogs",
      "plaintiff": {...},
      "defendant": {...},
      "pair_name": "Clark Kent vs htd ewt",
      "interrogatory_count": 1502,
      "flag_count": 190,
      "flags": {
        "SROGsGeneral": 56,
        "HasMold": 24,
        "IsOwner": 22,
        ...
      },
      "case_metadata": {...},
      "template_name": "...",
      "filename_suffix": "..."
    }
  ],

  "consolidated_flags": {
    "SROGsGeneral": {
      "count": 56,
      "datasets_present": 1,
      "dataset_ids": ["1-eXV5dZ-XkoTBi-srogs"],
      "plaintiff_defendant_pairs": ["Clark Kent vs htd ewt"]
    },
    ...
  },

  "top_20_flags": [
    {"flag": "SROGsGeneral", "count": 56},
    {"flag": "HasMold", "count": 24},
    {"flag": "IsOwner", "count": 22},
    ...
  ],

  "summary": {
    "total_datasets": 1,
    "total_interrogatories": 1502,
    "average_interrogatories_per_dataset": 1502.0,
    "total_unique_flags": 190,
    "flags_used_by_all_datasets": 190,
    "flags_used_by_some_datasets": 0,
    "plaintiff_defendant_pairs": ["Clark Kent vs htd ewt"]
  },

  "metadata": {
    "phase": "4.5",
    "description": "Consolidated SROGS profile across all plaintiff-defendant pairs",
    "template_name": "SROGsMaster.docx"
  }
}
```

## Key Fields Explained

### `datasets` Array
Contains a summary for each plaintiff-defendant pair dataset:
- `dataset_id`: Unique identifier for this pair's profile
- `plaintiff`/`defendant`: Party information
- `pair_name`: Human-readable "Plaintiff vs Defendant" format
- `interrogatory_count`: Total interrogatories for this pair
- `flag_count`: Number of flags (should match total unique flags)
- `flags`: All flags with their interrogatory counts

### `consolidated_flags` Object
Cross-dataset flag analysis:
- `count`: Number of interrogatories for this flag (same across all datasets)
- `datasets_present`: How many plaintiff-defendant pairs use this flag
- `dataset_ids`: Array of dataset IDs that use this flag
- `plaintiff_defendant_pairs`: Array of pair names that use this flag

**Example:** If HasMold appears in 3 out of 4 datasets:
```json
"HasMold": {
  "count": 24,
  "datasets_present": 3,
  "dataset_ids": ["1-abc-def-srogs", "2-ghi-jkl-srogs", "3-mno-pqr-srogs"],
  "plaintiff_defendant_pairs": [
    "John Doe vs ABC Corp",
    "Jane Smith vs ABC Corp",
    "Bob Jones vs ABC Corp"
  ]
}
```

### `top_20_flags` Array
The 20 flags with the highest interrogatory counts, sorted descending. Useful for quickly identifying the most impactful issues in the case.

### `summary` Object
High-level statistics:
- `total_datasets`: Number of plaintiff-defendant pairs
- `total_interrogatories`: Sum of all interrogatories across all pairs
- `average_interrogatories_per_dataset`: Mean interrogatories per pair
- `total_unique_flags`: Number of distinct flags used
- `flags_used_by_all_datasets`: Flags present in every single dataset
- `flags_used_by_some_datasets`: Flags present in only some datasets
- `plaintiff_defendant_pairs`: List of all pairs (unique names)

## Example: Multi-Pair Case

For a case with 2 Head of Household plaintiffs × 2 Defendants = 4 datasets:

**Phase 4 Output:**
```
datasets: [
  {plaintiff: "John Doe", defendant: "ABC Corp", srogs: {...}},
  {plaintiff: "John Doe", defendant: "XYZ LLC", srogs: {...}},
  {plaintiff: "Jane Smith", defendant: "ABC Corp", srogs: {...}},
  {plaintiff: "Jane Smith", defendant: "XYZ LLC", srogs: {...}}
]
```

**Phase 4.5 Output (master_srogs.json):**
```json
{
  "doc_type": "SROGS",
  "datasets": [
    {
      "pair_name": "John Doe vs ABC Corp",
      "interrogatory_count": 1502,
      "flags": {...}
    },
    {
      "pair_name": "John Doe vs XYZ LLC",
      "interrogatory_count": 1450,
      "flags": {...}
    },
    {
      "pair_name": "Jane Smith vs ABC Corp",
      "interrogatory_count": 1502,
      "flags": {...}
    },
    {
      "pair_name": "Jane Smith vs XYZ LLC",
      "interrogatory_count": 1450,
      "flags": {...}
    }
  ],
  "consolidated_flags": {
    "SROGsGeneral": {
      "count": 56,
      "datasets_present": 4,
      "plaintiff_defendant_pairs": [
        "John Doe vs ABC Corp",
        "John Doe vs XYZ LLC",
        "Jane Smith vs ABC Corp",
        "Jane Smith vs XYZ LLC"
      ]
    },
    "HasMold": {
      "count": 24,
      "datasets_present": 2,
      "plaintiff_defendant_pairs": [
        "John Doe vs ABC Corp",
        "Jane Smith vs ABC Corp"
      ]
    }
  },
  "summary": {
    "total_datasets": 4,
    "total_interrogatories": 5904,
    "average_interrogatories_per_dataset": 1476.0,
    "total_unique_flags": 190,
    "flags_used_by_all_datasets": 78,
    "flags_used_by_some_datasets": 112,
    "plaintiff_defendant_pairs": [
      "John Doe vs ABC Corp",
      "John Doe vs XYZ LLC",
      "Jane Smith vs ABC Corp",
      "Jane Smith vs XYZ LLC"
    ]
  }
}
```

Notice how Phase 4.5 shows:
- `SROGsGeneral` is used by all 4 datasets (base interrogatories)
- `HasMold` is only used by 2 datasets (only ABC Corp units have mold)
- Total interrogatories: 5,904 across all 4 plaintiff-defendant pairs

## Pipeline Integration

Phase 4.5 runs automatically between Phase 4 and Phase 5:

```
Phase 1: Input Normalization
  ↓
Phase 2: Dataset Builder (HoH × Defendants)
  ↓
Phase 3: Flag Processing (180+ boolean flags)
  ↓
Phase 4: Document Profiles (SROGs, PODs, Admissions)
  ↓
Phase 4.5: Profile Consolidation ← NEW
  ↓
Phase 5: Set Splitting (max 120 interrogatories per set)
```

## Running the Pipeline

```bash
cd "normalization work"
venv/bin/python3 run_pipeline.py
```

The pipeline will automatically:
1. Run Phases 1-4 as normal
2. Consolidate Phase 4 output by profile type
3. Save three master files: `master_srogs_*.json`, `master_pods_*.json`, `master_admissions_*.json`
4. Continue with Phase 5 set splitting

## Console Output

When Phase 4.5 runs, you'll see:

```
======================================================================
  PHASE 4.5: PROFILE CONSOLIDATION
======================================================================
ℹ️  Consolidating datasets by document profile type...
✅ Phase 4.5 complete!
   - SROGS: 4 datasets, 5904 total interrogatories, 190 unique flags
   - PODS: 4 datasets, 1356 total interrogatories, 190 unique flags
   - ADMISSIONS: 4 datasets, 1020 total interrogatories, 190 unique flags
ℹ️  Saved to: master_srogs_20251110_141253.json
ℹ️  Saved to: master_pods_20251110_141253.json
ℹ️  Saved to: master_admissions_20251110_141253.json
```

## Validation Use Cases

Phase 4.5 master files are extremely useful for validation:

### 1. Verify Cross-Pair Consistency
Check if the same flag has the same interrogatory count across all datasets:
```bash
cat master_srogs_*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for flag, info in data['consolidated_flags'].items():
    if info['datasets_present'] > 1:
        print(f'{flag}: used by {info[\"datasets_present\"]} datasets')
"
```

### 2. Identify Missing Flags
Find flags that should be used by all datasets but aren't:
```bash
cat master_srogs_*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
total_datasets = data['summary']['total_datasets']
for flag, info in data['consolidated_flags'].items():
    if info['datasets_present'] < total_datasets:
        missing_count = total_datasets - info['datasets_present']
        print(f'{flag}: missing from {missing_count} datasets')
"
```

### 3. Calculate Case-Wide Interrogatory Totals
```bash
cat master_srogs_*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"Total SROGs: {data['summary']['total_interrogatories']}\")
print(f\"Average per pair: {data['summary']['average_interrogatories_per_dataset']:.0f}\")
"
```

### 4. List Top Issues
```bash
cat master_srogs_*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Top 10 Issues by Interrogatory Count:')
for i, flag_data in enumerate(data['top_20_flags'][:10], 1):
    print(f'{i}. {flag_data[\"flag\"]}: {flag_data[\"count\"]} interrogatories')
"
```

## Benefits

1. **Single Source of Truth**: One file per profile type shows everything
2. **Cross-Dataset Analysis**: Understand patterns across multiple plaintiff-defendant pairs
3. **Validation Support**: Easier to spot inconsistencies and missing data
4. **Case Metrics**: Aggregate statistics for the entire case
5. **High-Value Identification**: Quickly see which issues generate the most discovery

## Implementation

Phase 4.5 is implemented in [src/phase4_5/consolidator.py](src/phase4_5/consolidator.py):

- `consolidate_profiles(phase4_output)` - Main consolidation function
- Groups Phase 4 datasets by profile type (srogs, pods, admissions)
- Consolidates flag information across all plaintiff-defendant pairs
- Calculates summary statistics
- Returns master document for each profile

## Related Files

- [run_pipeline.py](run_pipeline.py) - Pipeline runner with Phase 4.5 integration
- [src/phase4_5/__init__.py](src/phase4_5/__init__.py) - Phase 4.5 module
- [src/phase4_5/consolidator.py](src/phase4_5/consolidator.py) - Consolidation logic
- [MANUAL_VALIDATION_PLAN.md](MANUAL_VALIDATION_PLAN.md) - Comprehensive validation guide
- [VALIDATION_QUICK_START.md](VALIDATION_QUICK_START.md) - Quick validation reference

---

**Phase 4.5 was added on November 10, 2025** to provide a consolidated view of all interrogatories and flags across multiple plaintiff-defendant pairs, making validation and case analysis significantly easier.
