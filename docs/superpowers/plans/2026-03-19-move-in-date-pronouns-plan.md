# Move-In Date & Preferred Pronouns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add move-in date and preferred pronoun fields to the complaint form that only appear with a single plaintiff, feeding template variables into the generated DOCX with yellow-highlighted placeholders as fallback.

**Architecture:** Two new form fields in a toggled container, collected in form submission, parsed in backend, replaced as docxtemplater template variables. When fields are empty or multiple plaintiffs exist, the DOCX post-processor injects yellow-highlighted placeholder text via XML manipulation.

**Tech Stack:** HTML/CSS/JS (vanilla frontend), Node.js/Express backend, docxtemplater + PizZip for DOCX generation

**Spec:** `docs/superpowers/specs/2026-03-19-move-in-date-pronouns-design.md`

---

### Task 1: Add HTML Fields to Plaintiff 1 Block

**Files:**
- Modify: `forms/complaint/index.html:121-130` (after guardian container, before closing party-block div)

- [ ] **Step 1: Add the single-plaintiff-fields container**

Insert after the `guardian-select-container` div (line ~128) and before the closing `</div>` of the first party-block, add:

```html
<div id="single-plaintiff-fields" class="single-plaintiff-fields">
    <div class="form-row two-col">
        <div class="form-group">
            <label for="move-in-date">Move-In Date</label>
            <input type="date" id="move-in-date" name="move-in-date">
        </div>
        <div class="form-group">
            <label for="pronouns">Preferred Pronouns</label>
            <select id="pronouns" name="pronouns">
                <option value="">Select pronouns...</option>
                <option value="male">he/him</option>
                <option value="female">she/her</option>
            </select>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Verify the form renders correctly**

Run: `npm run dev`
Open: `http://localhost:3000/complaint`
Expected: Move-in date and pronoun fields visible below plaintiff 1's name/type row.

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/index.html
git commit -m "feat: add move-in date and pronoun fields to plaintiff 1 block"
```

---

### Task 2: Add CSS for New Fields

**Files:**
- Modify: `forms/complaint/styles.css` (after `.guardian-select-container` styles, around line ~340)

- [ ] **Step 1: Add styles for the single-plaintiff-fields container**

Add after the `.guardian-select-container` rule:

```css
.single-plaintiff-fields {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
}

.form-row.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
```

Check if `.form-row.two-col` already exists in the stylesheet. If `.form-row.three-col` exists and `.two-col` does not, add only `.two-col`. If a general `.form-row` grid rule exists that already handles column variants, skip the `.two-col` rule.

- [ ] **Step 2: Verify styling**

Run: `npm run dev`
Expected: The two new fields sit side-by-side in a two-column layout with a subtle top border separating them from the name/type row above.

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/styles.css
git commit -m "style: add layout for single-plaintiff-fields container"
```

---

### Task 3: Add Visibility Toggle in form-logic.js

**Files:**
- Modify: `forms/complaint/js/form-logic.js`
  - Add `updateSinglePlaintiffFields()` function (after `updatePlaintiffCount()`, around line ~363)
  - Call it from `addPlaintiff()` (line ~301)
  - Call it from `reindexPlaintiffs()` (line ~357)

- [ ] **Step 1: Add the updateSinglePlaintiffFields function**

Insert after the `updatePlaintiffCount()` function (after line ~362):

```javascript
function updateSinglePlaintiffFields() {
    const container = document.getElementById('single-plaintiff-fields');
    if (!container) return;
    const plaintiffBlocks = document.querySelectorAll('#plaintiffs-container .party-block');
    container.style.display = plaintiffBlocks.length === 1 ? '' : 'none';
}
```

- [ ] **Step 2: Call from addPlaintiff()**

In the `addPlaintiff()` function, add after the existing `updateGuardianSelects()` call (line ~301):

```javascript
updateSinglePlaintiffFields();
```

- [ ] **Step 3: Call from reindexPlaintiffs()**

In the `reindexPlaintiffs()` function, add after the existing `updateGuardianSelects()` call (line ~357):

```javascript
updateSinglePlaintiffFields();
```

- [ ] **Step 4: Verify toggle behavior**

Run: `npm run dev`
1. Load form — fields visible (1 plaintiff)
2. Click "Add Plaintiff" — fields disappear
3. Remove the second plaintiff — fields reappear with previous values preserved

- [ ] **Step 5: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "feat: toggle single-plaintiff fields on add/remove plaintiff"
```

---

### Task 4: Collect New Fields in form-submission.js

**Files:**
- Modify: `forms/complaint/js/form-submission.js:58-66` (case info collection section)

- [ ] **Step 1: Add field collection**

In the `collectFormData()` function, after the existing case info fields (around line ~64, after `data['county']`), add:

```javascript
data['move-in-date'] = document.getElementById('move-in-date').value;
data['pronouns'] = document.getElementById('pronouns').value;
```

These always collect the values regardless of plaintiff count. The backend decides whether to use them or fall back to highlighted placeholders.

- [ ] **Step 2: Verify data collection**

Run: `npm run dev`
Open browser console. Set a breakpoint or add `console.log(data)` in `collectFormData()`.
Fill in move-in date and pronouns, trigger form submission.
Expected: `data['move-in-date']` = `"2011-02-25"`, `data['pronouns']` = `"male"` (or `"female"` or `""`)

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/js/form-submission.js
git commit -m "feat: collect move-in date and pronouns in form submission"
```

---

### Task 5: Parse New Fields in Backend

**Files:**
- Modify: `services/complaint-document-generator.js:167-203` (parseFormData function)

- [ ] **Step 1: Extract moveInDate and pronouns in parseFormData()**

In the `parseFormData()` function, within the `caseInfo` object construction (around lines 168-175), add:

```javascript
moveInDate: formData['move-in-date'] || '',
pronouns: formData['pronouns'] || '',
```

- [ ] **Step 2: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: parse move-in date and pronouns from form data"
```

---

### Task 6: Add Template Variable Replacement

**Files:**
- Modify: `services/complaint-document-generator.js:112-128` (templateData construction)

- [ ] **Step 1: Add pronoun mapping and template variables**

Before the `templateData` object (around line ~110), add the pronoun resolution logic:

```javascript
const pronounMap = {
    male: { subject: 'he', possessive: 'his' },
    female: { subject: 'she', possessive: 'her' },
};

const plaintiffCount = plaintiffs.length;
const pronounSelection = pronounMap[caseInfo.pronouns];
const hasMoveInDate = plaintiffCount === 1 && caseInfo.moveInDate;
const hasPronouns = plaintiffCount === 1 && pronounSelection;

const moveInDateValue = hasMoveInDate
    ? new Date(caseInfo.moveInDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '<Move In Date>';

const pronounSubjectValue = hasPronouns ? pronounSelection.subject : '<Pronoun Subject>';
const pronounPossessiveValue = hasPronouns ? pronounSelection.possessive : '<Pronoun Possessive>';
```

Note: The `+ 'T00:00:00'` prevents timezone-related off-by-one date parsing from the `YYYY-MM-DD` input value.

- [ ] **Step 2: Add to templateData object**

In the `templateData` object, add these three entries:

```javascript
'Move In Date': moveInDateValue,
'Pronoun Subject': pronounSubjectValue,
'Pronoun Possessive': pronounPossessiveValue,
```

- [ ] **Step 3: Track which placeholders need highlighting**

After the `doc.render(templateData)` call, build the list of placeholders that were left unresolved (for the yellow highlight post-processor in Task 7):

```javascript
const highlightPlaceholders = [];
if (!hasMoveInDate) highlightPlaceholders.push('<Move In Date>');
if (!hasPronouns) {
    highlightPlaceholders.push('<Pronoun Subject>');
    highlightPlaceholders.push('<Pronoun Possessive>');
}
```

- [ ] **Step 4: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: add template variable replacement for move-in date and pronouns"
```

---

### Task 7: Add Yellow Highlight Post-Processing

**Files:**
- Modify: `services/complaint-document-generator.js` (add function near `splitCausesListIntoParagraphs`, around line ~316)

This follows the same pattern as the existing `splitCausesListIntoParagraphs()` function which already manipulates the DOCX XML via PizZip.

- [ ] **Step 1: Add the applyYellowHighlight function**

Add near the other post-processing functions:

```javascript
/**
 * Post-processes DOCX XML to apply yellow highlight to placeholder text.
 * @param {PizZip} zip - The PizZip instance of the rendered DOCX
 * @param {string[]} placeholders - Array of placeholder strings to highlight
 */
function applyYellowHighlight(zip, placeholders) {
    if (!placeholders.length) return;

    const docXml = zip.file('word/document.xml').asText();
    let modified = docXml;

    for (const placeholder of placeholders) {
        // Escape special regex characters in the placeholder text
        const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Match <w:r> elements containing the placeholder text in their <w:t> node
        // The placeholder may appear as: <w:r><w:rPr>...</w:rPr><w:t>placeholder</w:t></w:r>
        // or without rPr: <w:r><w:t>placeholder</w:t></w:r>
        const pattern = new RegExp(
            `(<w:r>)(\\s*(?:<w:rPr>([\\s\\S]*?)</w:rPr>)?\\s*<w:t[^>]*>${escaped}</w:t>)`,
            'g'
        );

        modified = modified.replace(pattern, (match, rOpen, rest, existingRPr) => {
            if (existingRPr !== undefined) {
                // Has existing rPr — inject highlight inside it
                const highlightTag = '<w:highlight w:val="yellow"/>';
                if (existingRPr.includes('w:highlight')) return match; // already highlighted
                const updatedRPr = existingRPr + highlightTag;
                return `${rOpen}<w:rPr>${updatedRPr}</w:rPr>${rest.replace(`<w:rPr>${existingRPr}</w:rPr>`, '')}`;
            } else {
                // No rPr — add one with highlight
                return `${rOpen}<w:rPr><w:highlight w:val="yellow"/></w:rPr>${rest}`;
            }
        });
    }

    zip.file('word/document.xml', modified);
}
```

- [ ] **Step 2: Call applyYellowHighlight after doc.render()**

In the `generate()` method, after `doc.render(templateData)` and after building `highlightPlaceholders` (from Task 6 Step 3), add:

```javascript
if (highlightPlaceholders.length > 0) {
    applyYellowHighlight(zip, highlightPlaceholders);
}
```

Make sure this runs on the same `zip` instance used by docxtemplater. The existing code pattern is:
```javascript
const zip = new PizZip(templateContent);
const doc = new Docxtemplater(zip, { delimiters: { start: '<', end: '>' } });
doc.render(templateData);
// ... post-processing happens here on `zip`
```

- [ ] **Step 3: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: add yellow highlight post-processing for unresolved placeholders"
```

---

### Task 8: Add Template Placeholders to DOCX Template

**Files:**
- Modify: `templates/Legal Complaint - Template.docx`

- [ ] **Step 1: Add placeholder tags to the template**

Open the DOCX template and add these placeholders where they should appear in the complaint document:
- `<Move In Date>` — in the body text where the plaintiff's move-in date is referenced
- `<Pronoun Subject>` — wherever "he"/"she" should appear referencing the plaintiff
- `<Pronoun Possessive>` — wherever "his"/"her" should appear referencing the plaintiff

The exact placement depends on the template's legal language. Look for existing plaintiff-related paragraphs and insert the placeholders where move-in date and pronouns would naturally appear.

Note: These placeholders use the same `< >` delimiter syntax as existing variables (`<Plaintiff Names>`, `<Date>`, etc.).

- [ ] **Step 2: Commit**

```bash
git add "templates/Legal Complaint - Template.docx"
git commit -m "feat: add move-in date and pronoun placeholders to complaint template"
```

---

### Task 9: Manual End-to-End Testing

- [ ] **Step 1: Test single plaintiff with all fields filled**

Run: `npm run dev`
1. Fill in case info, one plaintiff, set move-in date to `2011-02-25`, pronouns to "he/him"
2. Select causes of action, generate complaint
3. Open generated DOCX
4. Verify: `<Move In Date>` → "February 25, 2011", `<Pronoun Subject>` → "he", `<Pronoun Possessive>` → "his"
5. No yellow highlights should appear

- [ ] **Step 2: Test single plaintiff with empty fields**

1. Fill in one plaintiff, leave move-in date blank and pronouns on "Select pronouns..."
2. Generate complaint
3. Open generated DOCX
4. Verify: `<Move In Date>`, `<Pronoun Subject>`, `<Pronoun Possessive>` appear as literal text with yellow highlight

- [ ] **Step 3: Test multiple plaintiffs**

1. Add two plaintiffs
2. Verify move-in date and pronoun fields are hidden
3. Generate complaint
4. Open generated DOCX
5. Verify: all three placeholders appear as literal text with yellow highlight

- [ ] **Step 4: Test toggle preservation**

1. Start with one plaintiff, set move-in date and pronouns
2. Add second plaintiff — fields disappear
3. Remove second plaintiff — fields reappear
4. Verify values are preserved (same date and pronoun selection)

- [ ] **Step 5: Test she/her pronouns**

1. Single plaintiff, select "she/her"
2. Generate complaint
3. Verify: `<Pronoun Subject>` → "she", `<Pronoun Possessive>` → "her"

- [ ] **Step 6: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

### Task 10: Final Commit and Cleanup

- [ ] **Step 1: Verify all changes are committed**

```bash
git status
git log --oneline -10
```

- [ ] **Step 2: Verify the dev server runs cleanly**

```bash
npm run dev
```

No errors in console. Form loads, fields toggle, generation works.
