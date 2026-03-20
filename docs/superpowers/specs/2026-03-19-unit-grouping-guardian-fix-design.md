# Unit Grouping & Guardian Fix — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Overview

Two changes to the complaint creator plaintiff handling:
1. Fix guardian dropdown to only show adult (individual) plaintiffs, not other minors
2. Add unit number field to individual plaintiffs when 2+ individuals exist; group plaintiffs by unit in generated document output

## 1. Guardian Dropdown Fix

**File:** `forms/complaint/js/form-logic.js`

In `updateGuardianSelects()`, when iterating other plaintiff blocks to build dropdown options, check the other plaintiff's type select value. Skip if type is `minor`. Only `individual` plaintiffs appear as guardian options.

## 2. Unit Number Field — Form UI

**Files:** `forms/complaint/js/form-logic.js`, `forms/complaint/index.html`, `forms/complaint/styles.css`

### Visibility Rules
- Unit number fields appear when there are **2+ individual plaintiffs**
- Unit number field only appears on **individual** plaintiff blocks, not minors
- Minors inherit their unit from their selected guardian

### Implementation
- New `updateUnitFields()` function in `form-logic.js`:
  - Counts plaintiffs with type = `individual`
  - If 2+ individuals: show unit number input on each individual's block
  - If <2 individuals: hide/remove unit fields from all blocks
- Called from: `addPlaintiff()`, `removePlaintiff()`, type change handler, `reindexPlaintiffs()`
- Type change to `minor` → hide unit field on that block
- Type change to `individual` → show unit field if threshold met

### HTML Structure
- `<div class="unit-number-container" style="display: none;">` added to plaintiff 1 block in `index.html`
- Contains a form-group with text input: `<input type="text" name="plaintiff-N-unit" placeholder="Unit #">`
- Dynamic plaintiff blocks (added via JS) include the same container
- Positioned after the three-col row (first name / last name / type), before the guardian container

## 3. Data Collection

**File:** `forms/complaint/js/form-submission.js`

- `collectFormData()` picks up `plaintiff-N-unit` from each plaintiff block (value will be empty string for minors since they don't have the field)

**File:** `services/complaint-document-generator.js`

- `parseFormData()` adds `unitNumber` to each plaintiff object: `formData[plaintiff-${i}-unit] || ''`

## 4. Document Formatting — Generator Logic

**File:** `services/complaint-document-generator.js`

### Activation
When any plaintiff has a non-empty `unitNumber`, use grouped formatting. Otherwise, fall back to current flat format (semicolon-separated, no "; and").

### Shared Ordering Function
Both `<Plaintiff Names>` and `<Plaintiff Names With Types>` use the same ordered plaintiff list:

1. Resolve minor unit numbers: minor's unit = their guardian's `unitNumber`
2. Group plaintiffs by `unitNumber` (preserving insertion order of first occurrence)
3. Within each group: adults first, then minors
4. Flatten groups into a single ordered list

### Formatting Rules

**`<Plaintiff Names>`** — ALL CAPS names in grouped order, semicolon-separated, "; and" before the last entry:
```
JOHN DOE; JANE DOE; BOB SMITH; and ALICE SMITH
```

**`<Plaintiff Names With Types>`** — ALL CAPS names with type descriptors in grouped order:
- Adults: `FULL NAME, an individual;`
- Minors: `FULL NAME, minor by and through Guardian Ad Litem, [GUARDIAN NAME];`
- Semicolons between entries, `"; and"` before the final entry

Example (2 units):
```
JOHN DOE, an individual;
JANE DOE, minor by and through Guardian Ad Litem, JOHN DOE;
BOB SMITH, an individual; and
ALICE SMITH, minor by and through Guardian Ad Litem, BOB SMITH
```

### Edge Cases
- Minor with no guardian or guardian has no unit: placed in an "ungrouped" bucket, appended at the end
- Single unit (all plaintiffs same unit number): grouped format still applies (adults first, "; and" before last)
- No unit numbers present (1 individual or fields not shown): fall back to current flat format

## 5. Files Modified

| File | Change |
|------|--------|
| `forms/complaint/js/form-logic.js` | Filter minors from guardian dropdown; add `updateUnitFields()` with show/hide logic; call from add/remove/type-change |
| `forms/complaint/index.html` | Add hidden unit number container to plaintiff 1 block |
| `forms/complaint/js/form-submission.js` | Collect `plaintiff-N-unit` for each plaintiff block |
| `services/complaint-document-generator.js` | Parse `unitNumber`; shared ordering function; update `<Plaintiff Names>` and `<Plaintiff Names With Types>` |
| `forms/complaint/styles.css` | Styling for unit number container (if needed) |

No new files created.
