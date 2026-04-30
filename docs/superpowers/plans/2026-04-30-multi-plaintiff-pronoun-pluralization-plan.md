# Multi-Plaintiff Pronoun Pluralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a complaint has multiple plaintiffs, post-process the rendered DOCX so singular pronouns (`he/she/his/her/him`) become plural (`they/their/them`), with verb-agreement fixes, mirroring the existing `applyPluralization()` pattern.

**Architecture:** New `applyPronounPluralization(zip, plaintiffCount)` post-processor in `services/complaint-document-generator.js`, called after the existing `applyPluralization()`. Operates on `word/document.xml` with regex substitutions in 4 ordered passes: phrase swaps → object-pronoun allowlist → generic word swaps → verb-agreement follow-up. Reuses the existing `GAP` constant for run-split tolerance. Form change in `forms/complaint/js/form-logic.js` hides pronouns + move-in fields when total plaintiff count ≠ 1.

**Tech Stack:** Node.js, PizZip, Jest (with `NODE_OPTIONS='--experimental-vm-modules'`), vanilla DOM JS for the form.

**Spec:** `docs/superpowers/specs/2026-04-30-multi-plaintiff-pronoun-pluralization-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `services/complaint-document-generator.js` | Modify | Add `applyPronounPluralization()`, wire into `generateComplaint()`, update `hasPronouns`/`hasMoveInDate` derivation. |
| `forms/complaint/js/form-logic.js` | Modify | Update `updateSinglePlaintiffFields()` to use total count instead of Individual count. |
| `tests/services/complaint-document-pronoun-pluralization.test.js` | Create | Jest suite covering 14 scenarios from spec §8. |

---

## Task 1: Test for single-plaintiff no-op (baseline)

**Files:**
- Create: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const fs = require('fs');
const PizZip = require('pizzip');
const ComplaintDocumentGenerator = require('../../services/complaint-document-generator');

function extractText(docxPath) {
    const buf = fs.readFileSync(docxPath);
    const zip = new PizZip(buf);
    const xml = zip.file('word/document.xml').asText();
    return xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ');
}

function makeFormData(plaintiffCount, opts = {}) {
    const data = {
        'case-name': 'Test Case',
        'property-address': '123 Main St',
        'case-number': 'CV-001',
        'city': 'Los Angeles',
        'county': 'Los Angeles',
        plaintiffCount: String(plaintiffCount),
        defendantCount: '1',
        'defendant-1-name': 'Bad Landlord LLC',
        'defendant-1-type': 'corporate',
        causesOfAction: ['constructive-eviction'],
        ...opts.caseInfo,
    };
    const firstNames = ['Jane', 'John', 'Mary', 'Pat'];
    for (let i = 1; i <= plaintiffCount; i++) {
        data[`plaintiff-${i}-first-name`] = firstNames[i - 1] || `Plaintiff${i}`;
        data[`plaintiff-${i}-last-name`] = 'Doe';
        data[`plaintiff-${i}-type`] = (opts.types && opts.types[i - 1]) || 'individual';
        if (opts.guardians && opts.guardians[i - 1]) {
            data[`plaintiff-${i}-guardian`] = String(opts.guardians[i - 1]);
        }
    }
    return data;
}

describe('Complaint Document Pronoun Pluralization', () => {
    let generator;
    beforeAll(() => { generator = new ComplaintDocumentGenerator(); });

    describe('with 1 plaintiff (Individual, female pronouns)', () => {
        let text;
        beforeAll(async () => {
            const data = makeFormData(1);
            data['pronouns'] = 'female';
            data['move-in-date'] = '2020-05-01';
            const result = await generator.generateComplaint(data);
            text = extractText(result.outputPath);
        });

        test('does NOT pluralize singular pronouns', () => {
            expect(text).toContain('her home');
            expect(text).not.toContain('their home');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS — baseline; pronouns are NOT pluralized when there is 1 plaintiff.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: baseline test for single-plaintiff pronoun handling"
```

---

## Task 2: Failing test for 2-plaintiff pronoun pluralization

**Files:**
- Modify: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Add 2-plaintiff describe block**

Append to `tests/services/complaint-document-pronoun-pluralization.test.js`, inside the outer `describe`:

```javascript
    describe('with 2 plaintiffs (Individuals)', () => {
        let text;
        beforeAll(async () => {
            const result = await generator.generateComplaint(makeFormData(2));
            text = extractText(result.outputPath);
        });

        test('possessive: "her home" → "their home"', () => {
            expect(text).toContain('their home');
            expect(text).not.toMatch(/\bher\s+home\b/);
        });

        test('possessive: "her tenancy" → "their tenancy"', () => {
            expect(text).toContain('their tenancy');
        });

        test('phrase: "his or her tenancy" → "their tenancy"', () => {
            expect(text).not.toMatch(/\bhis\s+or\s+her\b/);
        });

        test('subject: "she lived" → "they lived"', () => {
            expect(text).toContain('they lived');
            expect(text).not.toMatch(/\bshe\s+lived\b/);
        });

        test('object allowlist: "intimidating her" → "intimidating them"', () => {
            // This phrase appears in some causes; assert no singular form remains
            expect(text).not.toMatch(/\bintimidating\s+her\b/);
        });

        test('verb agreement after swap: no "they is" / "they has" / "they was"', () => {
            expect(text).not.toMatch(/\bthey\s+is\b/);
            expect(text).not.toMatch(/\bthey\s+has\b/);
            expect(text).not.toMatch(/\bthey\s+was\b/);
        });

        test('preserves "[t]he" statutory citation (does not match \\bhe\\b)', () => {
            // The §1942.5(h) quotation contains "[t]he remedies provided"
            expect(text).toContain('[t]he remedies provided');
            expect(text).not.toContain('[t]they remedies');
        });
    });
```

- [ ] **Step 2: Run test to verify it FAILS**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: FAIL — multiple assertions fail because `applyPronounPluralization()` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: failing tests for 2-plaintiff pronoun pluralization"
```

---

## Task 3: Implement `applyPronounPluralization()` skeleton + wire into pipeline

**Files:**
- Modify: `services/complaint-document-generator.js`

- [ ] **Step 1: Add the method (skeleton with no-op for count<=1)**

Add this method to the `ComplaintDocumentGenerator` class, immediately AFTER `applyPluralization` (around line 652, before `splitCausesListIntoParagraphs`):

```javascript
    /**
     * Pluralize singular pronouns (he/she/his/her/him) to plural (they/their/them)
     * throughout the rendered document when there are multiple plaintiffs.
     * No-op for 1 plaintiff. Runs after applyPluralization().
     *
     * Operates on word/document.xml. Replacement order:
     *   1. Phrase-level swaps ("his or her" → "their", etc.)
     *   2. Object-pronoun allowlist (specific phrases where "her" is object)
     *   3. Generic word-level swaps with [t]he exception
     *   4. Verb-agreement follow-up ("they is" → "they are", etc.)
     */
    applyPronounPluralization(zip, plaintiffCount) {
        if (plaintiffCount <= 1) return;

        let xml = zip.file('word/document.xml').asText();

        // GAP: zero-or-more whitespace, XML tags, or punctuation that may
        // separate pronoun and verb across <w:r> runs. Same as applyPluralization.
        const GAP = '(?:[\\s\\xA0]|<[^>]+>|&[a-zA-Z]+;|&#\\d+;|[.,;:()"\\u2018\\u2019\\u201C\\u201D])*?';

        // 1. Phrase-level swaps — run first so word-level rules don't mangle them
        const phraseRules = [
            [/\bhis or her\b/g, 'their'],
            [/\bHis or her\b/g, 'Their'],
            [/\bhe or she\b/g, 'they'],
            [/\bHe or she\b/g, 'They'],
            [/\bhim or her\b/g, 'them'],
            [/\bHim or her\b/g, 'Them'],
        ];
        for (const [pattern, replacement] of phraseRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 2. Object-pronoun allowlist — specific phrases where "her" is object,
        //    not possessive. Default rule below sends "her" → "their", which
        //    is wrong for these cases.
        const objectRules = [
            [/\bintimidating her\b/gi, (m) => m.replace(/her$/i, 'them')],
            [/\bdenying her\b/gi, (m) => m.replace(/her$/i, 'them')],
        ];
        for (const [pattern, replacement] of objectRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 3. Generic word-level swaps. Possessive is dominant for "her" (40/42
        //    in audit), so default to "their". `[t]he` is California legal
        //    citation convention (§1942.5(h)) — exclude it from "he" matches.
        const wordRules = [
            [/\bher\b/g, 'their'],
            [/\bHer\b/g, 'Their'],
            [/\bhis\b/g, 'their'],
            [/\bHis\b/g, 'Their'],
            [/\bshe\b/g, 'they'],
            [/\bShe\b/g, 'They'],
            // Negative lookbehind for "[t]" or "[T]" preserves statutory quotes
            [/(?<!\[t\])\bhe\b/g, 'they'],
            [/(?<!\[T\])\bHe\b/g, 'They'],
            [/\bhim\b/g, 'them'],
            [/\bHim\b/g, 'Them'],
        ];
        for (const [pattern, replacement] of wordRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 4. Verb-agreement follow-up — fix "they is/has/was" produced by the
        //    swaps. GAP-tolerant for split runs.
        const verbRules = [
            [new RegExp(`\\bthey(${GAP})has(${GAP})been\\b`, 'g'),
                (m, g1, g2) => `they${g1}have${g2}been`],
            [new RegExp(`\\bThey(${GAP})has(${GAP})been\\b`, 'g'),
                (m, g1, g2) => `They${g1}have${g2}been`],
            [new RegExp(`\\bthey(${GAP})is\\b`, 'g'), (m, g) => `they${g}are`],
            [new RegExp(`\\bThey(${GAP})is\\b`, 'g'), (m, g) => `They${g}are`],
            [new RegExp(`\\bthey(${GAP})was\\b`, 'g'), (m, g) => `they${g}were`],
            [new RegExp(`\\bThey(${GAP})was\\b`, 'g'), (m, g) => `They${g}were`],
            [new RegExp(`\\bthey(${GAP})has\\b`, 'g'), (m, g) => `they${g}have`],
            [new RegExp(`\\bThey(${GAP})has\\b`, 'g'), (m, g) => `They${g}have`],
        ];
        for (const [pattern, replacement] of verbRules) {
            xml = xml.replace(pattern, replacement);
        }

        zip.file('word/document.xml', xml);
    }
```

- [ ] **Step 2: Wire into generateComplaint**

In `services/complaint-document-generator.js`, find the line:

```javascript
        // Pluralize "Plaintiff" → "Plaintiffs" throughout when multiple plaintiffs
        this.applyPluralization(doc.getZip(), validPlaintiffs.length);
```

Add immediately after it:

```javascript

        // Pluralize singular pronouns (he/she/his/her/him → they/their/them) when multiple plaintiffs
        this.applyPronounPluralization(doc.getZip(), validPlaintiffs.length);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS — all 2-plaintiff assertions pass; single-plaintiff baseline still passes.

- [ ] **Step 4: Run full pluralization regression suite**

Run: `npm test -- tests/services/complaint-document-pluralization.test.js`
Expected: PASS — existing Plaintiff→Plaintiffs tests are not affected.

- [ ] **Step 5: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat(complaint): pluralize pronouns (he/she/his/her/him → they/their/them) for multi-plaintiff"
```

---

## Task 4: Edge-case test — 1 Individual + 1 Minor (2 total)

**Files:**
- Modify: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Add describe block**

Append inside the outer `describe`:

```javascript
    describe('with 1 Individual + 1 Minor (2 plaintiffs total)', () => {
        let text;
        beforeAll(async () => {
            const data = makeFormData(2, {
                types: ['individual', 'minor'],
                guardians: [null, 1],
            });
            const result = await generator.generateComplaint(data);
            text = extractText(result.outputPath);
        });

        test('pluralizes pronouns (total > 1)', () => {
            expect(text).not.toMatch(/\bher\s+home\b/);
            expect(text).toContain('their home');
        });

        test('pluralizes "Plaintiff" (existing behavior, regression check)', () => {
            expect(text).toContain('PLAINTIFFS');
        });
    });
```

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS — confirms `validPlaintiffs.length > 1` triggers pluralization regardless of types.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: 1 Individual + 1 Minor triggers pronoun pluralization"
```

---

## Task 5: Edge-case test — sentence-start capitalized variants

**Files:**
- Modify: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Add describe block**

Append inside the outer `describe`:

```javascript
    describe('capitalized variants (sentence-start)', () => {
        // Use applyPronounPluralization directly via a mock zip to test edge
        // cases the canned causes don't necessarily exercise.
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('"She has" → "They have"', () => {
            const out = applyAndExtract('<w:t>She has standing.</w:t>');
            expect(out).toContain('They have standing.');
            expect(out).not.toContain('She has');
        });

        test('"He is" → "They are"', () => {
            const out = applyAndExtract('<w:t>He is a tenant.</w:t>');
            expect(out).toContain('They are a tenant.');
        });

        test('"His or her" → "Their"', () => {
            const out = applyAndExtract('<w:t>His or her tenancy.</w:t>');
            expect(out).toContain('Their tenancy.');
        });

        test('count=1 is no-op (preserves singular)', () => {
            const out = applyAndExtract('<w:t>She has standing.</w:t>', 1);
            expect(out).toContain('She has standing.');
        });
    });
```

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: capitalized pronoun variants and count=1 no-op"
```

---

## Task 6: Edge-case test — split-run verb agreement

**Files:**
- Modify: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Add test inside the existing `capitalized variants` describe block (or new block)**

Append inside the outer `describe`:

```javascript
    describe('split-run tolerance', () => {
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('verb across runs: <w:r>he</w:r><w:r> is</w:r> → they are', () => {
            const xml = '<w:p><w:r><w:t>he</w:t></w:r><w:r><w:t> is</w:t></w:r></w:p>';
            const out = applyAndExtract(xml);
            // After step 3 generic swap "he" → "they", and verb-agreement should
            // collapse "they is" across the run gap.
            expect(out).toMatch(/they.*are/);
            expect(out).not.toMatch(/they.*is/);
        });

        test('"his or her" split across runs preserved', () => {
            // If "his or her" is run-split, current phrase rule matches contiguous
            // text only — confirm no regression by running the raw contiguous case.
            const xml = '<w:t>his or her tenancy</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('their tenancy');
        });
    });
```

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS — split-run verb agreement works via `GAP` pattern.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: split-run tolerance for pronoun verb agreement"
```

---

## Task 7: Edge-case test — `[t]he` statutory citation preservation (unit-level)

**Files:**
- Modify: `tests/services/complaint-document-pronoun-pluralization.test.js`

- [ ] **Step 1: Add unit test for the negative-lookbehind**

Append inside the outer `describe`:

```javascript
    describe('[t]he statutory citation preservation', () => {
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('"[t]he remedies" preserved verbatim', () => {
            const xml = '<w:t>[t]he remedies provided by</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('[t]he remedies provided by');
        });

        test('"[T]he" capitalized variant preserved', () => {
            const xml = '<w:t>[T]he tenant</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('[T]he tenant');
        });

        test('standalone "he" still pluralized', () => {
            const xml = '<w:t>and he is liable</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('they are liable');
        });
    });
```

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS — negative lookbehind keeps `[t]he`/`[T]he` intact while still matching standalone `he`/`He`.

- [ ] **Step 3: Commit**

```bash
git add tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "test: [t]he statutory citation preserved through pronoun swap"
```

---

## Task 8: Form change — hide pronouns + move-in fields when total > 1

**Files:**
- Modify: `forms/complaint/js/form-logic.js:374-380`

- [ ] **Step 1: Locate the function**

The current `updateSinglePlaintiffFields` at `forms/complaint/js/form-logic.js:374`:

```javascript
    function updateSinglePlaintiffFields() {
        const container = document.getElementById('single-plaintiff-fields');
        if (!container) return;
        const typeSelects = document.querySelectorAll('#plaintiffs-container .party-block select[name$="-type"]');
        const individualCount = Array.from(typeSelects).filter(s => s.value === 'individual').length;
        container.style.display = individualCount === 1 ? '' : 'none';
    }
```

- [ ] **Step 2: Replace with total-count rule**

Replace the function body so visibility tracks total plaintiff count, not Individual count:

```javascript
    function updateSinglePlaintiffFields() {
        const container = document.getElementById('single-plaintiff-fields');
        if (!container) return;
        const totalPlaintiffs = document.querySelectorAll('#plaintiffs-container .party-block').length;
        container.style.display = totalPlaintiffs === 1 ? '' : 'none';
    }
```

- [ ] **Step 3: Manual sanity check**

The function is called from `addPlaintiff`, `removePlaintiff`/`reindexPlaintiffs`, and `toggleGuardian` (verify by grepping `updateSinglePlaintiffFields` in `forms/complaint/js/form-logic.js`). All call sites remain valid because the rule now depends only on count, not type.

Run: `grep -n "updateSinglePlaintiffFields" forms/complaint/js/form-logic.js`
Expected: at least 3 call sites (definition + invocations from addPlaintiff/reindexPlaintiffs/toggleGuardian).

- [ ] **Step 4: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "feat(complaint): hide single-plaintiff fields when total plaintiffs > 1"
```

---

## Task 9: Update backend `hasPronouns` / `hasMoveInDate` to use total count

**Files:**
- Modify: `services/complaint-document-generator.js:129-133`

- [ ] **Step 1: Update derivation**

In `services/complaint-document-generator.js`, find:

```javascript
        const individualPlaintiffs = plaintiffs.filter(p => p.type === 'individual');
        const singleIndividual = individualPlaintiffs.length === 1;
        const pronounSelection = pronounMap[caseInfo.pronouns];
        const hasMoveInDate = singleIndividual && caseInfo.moveInDate;
        const hasPronouns = singleIndividual && pronounSelection;
```

Replace with:

```javascript
        const singlePlaintiff = validPlaintiffs.length === 1;
        const pronounSelection = pronounMap[caseInfo.pronouns];
        const hasMoveInDate = singlePlaintiff && caseInfo.moveInDate;
        const hasPronouns = singlePlaintiff && pronounSelection;
```

This drops the `individualPlaintiffs` derivation since it's no longer needed (form now hides the fields when total > 1, so backend should mirror that gate).

- [ ] **Step 2: Run all complaint tests**

Run: `npm test -- tests/services/complaint-document-pluralization.test.js tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS for both suites.

- [ ] **Step 3: Manual smoke check that single-plaintiff path still works**

Add a quick test asserting that 1 plaintiff (Individual) with pronouns="female" + move-in-date set still resolves to actual values, not placeholders. Append inside the outer `describe`:

```javascript
    describe('1 plaintiff resolves pronouns + move-in date (regression)', () => {
        let text;
        beforeAll(async () => {
            const data = makeFormData(1);
            data['pronouns'] = 'female';
            data['move-in-date'] = '2020-05-01';
            const result = await generator.generateComplaint(data);
            text = extractText(result.outputPath);
        });

        test('move-in date is resolved (not placeholder)', () => {
            expect(text).toContain('May 1, 2020');
            expect(text).not.toContain('<Move In Date>');
        });

        test('pronouns are resolved (not placeholder)', () => {
            expect(text).not.toContain('<Pronoun Subject>');
            expect(text).not.toContain('<Pronoun Possessive>');
        });
    });
```

Run: `npm test -- tests/services/complaint-document-pronoun-pluralization.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add services/complaint-document-generator.js tests/services/complaint-document-pronoun-pluralization.test.js
git commit -m "feat(complaint): align hasPronouns/hasMoveInDate with total plaintiff count"
```

---

## Task 10: Full regression run

**Files:** none (verification only)

- [ ] **Step 1: Run full Jest suite**

Run: `npm test`
Expected: All suites pass. Pre-existing MuPDF WASM test failures (per project memory) are unrelated and acceptable.

- [ ] **Step 2: If any new failure appears, debug and fix**

Common failure modes:
- A regex in `applyPronounPluralization` accidentally matched a template variable name (e.g., `<Plaintiff Names>` containing pronoun-like substrings). Mitigation: template variables are already resolved by the time the post-processor runs, so this should not happen — but if it does, scope regexes more tightly.
- The `[t]he` lookbehind requires Node 10+; CI Node is 20+, so this is safe.

- [ ] **Step 3: Manual end-to-end test (browser)**

Start the dev server and exercise the form with 2 plaintiffs:

```bash
npm run dev
```

In a browser:
1. Open `http://localhost:3000/forms/complaint/` (or the configured port).
2. Add a second plaintiff. Verify the move-in date and pronouns fields disappear from page 1.
3. Fill all required fields, select 1+ causes (e.g., Constructive Eviction), submit.
4. Open the generated DOCX, search for "her home" and "his or her" — neither should appear.
5. Search for "their home" and "they have been" — should be present.
6. Search for `[t]he remedies` — should be preserved verbatim.

- [ ] **Step 4: Commit any fixes**

If Step 2 required code changes:

```bash
git add <files>
git commit -m "fix(complaint): <description>"
```

---

## Task 11: Open PR

**Files:** none

- [ ] **Step 1: Push branch**

```bash
git push -u origin claude/busy-buck-95605d
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat(complaint): pluralize pronouns for multi-plaintiff complaints" --body "$(cat <<'EOF'
## Summary
- Add `applyPronounPluralization()` post-processor that swaps singular pronouns (he/she/his/her/him) → plural (they/their/them) when complaint has multiple plaintiffs
- Includes object-pronoun allowlist, `[t]he` statutory-citation preservation, and verb-agreement fixes
- Form: hide pronouns + move-in date fields whenever total plaintiff count ≠ 1 (was: when Individual count ≠ 1)

## Test plan
- [x] Unit tests for single/multi-plaintiff scenarios, capitalized variants, split-runs, `[t]he` exception, object allowlist
- [x] Regression: existing `applyPluralization` tests still pass
- [ ] Manual: 2-plaintiff complaint generates with "they/their/them" throughout, no orphan singular pronouns

## Spec
docs/superpowers/specs/2026-04-30-multi-plaintiff-pronoun-pluralization-design.md
EOF
)"
```

Return the PR URL.
