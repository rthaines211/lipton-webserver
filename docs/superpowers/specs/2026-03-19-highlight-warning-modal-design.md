# Yellow Highlight Warning Modal

**Date:** 2026-03-19
**Feature:** Complaint Creator — Generate button intercept modal
**Scope:** Frontend only (no backend changes)

## Overview

When a user clicks "Generate Complaint" and there are fields that will appear yellow-highlighted in the generated DOCX, show a modal explaining what the highlights mean before proceeding. If all fields are complete, generation proceeds immediately with no modal.

## Trigger Conditions

The modal appears only when one or more of these conditions are true:

1. **Move In Date** — the `#single-plaintiff-fields` container is visible (exactly 1 Individual plaintiff) and the Move In Date input value is `""`
2. **Pronouns** — the `#single-plaintiff-fields` container is visible and the Pronouns select value is `""`

When there are 0 or 2+ Individual plaintiffs, the fields are hidden and the backend silently applies yellow highlights. No modal is needed because the user has no opportunity to fill those fields — the highlights are expected.

If neither condition is met, the "Generate Complaint" button proceeds directly to generation (no modal).

## Detection Logic (Frontend)

In `form-submission.js`, before initiating the SSE submission:

1. Check if `#single-plaintiff-fields` is visible (`display !== 'none'`)
2. If visible, check `document.getElementById('moveInDate').value === ''`
3. If visible, check `document.getElementById('pronouns').value === ''`
4. Build array of missing field labels
5. If array is non-empty, show modal; otherwise proceed

## Modal Design

**Style:** Left yellow border accent (Option C from brainstorm)

- 4px solid yellow (`#FBBF24`) left border on the heading section
- Heading: "Some fields need attention"
- Body text: "No worries! These fields will appear **highlighted in yellow** in your document. Just look for the highlights and fill them in."
  - The words "highlighted in yellow" rendered with a yellow background (`#FEFCE8`) and amber text (`#92400E`) to preview the highlight appearance
- Missing fields list: each field on its own row with a yellow swatch (`#FEF08A`, 20x12px rounded rectangle) next to the field name
  - "Move In Date" (when applicable)
  - "Pronoun references (he/she, his/her, him/her)" (when applicable)
- Rows separated by light border (`#F3F4F6`)

**Buttons (right-aligned):**
- "Go Back" — secondary style (white background, gray border), closes modal and navigates to page 1 where the missing fields are
- "Continue Generating" — primary style (Lipton blue gradient `#00AEEF` → `#0098D4`, white text, bold), dismisses modal and proceeds with generation. Disabled after first click to prevent double-submission.

**Backdrop:** Semi-transparent dark overlay, clicking outside closes modal (same as "Go Back")

**Dismiss:** Escape key closes modal (same as "Go Back")

**Accessibility:** `role="dialog"`, `aria-modal="true"`, focus trapped within modal while open, focus returns to Generate button on close.

## Implementation Location

- **Modal HTML:** Static markup in `forms/complaint/index.html` (hidden by default), consistent with existing `progress-overlay` pattern
- **Trigger logic:** `forms/complaint/js/form-submission.js` — intercept the generate button handler
- **Field state checks:** Check DOM element visibility/values directly (no need to call `collectFormData()`)

## Files to Modify

1. `forms/complaint/js/form-submission.js` — add modal show/hide logic, intercept generate
2. `forms/complaint/styles.css` — modal styles (overlay, card, buttons)
3. `forms/complaint/index.html` — static modal HTML markup (hidden by default)

## No Backend Changes

The yellow highlight post-processing in `services/complaint-document-generator.js` already handles missing fields. This feature is purely frontend — it informs the user before generation, not after.
