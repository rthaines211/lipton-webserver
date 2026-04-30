# Multi-Plaintiff Pronoun Pluralization — Design Spec

**Date:** 2026-04-30
**Component:** Complaint Creator (`services/complaint-document-generator.js`)
**Branch:** `claude/busy-buck-95605d`
**Status:** Approved (pending implementation plan)

---

## 1. Problem

When a complaint has multiple plaintiffs, the generated DOCX currently has incorrect pronoun grammar:

- The `applyPluralization()` post-processor converts `Plaintiff → Plaintiffs` and fixes verb agreement (`is → are`, `has → have`, etc.).
- But the cause-of-action source text in `data/causes-of-action.json` contains hardcoded singular pronouns: `her` (42×), `his` (12×), `she` (6×), `he` (3×), plus the phrase `his or her` (5×).
- After pluralization, output reads: *"PLAINTIFFS held a leasehold interest in **her** home"* — subject is plural, pronoun is singular.
- The previous `<Pronoun Subject/Possessive/Object>` token approach (PR work from 2026-03-19) was lost when `causes-of-action.json` was replaced with the authoritative 40-cause CSV-derived dataset (commit `3a8f1408`).

## 2. Goals

- Multi-plaintiff complaints render with grammatically correct plural pronouns (they/their/them).
- No edits to `data/causes-of-action.json` — the CSV-derived source remains authoritative.
- Single-plaintiff (1 Individual) cases continue to use the existing pronoun-resolution path with no behavior change.
- Reuse existing patterns: post-process DOCX XML, `GAP` constant for split-run tolerance.

## 3. Non-Goals

- Per-plaintiff pronoun fields (rejected — too complex for marginal benefit).
- Mixed-gender vs. single-gender heuristics (rejected — "they" is universally correct).
- Editing the causes JSON to insert tokens (rejected — adds maintenance burden, JSON is downstream of CSV).
- Tooling to detect new singular-pronoun patterns when causes JSON updates (out of scope; address if it becomes a problem).

## 4. Architecture

Add a new post-processor `applyPronounPluralization()` in `services/complaint-document-generator.js`, called from `generateComplaint()` after `applyPluralization()`.

```
doc.render(templateData)
  → splitCausesListIntoParagraphs(zip)
  → applyYellowHighlight(zip, ...)         (existing)
  → applyPluralization(zip, plaintiffCount) (existing — Plaintiff → Plaintiffs)
  → applyPronounPluralization(zip, plaintiffCount)  ← NEW
  → doc.getZip().generate(...)
```

**Trigger:** `validPlaintiffs.length > 1`. No-op for single-plaintiff cases.

## 5. Replacement Algorithm

Operates on `word/document.xml`. Order matters — phrase-level rules run before word-level rules to avoid double-replacement.

### 5.1 Phrase-level swaps (run first)

| Pattern | Replacement |
|---|---|
| `his or her` | `their` |
| `His or her` | `Their` |
| `he or she` | `they` |
| `He or she` | `They` |
| `him or her` | `them` |
| `Him or her` | `Them` |

### 5.2 Object-pronoun allowlist (run before generic `her` rule)

Specific phrases where `her` is object, not possessive. Sourced from the 2-instance audit of the 40-cause dataset:

| Pattern | Replacement |
|---|---|
| `intimidating her` (case-insensitive) | `intimidating them` |
| `denying her` (case-insensitive) | `denying them` |

Extend this list when new object cases surface in future cause audits.

### 5.3 Generic word-level swaps

| Pattern | Replacement | Notes |
|---|---|---|
| `\bher\b` | `their` | Possessive is dominant case (40/42 in audit). |
| `\bHer\b` | `Their` | Sentence-start. |
| `\bhis\b` | `their` | All uses are possessive (post-phrase-swap). |
| `\bHis\b` | `Their` | Sentence-start. |
| `\bshe\b` | `they` | |
| `\bShe\b` | `They` | Sentence-start. |
| `\bhe\b` (with `[t]` exception, see below) | `they` | |
| `\bHe\b` | `They` | Sentence-start. |
| `\bhim\b` | `them` | |
| `\bHim\b` | `Them` | Sentence-start. |

**`[t]he` exception:** The statutory quotation `§ 1942.5(h)` contains the literal text `[t]he` (square-bracketed letter is California legal-citation convention). The `\bhe\b` boundary matches because `]` is a non-word char. Implement as a negative lookbehind: `(?<!\[t\])\bhe\b` and `(?<!\[T\])\bHe\b`.

### 5.4 Verb-agreement follow-up

After the swaps, output may contain `they is`, `they has`, `they was` (because the source had `she/he is`, `he/she has`, `she was`). Use the existing `GAP` constant from `applyPluralization()` to tolerate run-splits:

| Pattern | Replacement |
|---|---|
| `\bthey${GAP}is\b` | `they are` |
| `\bThey${GAP}is\b` | `They are` |
| `\bthey${GAP}was\b` | `they were` |
| `\bThey${GAP}was\b` | `They were` |
| `\bthey${GAP}has\b` | `they have` |
| `\bThey${GAP}has\b` | `They have` |
| `\bthey${GAP}has${GAP}been\b` | `they have been` |

Note: `applyPluralization()` already handles `Plaintiffs is/has/was → are/have/were` patterns. The new rules cover the `they + verb` forms that emerge from pronoun swaps.

## 6. Form Changes

`forms/complaint/js/form-logic.js` — `togglePronounsAndMoveInDate()`:

**Current behavior:** Pronouns + move-in date fields visible when exactly 1 Individual plaintiff.

**New behavior:** Both fields visible only when total plaintiff count is exactly 1. When total > 1 (regardless of how many are Individuals), hide both fields.

**Rationale:**
- Pronouns dropdown is meaningless when output will always be pluralized — hiding it prevents confusion.
- Move-in date currently uses `<Move In Date>` placeholder when not 1-Individual; for multi-plaintiff cases, the placeholder behavior continues to work (yellow-highlighted in DOCX). Aligning move-in-date visibility with pronouns visibility (1-plaintiff-total) keeps the form rule simple: "these fields are for the single-plaintiff case."

**Code change:** Replace `individualPlaintiffs.length === 1` check with `totalPlaintiffs === 1`.

## 7. Backend Changes

`services/complaint-document-generator.js`:

1. Add `applyPronounPluralization(zip, plaintiffCount)` method.
2. Call it in `generateComplaint()` after `applyPluralization(zip, validPlaintiffs.length)`.
3. Update `hasMoveInDate` and `hasPronouns` derivation to use `validPlaintiffs.length === 1` (instead of `singleIndividual` based on type filter).
4. Yellow-highlight placeholders for move-in/pronouns continue to fire when total > 1, since fields won't be set.

## 8. Testing

New Jest suite: `tests/complaint-document-generator.pronoun-pluralization.test.js`.

### Test cases

| Scenario | Expected output |
|---|---|
| 1 Individual plaintiff (no minors) | Pronouns NOT pluralized; singular pronouns from form resolved. |
| 2 Individual plaintiffs | All pronoun swaps applied; verb agreement correct. |
| 1 Individual + 1 Minor (2 total) | Pluralized (total > 1). |
| Phrase: `his or her tenancy` | → `their tenancy` |
| Phrase: `He or she` (sentence-start) | → `They` |
| `[t]he remedies provided` | Preserved verbatim. |
| `intimidating her to vacate` | → `intimidating them to vacate` |
| `denying her the ability` | → `denying them the ability` |
| `her home` | → `their home` |
| `she lived on the premises` | → `they lived on the premises` |
| `he is` (post-swap) | → `they are` |
| `she has been` (post-swap) | → `they have been` |
| Run-split: `<w:r>he</w:r><w:r> is</w:r>` | → `they are` (GAP-tolerant) |
| `she or it personally` | → `they or it personally` |
| Capitalized `She has` | → `They have` |

### Regression coverage

Existing tests for `applyPluralization()` and single-Individual pronoun resolution must continue to pass — pronoun pluralization is purely additive.

## 9. Rollout

- Implementation on a feature branch.
- Manual verification against a real complaint with multiple plaintiffs before merge.
- Deploys via existing `deploy-complaint-creator.yml` GitHub Action when merged to main.
- No database migration, no env-var changes.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| New cause text added with novel singular phrasing | Audit + extend rules; same maintenance burden as `applyPluralization()`. |
| Object `her` outside the allowlist | Default `her → their` is wrong; lawyers proofread; extend allowlist in follow-up. |
| Regex matches across unrelated paragraphs (split runs) | `GAP` pattern excludes letters/digits — proven by existing `applyPluralization()`. |
| Capitalized variants miss edge cases (e.g. ALL-CAPS `HER`) | Audit shows no all-caps pronouns in causes JSON; add rules if needed. |
| `<` / `>` characters in document XML break regexes | Test fixtures use rendered DOCX XML, not raw template tags. |

## 11. References

- Prior pronoun work (2026-03-19): commits `f5ea7079` → `33932e19` (token-based, lost when causes JSON was replaced).
- Existing precedent: `applyPluralization()` in `services/complaint-document-generator.js:546-652`.
- Causes JSON: `data/causes-of-action.json` (40 causes, CSV-derived).
- Audit data: 42× `her`, 12× `his`, 6× `she`, 3× `he`, 5× `his or her`. Object `her`: 2 instances (`intimidating her`, `denying her`).
