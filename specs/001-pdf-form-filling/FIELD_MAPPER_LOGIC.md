# PDF Field Mapper - Implementation Logic

**Task**: T020 - Implement mapFormDataToPdfFields()
**Purpose**: Transform form submission JSON → PDF field values for CM-110.pdf

---

## Overview

The field mapper will read form submission JSON, apply transforms, and output a flat object with PDF field names as keys and their values.

### Input
```javascript
{
  "PlaintiffDetails": [{...}],
  "DefendantDetails2": [{...}],
  "Full_Address": {...},
  "Filing city": "Los Angeles",
  "Filing county": "North Carolina",
  // ... other fields
}
```

### Output
```javascript
{
  "CM-110[0].Page1[0].P1Caption[0].captionSub[0].CaseNumber[0].caseNumber[0]": "CASE-12345",
  "CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1[0]": "Clark Kent",
  "CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2[0]": "Master sdaf",
  "CM-110[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]": "North Carolina",
  // ... 204 total fields
}
```

---

## Field Mapping Plan

### 1. Case Number Fields (5 fields - all 5 pages)
**Source**: `formData.caseNumber` (⚠️ **ISSUE**: Not in sample data!)

| PDF Field | Value | Notes |
|-----------|-------|-------|
| `CM-110[0].Page1[0].P1Caption[0].captionSub[0].CaseNumber[0].caseNumber[0]` | Case number | **Required** |
| `CM-110[0].Page2[0].PxCaption[0].CaseNumber[0].caseNumber[0]` | Same value | Repeat on page 2 |
| `CM-110[0].Page3[0].PxCaption[0].CaseNumber[0].caseNumber[0]` | Same value | Repeat on page 3 |
| `CM-110[0].Page4[0].PxCaption[0].CaseNumber[0].caseNumber[0]` | Same value | Repeat on page 4 |
| `CM-110[0].Page5[0].PxCaption[0].CaseNumber[0].caseNumber[0]` | Same value | Repeat on page 5 |

**❓ QUESTION**: Where does case number come from? Should we:
- Generate it automatically (timestamp-based)?
- Pull from database auto-increment?
- Leave blank for court to assign?

---

### 2. Plaintiff Fields (5 fields - all 5 pages)
**Source**: `formData.PlaintiffDetails[*].PlaintiffItemNumberName.FirstAndLast`
**Transform**: `joinMultipleParties` (semicolon-separated)

**Example Data**:
```javascript
PlaintiffDetails: [
  { PlaintiffItemNumberName: { FirstAndLast: "Clark Kent" } }
]
```

**Mapped Values**:
```javascript
"CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1[0]": "Clark Kent"
"CM-110[0].Page2[0].PxCaption[0].TitlePartyName[0].Party1[0]": "Clark Kent"
"CM-110[0].Page3[0].PxCaption[0].TitlePartyName[0].Party1[0]": "Clark Kent"
"CM-110[0].Page4[0].PxCaption[0].TitlePartyName[0].Party1[0]": "Clark Kent"
"CM-110[0].Page5[0].PxCaption[0].TitlePartyName[0].Party1[0]": "Clark Kent"
```

**Multi-party example**:
```javascript
PlaintiffDetails: [
  { PlaintiffItemNumberName: { FirstAndLast: "Clark Kent" } },
  { PlaintiffItemNumberName: { FirstAndLast: "Bruce Wayne" } }
]
// Result: "Clark Kent; Bruce Wayne"
```

---

### 3. Defendant Fields (5 fields - all 5 pages)
**Source**: `formData.DefendantDetails2[*].DefendantItemNumberName.FirstAndLast`
**Transform**: `joinMultipleParties`

**Example Data**:
```javascript
DefendantDetails2: [
  { DefendantItemNumberName: { FirstAndLast: "Master sdaf" } }
]
```

**Mapped Values**:
```javascript
"CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2[0]": "Master sdaf"
"CM-110[0].Page2[0].PxCaption[0].TitlePartyName[0].Party2[0]": "Master sdaf"
// ... same for pages 3, 4, 5
```

---

### 4. Court Fields (5 fields - Page 1 only)
**Sources**: Multiple

| PDF Field | Source | Value from Sample | Transform |
|-----------|--------|-------------------|-----------|
| `CourtInfo[0].CrtCounty[0]` | `Filing county` | "North Carolina" | None |
| `CourtInfo[0].CrtCityZip[0]` | `Filing city` | "Los Angeles" | `cityZipFormat` (⚠️ need zip?) |
| `CourtInfo[0].CrtStreet[0]` | `courtStreetAddress` | ❌ Not in data | Skip |
| `CourtInfo[0].CrtMailingAdd[0]` | `courtMailingAddress` | ❌ Not in data | Skip |
| `CourtInfo[0].CrtBranch[0]` | `courtBranch` | ❌ Not in data | Skip |

**❓ QUESTION**: For `cityZipFormat`, config expects both city and zip, but we only have city in sample data. Should we:
- Just use city alone?
- Look up zip from another source?
- Skip the transform?

---

### 5. Attorney Fields (11 fields - Page 1 only)
**Sources**: `attorneyBarNumber`, `attorneyName`, etc.

**⚠️ ALL MISSING FROM SAMPLE DATA**

These are optional fields (for self-represented litigants). Will skip if not present.

| PDF Field | Source | Status |
|-----------|--------|--------|
| `AttyPartyInfo[0].AttyBarNo[0]` | `attorneyBarNumber` | ❌ Missing - Skip |
| `AttyPartyInfo[0].Name[0]` | `attorneyName` | ❌ Missing - Skip |
| `AttyPartyInfo[0].AttyFirm[0]` | `attorneyFirm` | ❌ Missing - Skip |
| ... (all 11 fields) | ... | ❌ All missing |

---

### 6. Case Type Fields (2 checkboxes - Page 1)
**Source**: `formData.caseType`

**⚠️ MISSING FROM SAMPLE DATA**

| PDF Field | Condition | Notes |
|-----------|-----------|-------|
| `FormTitle[0].limit12[0]` | `caseType === 'unlimited'` | Amount > $35,000 |
| `FormTitle[0].limit12[1]` | `caseType === 'limited'` | Amount ≤ $35,000 |

**❓ QUESTION**: Should we default to 'limited' if not specified?

---

### 7. Party Statement Fields (3 fields - Page 1)
**Sources**: Multiple

| PDF Field | Source | Value from Sample | Notes |
|-----------|--------|-------------------|-------|
| `List1[0].Lia[0].TextField2[0]` | `PlaintiffDetails[0].PlaintiffItemNumberName.FirstAndLast` | "Clark Kent" | ✅ Available |
| `List2[0].Lia[0].Date3[0]` | `complaintFiledDate` | ❌ Not in data | Skip (court fills?) |
| `List2[0].Lib[0].Date4[0]` | `crossComplaintFiledDate` | ❌ Not in data | Skip |

---

### 8. Case Management Fields (5 fields - Page 1)
**Sources**: Conference date/time, department, division, room

**⚠️ ALL MISSING FROM SAMPLE DATA**

These are typically filled by the court, not by the plaintiff. Will skip if not present.

---

## Transform Functions Implementation

### 1. `joinMultipleParties(parties)`
```javascript
// Input: PlaintiffDetails array or DefendantDetails2 array
// Output: "Party1; Party2; Party3"

function joinMultipleParties(parties) {
  if (!Array.isArray(parties) || parties.length === 0) return '';

  const names = parties
    .map(party => {
      // Handle both PlaintiffDetails and DefendantDetails2 structures
      const nameObj = party.PlaintiffItemNumberName || party.DefendantItemNumberName;
      return nameObj?.FirstAndLast || '';
    })
    .filter(name => name.length > 0);

  return names.join('; ');
}
```

**Test cases**:
- Single party: `["Clark Kent"]` → `"Clark Kent"`
- Multiple parties: `["Clark Kent", "Bruce Wayne"]` → `"Clark Kent; Bruce Wayne"`
- Empty array: `[]` → `""`

---

### 2. `arrayToCommaList(array)`
```javascript
// Input: ["Rats/Mice", "Skunks", "Bats"]
// Output: "Rats/Mice, Skunks, Bats"

function arrayToCommaList(array) {
  if (!Array.isArray(array) || array.length === 0) return '';
  return array.filter(item => item).join(', ');
}
```

**Use case**: Discovery issues like Vermin, Insects

---

### 3. `cityZipFormat(city, zip)`
```javascript
// Input: city = "Los Angeles", zip = "90001"
// Output: "Los Angeles 90001"

function cityZipFormat(city, zip) {
  if (!city && !zip) return '';
  if (!zip) return city || '';
  if (!city) return zip || '';
  return `${city} ${zip}`;
}
```

**⚠️ ISSUE**: Config specifies `source: "Filing city"` but transform needs both city and zip.

---

### 4. `fullName(nameObject)`
```javascript
// Input: { First: "Clark", Middle: "J", Last: "Kent", Prefix: "Mr", Suffix: "Jr" }
// Output: "Mr Clark J Kent Jr"

function fullName(nameObject) {
  if (!nameObject) return '';

  const parts = [
    nameObject.Prefix,
    nameObject.First,
    nameObject.Middle,
    nameObject.Last,
    nameObject.Suffix
  ].filter(part => part && part.length > 0);

  return parts.join(' ');
}
```

**Note**: Sample data has `FirstAndLast` pre-formatted, so this may not be needed for plaintiffs/defendants.

---

## JSON Path Resolution

For nested sources like `PlaintiffDetails[*].PlaintiffItemNumberName.FirstAndLast`:

```javascript
function resolveJsonPath(data, path) {
  // Handle array wildcard: PlaintiffDetails[*].FieldName
  if (path.includes('[*]')) {
    const [arrayPath, fieldPath] = path.split('[*].');
    const array = getNestedValue(data, arrayPath);
    if (!Array.isArray(array)) return null;
    return array.map(item => getNestedValue(item, fieldPath));
  }

  // Handle simple nested path: Full_Address.City
  return getNestedValue(data, path);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}
```

**Examples**:
- `"Filing county"` → Direct access: `data["Filing county"]`
- `"Full_Address.City"` → Nested: `data.Full_Address.City`
- `"PlaintiffDetails[*].PlaintiffItemNumberName.FirstAndLast"` → Array map

---

## Field Truncation Logic (T021)

```javascript
function truncateField(value, maxLength) {
  if (!value || typeof value !== 'string') return value;
  if (!maxLength || value.length <= maxLength) return value;

  // Truncate at word boundary if possible
  const truncated = value.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a space in the last 20% of the string, break there
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Otherwise hard truncate with ellipsis
  return truncated.substring(0, maxLength - 3) + '...';
}
```

---

## Error Handling

### Required Field Missing
```javascript
if (fieldConfig.required && !value) {
  throw new Error(`Required field missing: ${fieldConfig.source} for PDF field ${fieldConfig.pdfField}`);
}
```

### Invalid Transform
```javascript
if (fieldConfig.transform && !transforms[fieldConfig.transform]) {
  console.warn(`Unknown transform: ${fieldConfig.transform} for field ${fieldConfig.pdfField}`);
  // Proceed without transform
}
```

### JSON Path Resolution Failure
```javascript
const value = resolveJsonPath(formData, fieldConfig.source);
if (value === undefined || value === null) {
  console.debug(`No value found for ${fieldConfig.source}`);
  // Skip field (don't add to output)
  continue;
}
```

---

## Main Mapping Function Structure

```javascript
function mapFormDataToPdfFields(formData, fieldMappingConfig) {
  const pdfFields = {};

  // 1. Map case number fields (all 5 pages)
  for (const [key, config] of Object.entries(fieldMappingConfig.caseNumberFields)) {
    if (key === 'description') continue;
    const value = resolveAndTransform(formData, config);
    if (value) pdfFields[config.pdfField] = truncateField(value, config.maxLength);
  }

  // 2. Map plaintiff fields (all 5 pages)
  for (const [key, config] of Object.entries(fieldMappingConfig.plaintiffFields)) {
    if (key === 'description') continue;
    const value = resolveAndTransform(formData, config);
    if (value) pdfFields[config.pdfField] = truncateField(value, config.maxLength);
  }

  // 3. Map defendant fields (all 5 pages)
  // 4. Map court fields
  // 5. Map attorney fields (optional - skip if missing)
  // 6. Map case type checkboxes
  // 7. Map party statement fields
  // 8. Map case management fields (optional)

  return pdfFields;
}
```

---

## Questions for Review

1. **Case Number**: Where should this come from?
   - Auto-generate (timestamp)?
   - Database auto-increment?
   - Leave blank for court?

2. **City/Zip Transform**: Config expects both, but sample has only city. Solution?
   - Skip transform, just use city?
   - Extract zip from `Full_Address.PostalCode`?

3. **Case Type Default**: Should we default to 'limited' if not specified?

4. **Missing Optional Fields**: Correct behavior to skip them entirely?
   - Attorney fields (all 11)
   - Case management fields (5)
   - Date fields (2)

5. **Discovery Issues**: Should we map these now or leave for later?
   - Sample data has `Vermin: ["Rats/Mice", "Skunks", ...]`
   - Sample data has `Insects: ["Ants", "Roaches", ...]`
   - These would use `arrayToCommaList` transform

---

## Fields Currently Mapped (Based on Sample Data)

✅ **Available and will map**:
- Plaintiff names (5 fields, all pages): "Clark Kent"
- Defendant names (5 fields, all pages): "Master sdaf"
- Court county (1 field): "North Carolina"
- Court city (1 field): "Los Angeles"
- Party statement name (1 field): "Clark Kent"

**Total: 13 fields** out of 204 possible

❌ **Missing from sample data**:
- Case number (5 fields) - **REQUIRED** - Need decision
- Attorney fields (11 fields) - Optional, will skip
- Case type checkboxes (2 fields) - Need decision on default
- Case management (5 fields) - Optional, will skip
- Date fields (2 fields) - Optional, will skip
- Court street/mailing (3 fields) - Optional, will skip

---

## Next Steps After Approval

1. Implement the 4 transform functions
2. Implement JSON path resolver
3. Implement field truncation logic
4. Implement main mapping function
5. Add comprehensive error handling
6. Write unit tests with sample data
7. Document any fields that need additional data collection

---

**Ready for your review and questions!**
