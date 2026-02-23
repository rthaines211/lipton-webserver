# Spanish Retainer Agreement Support — Design Document

**Date:** 2026-02-23
**Status:** Approved

## Summary

Add per-plaintiff language selection to the contingency fee agreement generator, allowing staff to specify English or Spanish for each plaintiff's generated DOCX agreement. The form UI stays in English; only the generated documents change language.

## Approach: Separate Spanish Templates

Create dedicated Spanish DOCX templates that use the same `<placeholder>` names as the English templates. The document generator selects the correct template based on each plaintiff's language preference. This keeps code changes minimal and allows the legal team to maintain Spanish templates independently in Word.

## Design

### 1. Form Changes

- Add a **Language dropdown** (`plaintiff-{i}-language`) to each plaintiff block in `forms/agreement/index.html`
- Options: "English" (default), "Spanish"
- Placed alongside existing plaintiff fields (after name fields)
- `addPlaintiff()` in `form-logic.js` includes the dropdown in dynamically created blocks
- `collectFormData()` in `form-submission.js` includes the `language` value per plaintiff

### 2. Templates

Two new files in `templates/`:

- `LLG Contingency Fee Agreement - Template - Spanish.docx` — adult agreement in Spanish
- `LLG Contingency Fee Agreement - Minor - Spanish.docx` — minor/guardian agreement in Spanish

Both use identical placeholder names as the English counterparts (`<Plaintiff Full Name>`, `<Plaintiff Full Address>`, etc.). Initially created as copies with translation markers for the legal team to complete.

### 3. Document Generator

In `services/contingency-document-generator.js`, template selection becomes:

| Minor? | Language | Template |
|--------|----------|----------|
| No | English | Template.docx |
| No | Spanish | Template - Spanish.docx |
| Yes | English | Minor.docx |
| Yes | Spanish | Minor - Spanish.docx |

Template paths stored as constants. No changes to placeholder mapping or docxtemplater configuration. Output file naming stays unchanged.

### 4. Backend/API

- No database schema changes — `language` field flows through existing JSONB `form_data` column
- `POST /api/contingency-entries` route passes form data to generator as-is
- Language field naturally included in plaintiff data objects

## Files Changed

| File | Change |
|------|--------|
| `forms/agreement/index.html` | Add language dropdown to plaintiff blocks |
| `forms/agreement/js/form-logic.js` | Include dropdown in `addPlaintiff()` |
| `forms/agreement/js/form-submission.js` | Include language in `collectFormData()` |
| `services/contingency-document-generator.js` | Template selection by language |
| `templates/` (2 new files) | Spanish DOCX templates |

## Files NOT Changed

- Database migrations (JSONB handles new field)
- `routes/contingency.js` (data flows through naturally)
- Existing English templates
