# Design: LLC Defendant Type + Causes of Action Overhaul

**Date:** 2026-04-23
**Status:** Approved

## Overview

Two changes to the complaint generator:
1. Add "Limited Liability Company" as a separate defendant type
2. Replace the causes of action JSON with the authoritative CSV (46 causes, corrected categories, fixed ordering for General)

## Part 1: Add LLC Defendant Type

### Current State
7 defendant types: `individual`, `corporate`, `government_entity`, `trust`, `estate`, `partnership`, `association`

### Change
Add `llc` as an 8th type, separate from `corporate`. Update `corporate` placeholder to remove "LLC" since it's now its own type.

### Files

**`forms/complaint/index.html`**
- Add `<option value="llc">Limited Liability Company</option>` after the `corporate` option in defendant-1's `<select>`

**`forms/complaint/js/form-logic.js`**
- `defendantPlaceholders`: add `llc: 'LLC name'`, change `corporate` from `'Corporation or LLC name'` to `'Corporation name'`
- `addDefendant()` template: add `<option value="llc">Limited Liability Company</option>` after `corporate`

**`services/complaint-document-generator.js`**
- `defendantTypeDescriptors`: add `llc: 'a limited liability company'`

## Part 2: Causes of Action JSON Replacement

### Current State
- 49 causes in `data/causes-of-action.json`
- Many categories are misassigned (e.g., Constructive Eviction is `los-angeles` instead of `general`)
- No ordering field

### Change
Replace entire JSON with 46 causes from CSV (`/Users/ryanhaines/Downloads/Cause of Actions Breakdown.csv`). The CSV is the **authoritative, complete list**.

### Structure per cause
```json
{
  "id": "constructive-eviction",
  "category": "general",
  "order": 1,
  "checkboxText": "Constructive Eviction",
  "heading": "CONSTRUCTIVE EVICTION\n(CAL. CIV. CODE §§ 789.3 ...)",
  "insertText": "{n}PLAINTIFF realleges..."
}
```

- `order` field: **General causes only** (1-16, determines display order)
- Special, LA, Santa Monica: no `order` field, render in JSON array order

### Category Breakdown (from CSV)

**General (16 causes, ordered 1-16):**
1. Constructive Eviction
2. Breach of the Covenant of Quiet Enjoyment
3. Tortious Breach of Implied Warranty of Habitability
4. Statutory Breach of Warranty of Habitability
5. Uncured Building Inspection Violation – Cal. Civ. Code § 1942.4
6. Breach of Contract
7. Breach of the Implied Covenant of Good Faith and Fair Dealing
8. Violation of Business and Professions Code § 17200 et seq.
9. Harassment of Tenants
10. Intentional Infliction of Emotional Distress
11. Negligent Infliction of Emotional Distress
12. Nuisance
13. Negligence
14. Negligent Maintenance of the Premises
15. Negligent Training and Supervision
16. Unlawful Retention of Security Deposit

**Special (20 causes, no fixed order):**
- Fraud or Deceit
- Injunctive Relief
- Intentional Influence to Vacate
- Intentional Misrepresentation
- Invasion of Privacy – Intrusion Into Private Affairs
- Negligent Misrepresentation
- Promissory Estoppel
- Retaliatory Eviction
- Tortious Interference with Contractual Relations
- Toxic Environmental Mold Tort
- Trespass
- Violation of Cal. Civ. Code § 1714
- Violation of California Fair Employment and Housing Act
- Violation of Civil Code § 789.3
- Violations of the Ralph Civil Rights Act
- (5 more from current JSON that appear in CSV)

**City - Los Angeles (8 causes, no fixed order):**
- Violation of the Rent Stabilization Ordinance LAMC § 1504
- Failure to Abate Unsafe Mold Conditions
- Failure to Comply with Tenant Habitability Program, L.A.M.C. § 152.00 et seq.
- Harassment in Violation of L.A.M.C. § 45.33
- Harassment of Tenants – LA County
- Retaliatory Eviction – LA County
- Violation of the Los Angeles Rent Stabilization Ordinance
- (1 more)

**City - Santa Monica (2 causes, no fixed order):**
- Violation of the Santa Monica Anti-Discrimination Ordinance
- Violation of the Santa Monica Tenant Harassment Ordinance

### Ordering Strategy
General causes are placed first in the JSON array in order 1-16, followed by Special, then LA, then Santa Monica. The frontend renders in JSON array order per category container, so correct JSON ordering = correct display ordering. No frontend sort code needed.

### Pronoun Tokens
All `insertText` values preserve `<Pronoun Subject>`, `<Pronoun Possessive>`, `<Pronoun Object>` tokens where they appear in the CSV text. These are already handled by the existing `buildCausesOfActionData()` method.

### No Frontend Changes for Causes
- `categoryContainerMap` already maps all 4 categories to the correct containers
- `loadCauses()` renders in JSON order — no sort needed
- Count badges update automatically

## Template Location

The DOCX template that needs manual editing and deployment:
```
templates/Legal Complaint - Template.docx
```

## Files Changed

| File | Change |
|------|--------|
| `forms/complaint/index.html` | Add LLC `<option>` |
| `forms/complaint/js/form-logic.js` | Add LLC placeholder + option, update corporate placeholder |
| `services/complaint-document-generator.js` | Add LLC type descriptor |
| `data/causes-of-action.json` | Full replacement — 46 causes from CSV |
| `templates/Legal Complaint - Template.docx` | **User edits manually** — deploy alongside |

## Out of Scope
- No changes to the complaint API routes
- No database migration needed
- No CSS changes
- No changes to pronoun/guardian/move-in-date logic
