# Remove Article from Plaintiff Type Descriptor

**Date:** 2026-06-18
**Status:** Approved

## Goal

Remove the leading article ("a"/"an") from the plaintiff type descriptor in the `<Plaintiff Names With Types>` template variable, so output reads `JOHN DOE, individual` instead of `JOHN DOE, an individual`.

## Scope

- **In scope:** Plaintiff type descriptors only (individual, minor).
- **Out of scope:** Defendant type descriptors. The guardian-ad-litem clause (already has no article).

## Current Behavior

`services/complaint-document-generator.js` builds the `Plaintiff Names With Types` value via `plaintiffNamesWithTypes` (lines 82–96):

- Individual: `${NAME}, an individual`
- Minor (no guardian assigned): `${NAME}, a minor`
- Minor with guardian: `${NAME}, minor by and through Guardian Ad Litem, ${GUARDIAN}` (no article — unchanged)

## Proposed Behavior

- Individual: `${NAME}, individual`
- Minor (no guardian assigned): `${NAME}, minor`
- Minor with guardian: unchanged

## Changes

`services/complaint-document-generator.js`:
- Line 91: `return \`${name}, a minor\`;` → `return \`${name}, minor\`;`
- Line 93: `return \`${name}, an individual\`;` → `return \`${name}, individual\`;`

Two single-line edits. No new functions, no new data, no template changes.

## Testing

- Unit: search for any test asserting the descriptor strings and update if present.
- Manual: generate a complaint with (a) one individual plaintiff, (b) one minor without guardian, (c) one minor with assigned guardian. Confirm the rendered DOCX matches the proposed strings.

## Risks

None of note. Existing complaint templates that consume `<Plaintiff Names With Types>` will render the new shorter phrase wherever they previously rendered the article-prefixed phrase. If any template's surrounding text relied on the article (e.g., grammatical flow into the next clause), that template needs a copy tweak — but a scan of `templates/Legal Complaint - Template.docx` is the responsibility of the implementation step, not this spec.
