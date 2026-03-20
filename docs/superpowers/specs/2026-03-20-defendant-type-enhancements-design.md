# Defendant Type Enhancements — Design Spec

**Date:** 2026-03-20

## Summary

Expand defendant types beyond Individual and Corporate, consolidate first/last name into a single Name field for all types, and remove the required asterisk from Filing Date.

## Current State

- Defendants have two types: `individual`, `corporate`
- Each defendant has `First Name` + `Last Name` fields (both required)
- Filing Date label has a `*` asterisk making it look required (input is not actually required)
- Backend parses `defendant-N-first-name` and `defendant-N-last-name`

## Changes

### 1. Single Name Field (All Types)

Replace the two-field `First Name` / `Last Name` layout with a single `Name` field for all defendant types. The placeholder text changes dynamically based on the selected type:

| Type              | Placeholder Text              |
|-------------------|-------------------------------|
| Individual        | "First and last name"         |
| Corporate         | "Corporation or LLC name"     |
| Government Entity | "Agency or department name"   |
| Trust             | "Trust name"                  |
| Estate            | "Estate name"                 |
| Partnership       | "Partnership name"            |
| Association       | "Association or HOA name"     |

The label stays "Name" for all types. The field is required.

### 2. Expanded Defendant Types

The type dropdown options expand from 2 to 7:

- Individual
- Corporate
- Government Entity
- Trust
- Estate
- Partnership
- Association

### 3. Type Descriptors for Template Variable

`<Defendant Names With Types>` uses these descriptors:

| Type              | Descriptor            |
|-------------------|-----------------------|
| Individual        | "an individual"       |
| Corporate         | "a corporate entity"  |
| Government Entity | "a government entity" |
| Trust             | "a trust"             |
| Estate            | "an estate"           |
| Partnership       | "a partnership"       |
| Association       | "an association"      |

### 4. Filing Date Asterisk Removal

Remove the `<span class="required">*</span>` from the Filing Date label. The input remains unchanged (already not required).

### 5. Backend Name Parsing

- Parse `defendant-N-name` instead of `defendant-N-first-name` / `defendant-N-last-name`
- `<Defendant Names>` — semicolon-separated ALL CAPS (same format, just from single field)
- `<Defendant Names With Types>` — ALL CAPS name + descriptor string

## Files Modified

| File | Change |
|------|--------|
| `forms/complaint/index.html` | Replace first/last name fields with single Name field; add new type options; remove filing date asterisk |
| `forms/complaint/js/form-logic.js` | Update `addDefendant()` template to use single Name field with new types; add placeholder swap on type change; update `reindexDefendants()` for new field name |
| `forms/complaint/js/form-submission.js` | Collect `defendant-N-name` instead of first/last |
| `services/complaint-document-generator.js` | Parse `defendant-N-name`; update type descriptor map for 7 types |

## Template Variables (unchanged interface)

- `<Defendant Names>` — "ACME LLC; JOHN SMITH" (semicolon-separated, ALL CAPS)
- `<Defendant Names With Types>` — "ACME LLC, a corporate entity; JOHN SMITH, an individual"

## Out of Scope

- Doe defendants
- Plaintiff type changes
- Template file changes (variables unchanged)
