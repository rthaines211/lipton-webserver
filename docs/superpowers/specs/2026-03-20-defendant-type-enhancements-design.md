# Defendant Type Enhancements — Design Spec

**Date:** 2026-03-20

## Summary

Expand defendant types beyond Individual and Corporate, consolidate first/last name into a single Name field for all types, and remove the required asterisk from Filing Date.

## Current State

- Defendants have two types: `individual`, `corporate`
- Each defendant has `First Name` + `Last Name` fields (both required)
- Filing Date has both a visual `*` asterisk and the `required` attribute on the input
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

The form layout changes from `three-col` (first name, last name, type) to `two-col` (name, type).

A `change` event listener on the type `<select>` updates the Name field placeholder from a type-to-placeholder map. This applies to both the initial Defendant 1 in HTML and dynamically added defendants (listener attached in `addDefendant()`).

### 2. Expanded Defendant Types

The type dropdown options expand from 2 to 7. Option `value` attributes use lowercase/snake_case:

| Label | Value |
|-------|-------|
| Individual | `individual` |
| Corporate | `corporate` |
| Government Entity | `government_entity` |
| Trust | `trust` |
| Estate | `estate` |
| Partnership | `partnership` |
| Association | `association` |

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

### 4. Filing Date — Make Fully Optional

Remove both the `<span class="required">*</span>` from the Filing Date label AND the `required` attribute from the `<input>` element.

### 5. Backend Name Parsing

- Parse `defendant-N-name` instead of `defendant-N-first-name` / `defendant-N-last-name`
- Update validity filter from `d.firstName || d.lastName` to `d.name`
- Update name formatting from `` `${d.firstName} ${d.lastName}`.trim() `` to `d.name.trim()`
- Update type descriptor map to handle all 7 types (use `government_entity` etc. as keys)
- `<Defendant Names>` — semicolon-separated ALL CAPS (same format, just from single field)
- `<Defendant Names With Types>` — ALL CAPS name + descriptor string

## Files Modified

| File | Change |
|------|--------|
| `forms/complaint/index.html` | Replace first/last name fields with single Name field; change to `two-col` layout; add new type options; remove filing date asterisk and `required` attribute; add `onchange` for Defendant 1 type select |
| `forms/complaint/js/form-logic.js` | Update `addDefendant()` template to use single Name field with new types and `two-col` layout; add placeholder swap on type change via event listener; `reindexDefendants()` needs no structural changes (regex already handles new field name) |
| `forms/complaint/js/form-submission.js` | Collect `defendant-N-name` instead of first/last |
| `services/complaint-document-generator.js` | Parse `defendant-N-name`; update validity filter (`d.name`); update name formatting; update type descriptor map for 7 types |

## Template Variables (unchanged interface)

- `<Defendant Names>` — "ACME LLC; JOHN SMITH" (semicolon-separated, ALL CAPS)
- `<Defendant Names With Types>` — "ACME LLC, a corporate entity; JOHN SMITH, an individual"

## Out of Scope

- Doe defendants
- Plaintiff type changes
- Template file changes (variables unchanged)
