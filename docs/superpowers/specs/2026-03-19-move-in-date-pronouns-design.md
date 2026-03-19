# Move-In Date & Preferred Pronouns — Single Plaintiff Fields

**Date:** 2026-03-19
**Status:** Approved
**Branch:** `feat/complaint-creator`

## Overview

Add two new fields to the complaint form that only appear when there is exactly one plaintiff: a move-in date and a preferred pronoun dropdown. These fields feed template variables in the generated DOCX. When multiple plaintiffs exist, the fields disappear and the template variables remain as highlighted placeholder text for manual replacement.

## Form Changes

### New Fields (Plaintiff 1 only)

1. **Move-In Date** — `<input type="date" id="move-in-date" name="move-in-date">` placed below the existing plaintiff 1 name/type fields
2. **Preferred Pronouns** — `<select id="pronouns" name="pronouns">` dropdown with three options:
   - "Select pronouns..." (value: `""`, default placeholder)
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

| Variable | Single Plaintiff (filled) | Single Plaintiff (empty) | Multiple Plaintiffs |
|---|---|---|---|
| `<Move In Date>` | Formatted date, e.g. "February 25, 2011" | Literal `<Move In Date>` with yellow highlight | Literal `<Move In Date>` with yellow highlight |
| `<Pronoun Subject>` | "he" or "she" | Literal `<Pronoun Subject>` with yellow highlight | Literal `<Pronoun Subject>` with yellow highlight |
| `<Pronoun Possessive>` | "his" or "her" | Literal `<Pronoun Possessive>` with yellow highlight | Literal `<Pronoun Possessive>` with yellow highlight |

**Empty field rule:** If a single plaintiff leaves either field blank/unselected, that variable is treated identically to the multi-plaintiff case — literal placeholder text with yellow highlight.

### Date Formatting

Move-in date is formatted as full month name, day, year: **"February 25, 2011"**.

Implementation: parse the date input value and format with `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`.

### Pronoun Mapping

| Dropdown Value | `<Pronoun Subject>` | `<Pronoun Possessive>` |
|---|---|---|
| `male` | he | his |
| `female` | she | her |

### Yellow Highlight (Fallback for Multi-Plaintiff or Empty Fields)

When there are multiple plaintiffs, or when a single plaintiff leaves these fields empty, the template variables are rendered as literal placeholder text with a yellow background highlight in the DOCX.

**Implementation:** The project uses `docxtemplater` (not the `docx` library). Docxtemplater replaces template tags inside an existing DOCX file. To apply yellow highlighting, post-process the output DOCX XML by injecting `<w:highlight w:val="yellow"/>` into the `<w:rPr>` (run properties) node of the relevant text runs. This is the same XML manipulation pattern used elsewhere in the generator (e.g., `splitCausesListIntoParagraphs`).

Steps:
1. After docxtemplater renders the document, unzip the DOCX and parse `word/document.xml`
2. Find `<w:t>` nodes containing the literal placeholder strings (e.g., `<Move In Date>`)
3. Inject `<w:highlight w:val="yellow"/>` into the parent `<w:r>`'s `<w:rPr>` element (create `<w:rPr>` if absent)
4. Re-zip and return

The highlight applies only to these three variables and only in the fallback case. All other template variables behave as before.

## File Changes

| File | Change |
|---|---|
| `forms/complaint/index.html` | Add move-in date input (`id="move-in-date"`) and pronoun dropdown (`id="pronouns"`) inside a `#single-plaintiff-fields` container after plaintiff 1 |
| `forms/complaint/js/form-logic.js` | Add `updateSinglePlaintiffFields()`, call it from `addPlaintiff()`, `removePlaintiff()`, `reindexPlaintiffs()` |
| `forms/complaint/js/form-submission.js` | Collect `moveInDate` and `pronouns` values; include in form data payload |
| `services/complaint-document-generator.js` | Update `parseFormData()` to extract `moveInDate` and `pronouns` from raw form data. Add template variable replacement for `<Move In Date>`, `<Pronoun Subject>`, `<Pronoun Possessive>`. Add `applyYellowHighlight()` post-processing function for fallback placeholders |
| `forms/complaint/styles.css` | Minor styling for new fields if needed |

## Out of Scope

- Pronoun options beyond he/him and she/her (e.g., they/them) — not requested
- Per-plaintiff move-in dates for multi-plaintiff cases
- Pronoun logic in causes of action insert text (`{n}` placeholders are a separate system)
