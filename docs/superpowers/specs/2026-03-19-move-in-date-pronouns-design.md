# Move-In Date & Preferred Pronouns — Single Plaintiff Fields

**Date:** 2026-03-19
**Status:** Approved
**Branch:** `feat/complaint-creator`

## Overview

Add two new fields to the complaint form that only appear when there is exactly one plaintiff: a move-in date and a preferred pronoun dropdown. These fields feed template variables in the generated DOCX. When multiple plaintiffs exist, the fields disappear and the template variables remain as highlighted placeholder text for manual replacement.

## Form Changes

### New Fields (Plaintiff 1 only)

1. **Move-In Date** — `<input type="date">` placed below the existing plaintiff 1 name/type fields
2. **Preferred Pronouns** — `<select>` dropdown with two options:
   - "he/him" (value: `male`)
   - "she/her" (value: `female`)

Both fields are wrapped in a container (e.g., `#single-plaintiff-fields`) that is shown/hidden based on plaintiff count.

### Visibility Rule

- **1 plaintiff:** Fields visible, values collected for document generation
- **2+ plaintiffs:** Fields hidden via `display: none`
- Values are preserved when hidden — if the user adds a second plaintiff then removes them, the fields reappear with previous values intact

### Toggle Points

The visibility check runs in:
- `addPlaintiff()` — hide when count exceeds 1
- `removePlaintiff()` / `reindexPlaintiffs()` — show when count returns to 1
- Page load — visible by default (starts with 1 plaintiff)

A single function `updateSinglePlaintiffFields()` handles the check: `plaintiffCount === 1 ? show : hide`.

## Document Generation

### New Template Variables

| Variable | Single Plaintiff | Multiple Plaintiffs |
|---|---|---|
| `<Move In Date>` | Formatted date, e.g. "February 25, 2011" | Literal text `<Move In Date>` with yellow highlight |
| `<Pronoun Subject>` | "he" or "she" | Literal text `<Pronoun Subject>` with yellow highlight |
| `<Pronoun Possessive>` | "his" or "her" | Literal text `<Pronoun Possessive>` with yellow highlight |

### Date Formatting

Move-in date is formatted as full month name, day, year: **"February 25, 2011"**.

Implementation: parse the date input value and format with `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`.

### Pronoun Mapping

| Dropdown Value | `<Pronoun Subject>` | `<Pronoun Possessive>` |
|---|---|---|
| `male` | he | his |
| `female` | she | her |

### Yellow Highlight (Multi-Plaintiff Fallback)

When there are multiple plaintiffs, the three template variables are rendered as literal placeholder text with a yellow background highlight in the DOCX. This uses the `docx` library's `TextRun` with `highlight: "yellow"` (or `shading` with yellow fill) so the complaint writer can easily locate and manually replace them.

The highlight applies only to these three variables and only in the multi-plaintiff case. All other template variables behave as before.

## File Changes

| File | Change |
|---|---|
| `forms/complaint/index.html` | Add move-in date input and pronoun dropdown inside a `#single-plaintiff-fields` container after plaintiff 1 |
| `forms/complaint/js/form-logic.js` | Add `updateSinglePlaintiffFields()`, call it from `addPlaintiff()`, `removePlaintiff()`, `reindexPlaintiffs()` |
| `forms/complaint/js/form-submission.js` | Collect `moveInDate` and `pronouns` from form when plaintiff count is 1 |
| `services/complaint-document-generator.js` | Add template variable replacement for `<Move In Date>`, `<Pronoun Subject>`, `<Pronoun Possessive>` with highlight fallback logic |
| `forms/complaint/styles.css` | Minor styling for new fields if needed |

## Out of Scope

- Pronoun options beyond he/him and she/her (e.g., they/them) — not requested
- Per-plaintiff move-in dates for multi-plaintiff cases
- Pronoun logic in causes of action insert text (`{n}` placeholders are a separate system)
