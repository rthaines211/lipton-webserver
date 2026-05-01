# Structured Property Address — Design Spec

**Date:** 2026-04-30
**Component:** Complaint Creator (`forms/complaint/index.html`, `forms/complaint/js/form-logic.js`, `services/complaint-document-generator.js`)
**Status:** Approved

---

## 1. Problem

The complaint form currently has a single freeform "Property Address" input where users type the entire address as one string (e.g., "123 Main St, Los Angeles, CA 90001"). This produces inconsistent formatting in generated DOCX complaints — some users include zip, some don't, capitalization varies, etc.

## 2. Goal

Replace the single field with structured inputs (Street, Unit, City, State, Zip) that combine server-side into a normalized address string for the `<Property Address>` template variable.

## 3. Form Changes

`forms/complaint/index.html` — replace the single field with five inputs in two rows:

**Row 1:**
- `property-address` — Street address (required) — placeholder "123 Main St"
- `property-unit` — Unit / Apt / Suite (optional) — placeholder "Apt 4B"

**Row 2:**
- `property-city` — City (required) — placeholder "Los Angeles" — separate from the existing `#city` dropdown which controls cause filtering
- `property-state` — State (required) — `<input type="text" maxlength="2" value="CA">` — defaults to "CA"
- `property-zip` — Zip (required) — `<input type="text" inputmode="numeric" pattern="[0-9]{5}(-[0-9]{4})?">` — placeholder "90001"

Visual layout: a 2-column grid for street + unit, then a 3-column grid (City wider, State narrow, Zip narrow) — match existing form-row patterns.

## 4. Backend Changes

`services/complaint-document-generator.js`:

### `parseFormData()` (around line 240–248)

Read the new fields and compose the rendered address:

```javascript
const propertyStreet = formData['property-address'] || '';
const propertyUnit = formData['property-unit'] || '';
const propertyCity = formData['property-city'] || '';
const propertyState = formData['property-state'] || 'CA';
const propertyZip = formData['property-zip'] || '';

// Build comma-separated address; skip empty parts gracefully
const addressParts = [propertyStreet];
if (propertyUnit) addressParts.push(propertyUnit);
const cityStateZip = [propertyCity, `${propertyState} ${propertyZip}`.trim()]
    .filter(Boolean)
    .join(', ');
if (cityStateZip) addressParts.push(cityStateZip);

const propertyAddress = addressParts.filter(Boolean).join(', ');
```

Result format: `"123 Main St, Apt 4B, Los Angeles, CA 90001"` (with unit) or `"123 Main St, Los Angeles, CA 90001"` (without unit).

### `caseInfo` object

Replace the single `propertyAddress` derivation with the composed value above. Keep `propertyAddress` as the canonical key passed to the template via `'Property Address': caseInfo.propertyAddress`.

### Backward compatibility

If the form sends only the legacy `property-address` field (older saved drafts, API calls), we still accept that as the street component. The other fields default to empty/CA. Any existing single-string addresses pass through unchanged for the most part — they end up as the "street" with no city/state/zip composition. This handles old data gracefully without forcing a migration.

## 5. Validation

All four required fields (street, city, state, zip) use HTML `required` attribute, validated by existing `goToPage2()` logic which calls `input.checkValidity()` on `#page-1 [required]`. No new JS validation logic needed.

Zip pattern `[0-9]{5}(-[0-9]{4})?` accepts both 5-digit and 9-digit ZIPs (zip+4).

## 6. Out of Scope

- No template changes — `<Property Address>` placeholder stays as one variable
- No database schema migration — `cases` table already has `address`, `city`, `state`, `zip` columns from the original intake schema; the complaint creator's persistence (if any) can either store the composed string or split fields. **Decision:** keep storing the composed string in `complaint_entries.property_address` (existing column). If we ever need structured queryability for complaints, that's a separate change.
- No autocomplete (Google Places etc.) — out of scope

## 7. Testing

Manual:
- Submit form with all four required fields → DOCX shows "123 Main St, Los Angeles, CA 90001"
- Submit form with unit → DOCX shows "123 Main St, Apt 4B, Los Angeles, CA 90001"
- Try Generate without zip → form blocks via `required`
- 9-digit zip "90001-1234" passes pattern validation

No automated tests needed (UI change + simple string concat).

## 8. Rollout

One commit, PR, manual smoke test, deploy via existing GitHub Actions workflow.
