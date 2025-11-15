# Docmosis Template Set Splitting Issue

## Problem Identified

The Python pipeline correctly splits interrogatories into sets, but the Docmosis templates don't respect the set boundaries.

### What's Happening

**Python Payload (CORRECT):**
```json
{
  "SetNumber": 1,
  "SetStart": 1,
  "SetEnd": 120,
  "InterrogatoryStart": 1,
  "InterrogatoryCount": 120,
  "HasMold": true,
  "HasInsects": true,
  // ... only flags that should appear in Set 1
}
```

**Generated Document (INCORRECT):**
- Set 1 shows 126 interrogatories (should be 120)
- Set 2 shows 173 interrogatories (should be 120)
- Set 3 shows 63 interrogatories (should be 18)

### Root Cause

The Docmosis templates (AdmissionsMaster.docx, SROGsMaster.docx, PODsMaster.docx) are rendering **ALL** interrogatories for **ALL** flags present in the payload, regardless of which set they belong to.

## Incorrect Current Approach

The templates likely have logic like this for each interrogatory type:

```
{#if HasMold}
    REQUEST NO. 1: [Mold interrogatory]
    REQUEST NO. 2: [Mold interrogatory]
    ...
{/if}
{#if HasInsects}
    REQUEST NO. 7: [Insects interrogatory]
    ...
{/if}
```

This renders ALL interrogatories for ALL flags, ignoring set boundaries.

## Required Fix

The templates need **interrogatory-level tracking** to ensure each interrogatory knows its number and only renders if within the set's range.

### Approach 1: Tracking Interrogatory Numbers in Template

The template needs a running counter that increments for each interrogatory, and only renders interrogatories within the `SetStart` to `SetEnd` range:

```
{#set interrogatoryNum=InterrogatoryStart}

{#if HasMold}
  {#if interrogatoryNum >= SetStart && interrogatoryNum <= SetEnd}
    REQUEST NO. {interrogatoryNum}: Do you admit that...
  {/if}
  {#set interrogatoryNum=interrogatoryNum+1}

  {#if interrogatoryNum >= SetStart && interrogatoryNum <= SetEnd}
    REQUEST NO. {interrogatoryNum}: Do you further admit that...
  {/if}
  {#set interrogatoryNum=interrogatoryNum+1}
  // ... repeat for all interrogatories in this category
{/if}

{#if HasInsects}
  {#if interrogatoryNum >= SetStart && interrogatoryNum <= SetEnd}
    REQUEST NO. {interrogatoryNum}: Do you admit that insects...
  {/if}
  {#set interrogatoryNum=interrogatoryNum+1}
  // ... continue
{/if}
```

### Approach 2: Python-Side Fix (Better Solution)

Instead of sending all flags to Docmosis and having the template filter them, the Python code should **only include the specific interrogatories for each set** in the payload.

This would involve:
1. Modifying the profiles to define **which specific interrogatories** each flag produces
2. Creating a mapping of interrogatory number → interrogatory text
3. Only sending interrogatories within the `SetStart` to `SetEnd` range to Docmosis

This approach would:
- Make templates simpler
- Reduce payload size
- Ensure perfect accuracy
- Make debugging easier

## Testing Evidence

Analysis of generated documents in `webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS/`:

```
Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx
Expected: 1-120 (120 interrogatories)
Actual: 1-126 (126 interrogatories) ❌

Clark Kent vs Tony Stark - Discovery Request for Admissions Set 2 of 3.docx
Expected: 121-240 (120 interrogatories)
Actual: 121-293 (173 interrogatories) ❌

Clark Kent vs Tony Stark - Discovery Request for Admissions Set 3 of 3.docx
Expected: 241-258 (18 interrogatories)
Actual: 241-303 (63 interrogatories) ❌
```

Total expected: 258 interrogatories
Total actual: 362 interrogatories (40% over!)

## Recommended Solution

**Implement Approach 2** - Modify the Python pipeline to send exact interrogatories:

1. Update `admissions_complete.py`, `srogs_complete.py`, and `pods_complete.py` to define interrogatory templates
2. Create an interrogatory generator that produces the exact text for each numbered interrogatory
3. Modify `set_splitter.py` to build interrogatory lists instead of just flag lists
4. Update webhook payload to include `interrogatories: [{number: 1, text: "..."}, ...]`
5. Simplify Docmosis templates to just iterate over the interrogatories list

This would make the system more maintainable and accurate.

## Files That Need Updates

**For Approach 1 (Template Fix):**
- `/templates/AdmissionsMaster.docx` (Docmosis template)
- `/templates/SROGsMaster.docx` (Docmosis template)
- `/templates/PODsMaster.docx` (Docmosis template)

**For Approach 2 (Python Fix - Recommended):**
- `normalization work/src/phase4/profiles/admissions_complete.py`
- `normalization work/src/phase4/profiles/srogs_complete.py`
- `normalization work/src/phase4/profiles/pods_complete.py`
- `normalization work/src/phase5/set_splitter.py`
- `normalization work/src/phase5/webhook_sender.py`

## Next Steps

1. **Decide on approach** (Template fix vs Python fix)
2. **If Template fix**: Open AdmissionsMaster.docx and add interrogatory counting logic
3. **If Python fix**: Redesign the profile system to generate exact interrogatory text
4. **Test** with the "NEW TEST" case
5. **Verify** interrogatory counts match expectations
