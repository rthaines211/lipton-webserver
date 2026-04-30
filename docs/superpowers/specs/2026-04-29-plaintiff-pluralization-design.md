# Plaintiff Pluralization in Generated Complaint Document

**Date:** 2026-04-29
**Status:** Approved (auto mode)
**Component:** `services/complaint-document-generator.js`

## Problem

When the complaint generator produces a DOCX with **multiple plaintiffs**, the document still reads "Plaintiff" (singular) throughout — in the template's hardcoded text (caption, "PLAINTIFF'S COMPLAINT" title, "COMES NOW Plaintiff…", "PLAINTIFF is and has been a tenant…") and in the cause-of-action bodies. Result: ungrammatical document that requires manual editing.

## Goal

When `validPlaintiffs.length > 1`, the rendered DOCX should consistently use plural forms ("Plaintiffs", "PLAINTIFFS", "PLAINTIFFS'") and the most common attached singular verbs ("is", "was", "has", "has been") should agree as plural.

When there is exactly one plaintiff, the document is unchanged from today's behavior.

## Approach

Post-process the rendered DOCX `word/document.xml` after `doc.render()` and after existing post-processors (`splitCausesListIntoParagraphs`, `applyYellowHighlight`). Use `PizZip` XML round-trip, same pattern as `applyYellowHighlight`.

A new method `applyPluralization(zip, plaintiffCount)` runs only when `plaintiffCount > 1`. It applies a list of regex word-boundary substitutions to the XML text. Substitutions are scoped to text inside `<w:t>` elements implicitly via `\b` word boundaries plus careful pattern design — XML tags don't match the text patterns we look for. The applyYellowHighlight post-processor already does the same thing (replace inside the full `document.xml`).

**Why post-process instead of new template tokens:**
- The hardcoded "Plaintiff" instances in the template are dispersed across paragraph text the firm may revise; tokenizing each one bloats the template and creates churn for any future template edit.
- Cause-of-action `insertText` content is already inconsistent (some causes use "Plaintiffs", others use "Plaintiff") — a post-processor normalizes both at once.
- No template changes needed → zero risk of breaking the existing single-plaintiff path.

## Substitution Rules

Apply in order. All use word boundaries.

### Word-form substitutions
| From | To | Notes |
|------|----|----|
| `Plaintiff's` | `Plaintiffs'` | possessive (mixed case) |
| `Plaintiff` | `Plaintiffs` | base noun (mixed case). Skip if followed by a capitalized given name (see exclusion below). |
| `PLAINTIFF'S` | `PLAINTIFFS'` | possessive (all caps) |
| `PLAINTIFF'` | `PLAINTIFFS'` | guards against `PLAINTIFF'` already touching newer text |
| `PLAINTIFF` | `PLAINTIFFS` | base noun (all caps) |

### Verb-agreement substitutions (apply BEFORE word-form rules)
| From | To |
|------|----|
| `Plaintiff is` | `Plaintiffs are` |
| `PLAINTIFF is` | `PLAINTIFFS are` |
| `Plaintiff was` | `Plaintiffs were` |
| `PLAINTIFF was` | `PLAINTIFFS were` |
| `Plaintiff has been` | `Plaintiffs have been` |
| `PLAINTIFF has been` | `PLAINTIFFS have been` |
| `Plaintiff has` | `Plaintiffs have` |
| `PLAINTIFF has` | `PLAINTIFFS have` |
| `COMES NOW Plaintiff` | `COME NOW Plaintiffs` |
| `Comes now Plaintiff` | `Come now Plaintiffs` |

After verb rules run, the residual `Plaintiff` in those sentences is rewritten by the word-form rules.

### Exclusion: named-plaintiff references

Cause-of-action text such as `Plaintiff Dakora Robinson has a young child` is a singular reference to a specific named plaintiff. Pluralizing this would produce `Plaintiffs Dakora Robinson has…`, which is wrong.

**Rule:** the base-noun mixed-case substitution `Plaintiff` → `Plaintiffs` does NOT apply when the next non-space character is a capital letter starting a word (i.e. a proper name). Concretely:

```regex
\bPlaintiff\b(?!s)(?!\s+[A-Z][a-z])
```

The all-caps form `PLAINTIFF` doesn't have this risk in current data (named plaintiffs are never in all-caps in the cause text), so its rule is plain `\bPLAINTIFF\b` (with negative lookahead for `S`).

### "(Plaintiff Against ...)" cause heading line
This line is filtered out of `causeTitle` and `buildCausesOfActionList`, but appears as `causePlaintiffLine` in the body. The base-noun rule converts it to "(Plaintiffs Against ...)" — desired.

## Implementation Location

- New method `applyPluralization(zip, plaintiffCount)` in `ComplaintDocumentGenerator`.
- Invoke from `generateComplaint` after `applyYellowHighlight` and before `doc.getZip().generate(...)`.
- `plaintiffCount` = `validPlaintiffs.length`.

## Edge Cases

- **Header/footer/styles XML:** the template attorney info has "Attorney for Plaintiff:" in the body section, not in `header*.xml`. Verified by extracting the DOCX. Only `word/document.xml` is processed.
- **`<Plaintiff Names>` token:** docxtemplater has already replaced this with the actual joined names by the time post-processing runs, so the regex `\bPlaintiff\b` will not match the token itself.
- **Single plaintiff:** `applyPluralization` is a no-op when `plaintiffCount <= 1`.
- **Highlighted placeholders:** if a placeholder string ever contained "Plaintiff", it would be touched. Current placeholders (`<Move In Date>`, `<Pronoun Subject/Possessive/Object>`) don't contain it.

## Testing

1. Existing complaint suite (`tests/...`) must still pass.
2. Manual verification: generate a complaint with 2 plaintiffs, open the DOCX, confirm:
   - Caption: "Plaintiffs," not "Plaintiff,"
   - Title: "PLAINTIFFS' COMPLAINT FOR DAMAGES…"
   - "COME NOW Plaintiffs <Names>"
   - "PLAINTIFFS are and have been tenants…"
   - "occupied by PLAINTIFFS"
   - "Plaintiff Dakora Robinson" (when present in chosen cause) remains singular.
3. Manual verification: generate a complaint with 1 plaintiff — output identical to current behavior (diff the XML or compare two generations).

## Out of Scope

- "the Plaintiff" → "the Plaintiffs" is handled by the base-noun rule.
- Singular pronouns ("he"/"she"/"they") used in cause text remain driven by the existing pronoun system, which already disables itself when there are multiple individual plaintiffs (yellow-highlight fallback). Pluralization does not touch pronouns.
- Defendant pluralization — out of scope for this change; existing behavior preserved.
