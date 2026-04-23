# LLC Defendant Type + Causes of Action Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Limited Liability Company" as a separate defendant type and replace the causes of action JSON with the authoritative 46-cause CSV (corrected categories, fixed General ordering).

**Architecture:** Three small edits add the LLC type across HTML, frontend JS, and backend JS. One large data replacement rebuilds `causes-of-action.json` from CSV. No frontend rendering changes needed — JSON array order determines display order.

**Tech Stack:** Node.js, vanilla JS, HTML, JSON

**Spec:** `docs/superpowers/specs/2026-04-23-llc-type-and-causes-overhaul-design.md`

---

### Task 1: Add LLC defendant type to HTML form

**Files:**
- Modify: `forms/complaint/index.html:177-185`

- [ ] **Step 1: Add LLC option to defendant-1 type dropdown**

In `forms/complaint/index.html`, find the defendant-1 type `<select>` (around line 177). Add the LLC option after the `corporate` option:

```html
<select name="defendant-1-type" onchange="window.complaintForm.updateDefendantPlaceholder(this)">
    <option value="individual">Individual</option>
    <option value="corporate">Corporate</option>
    <option value="llc">Limited Liability Company</option>
    <option value="government_entity">Government Entity</option>
    <option value="trust">Trust</option>
    <option value="estate">Estate</option>
    <option value="partnership">Partnership</option>
    <option value="association">Association</option>
</select>
```

- [ ] **Step 2: Commit**

```bash
git add forms/complaint/index.html
git commit -m "feat: add LLC option to defendant-1 type dropdown in HTML"
```

---

### Task 2: Add LLC defendant type to frontend JS

**Files:**
- Modify: `forms/complaint/js/form-logic.js:407-414` (defendantPlaceholders)
- Modify: `forms/complaint/js/form-logic.js:445-452` (addDefendant template)

- [ ] **Step 1: Update defendantPlaceholders map**

In `forms/complaint/js/form-logic.js`, find the `defendantPlaceholders` object (around line 407). Change `corporate` placeholder and add `llc`:

```javascript
const defendantPlaceholders = {
    individual: 'First and last name',
    corporate: 'Corporation name',
    llc: 'LLC name',
    government_entity: 'Agency or department name',
    trust: 'Trust name',
    estate: 'Estate name',
    partnership: 'Partnership name',
    association: 'Association or HOA name',
};
```

- [ ] **Step 2: Update addDefendant() dropdown template**

In the same file, find the `addDefendant()` function's HTML template (around line 445). Add the LLC option after `corporate`:

```html
<select name="defendant-${defendantCount}-type" onchange="window.complaintForm.updateDefendantPlaceholder(this)">
    <option value="individual">Individual</option>
    <option value="corporate">Corporate</option>
    <option value="llc">Limited Liability Company</option>
    <option value="government_entity">Government Entity</option>
    <option value="trust">Trust</option>
    <option value="estate">Estate</option>
    <option value="partnership">Partnership</option>
    <option value="association">Association</option>
</select>
```

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "feat: add LLC to defendant placeholders and addDefendant dropdown"
```

---

### Task 3: Add LLC defendant type to backend generator

**Files:**
- Modify: `services/complaint-document-generator.js:104-112` (defendantTypeDescriptors)

- [ ] **Step 1: Add LLC to defendantTypeDescriptors map**

In `services/complaint-document-generator.js`, find the `defendantTypeDescriptors` object (around line 104). Add `llc`:

```javascript
const defendantTypeDescriptors = {
    individual: 'an individual',
    corporate: 'a corporate entity',
    llc: 'a limited liability company',
    government_entity: 'a government entity',
    trust: 'a trust',
    estate: 'an estate',
    partnership: 'a partnership',
    association: 'an association',
};
```

- [ ] **Step 2: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: add LLC type descriptor to complaint document generator"
```

---

### Task 4: Generate new causes-of-action.json from CSV

**Files:**
- Create: `scripts/generate-causes-json.js` (temporary build script)
- Replace: `data/causes-of-action.json`

This task uses a Node.js script to parse the CSV and produce the correctly structured JSON. The script is a one-time build tool.

- [ ] **Step 1: Create the CSV-to-JSON conversion script**

Create `scripts/generate-causes-json.js`:

```javascript
#!/usr/bin/env node
/**
 * One-time script: converts the authoritative Cause of Actions CSV
 * into data/causes-of-action.json with correct categories, ordering,
 * and pronoun token preservation.
 *
 * Usage: node scripts/generate-causes-json.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'docs', 'Cause of Action Master List.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'causes-of-action.json');

// Read and parse CSV (handles quoted fields with embedded newlines)
const raw = fs.readFileSync(CSV_PATH, 'utf8');

function parseCSV(text) {
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"';
                i++; // skip escaped quote
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                current.push(field);
                field = '';
            } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
                current.push(field);
                field = '';
                if (current.length > 1 || current[0] !== '') {
                    rows.push(current);
                }
                current = [];
                if (ch === '\r') i++; // skip \n after \r
            } else {
                field += ch;
            }
        }
    }
    // Last field/row
    if (field || current.length > 0) {
        current.push(field);
        rows.push(current);
    }
    return rows;
}

const rows = parseCSV(raw);
const header = rows[0]; // Category, Order, Checkbox Text, Heading, Insert Text
const dataRows = rows.slice(1);

// Category mapping from CSV to JSON
const categoryMap = {
    'General': 'general',
    'Special': 'special',
    'City - Los Angeles': 'los-angeles',
    'City - Santa Monica': 'santa-monica',
};

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Convert pronoun references: the CSV uses "her", "she", "his", "he", "him"
// literally. We need to replace them with <Pronoun Subject/Possessive/Object>
// tokens. BUT — these are legal texts where the pronouns are part of the
// template language already using PLAINTIFF/DEFENDANTS. The existing JSON
// already has <Pronoun ...> tokens placed manually.
//
// Strategy: use the CSV text as-is. The CSV text does NOT contain pronoun
// tokens — those were added manually to the existing JSON. We need to
// preserve the raw CSV text and NOT add pronoun tokens automatically
// (they'd be wrong in most contexts). The pronoun tokens will need to be
// re-added manually or carried forward from the existing JSON where the
// cause IDs match.
//
// CORRECTION: Looking at the existing JSON, pronoun tokens WERE in the
// insertText. But the CSV is the authoritative source. We'll use CSV text
// as-is. If pronoun tokens are needed, they should be in the CSV.

const causes = [];

for (const row of dataRows) {
    if (row.length < 5) continue;

    const [csvCategory, csvOrder, checkboxText, heading, insertText] = row;

    const category = categoryMap[csvCategory.trim()];
    if (!category) {
        console.warn(`Unknown category: "${csvCategory.trim()}" — skipping`);
        continue;
    }

    const id = slugify(checkboxText.trim());
    const order = csvOrder.trim() !== 'N/A' ? parseInt(csvOrder.trim(), 10) : null;

    const cause = {
        id,
        category,
        checkboxText: checkboxText.trim(),
        heading: heading.trim(),
        insertText: insertText.trim(),
    };

    if (order !== null) {
        cause.order = order;
    }

    causes.push(cause);
}

// Sort: General causes by order first, then Special, LA, Santa Monica in CSV order
const categoryOrder = ['general', 'special', 'los-angeles', 'santa-monica'];
causes.sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category);
    const catB = categoryOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    // Within general, sort by order
    if (a.category === 'general') return (a.order || 99) - (b.order || 99);
    // Others: preserve CSV order (stable sort)
    return 0;
});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(causes, null, 2) + '\n');
console.log(`Wrote ${causes.length} causes to ${OUTPUT_PATH}`);

// Print summary
const summary = {};
for (const c of causes) {
    summary[c.category] = (summary[c.category] || 0) + 1;
}
console.log('Category breakdown:', summary);
```

- [ ] **Step 2: Copy the CSV to the project docs folder**

The CSV is currently at `/Users/ryanhaines/Downloads/Cause of Actions Breakdown.csv`. Copy it into the project so the script can reference it:

```bash
cp "/Users/ryanhaines/Downloads/Cause of Actions Breakdown.csv" "/Users/ryanhaines/Projects/Lipton Webserver/docs/Cause of Action Master List.csv"
```

Note: The project already has `docs/Cause of Action Master List.csv` and `docs/Cause of Action Master List.xlsx` tracked. The download CSV may have updated content — use the download version.

- [ ] **Step 3: Run the conversion script**

```bash
cd "/Users/ryanhaines/Projects/Lipton Webserver"
node scripts/generate-causes-json.js
```

Expected output:
```
Wrote 46 causes to /Users/ryanhaines/Projects/Lipton Webserver/data/causes-of-action.json
Category breakdown: { general: 16, special: 20, 'los-angeles': 8, 'santa-monica': 2 }
```

If the count is not 46 or the breakdown doesn't match, investigate the CSV parsing.

- [ ] **Step 4: Verify the generated JSON structure**

Spot-check the output:

```bash
node -e "
const data = require('./data/causes-of-action.json');
console.log('Total causes:', data.length);
console.log('First general:', data[0].id, 'order:', data[0].order, 'category:', data[0].category);
console.log('Last general:', data[15].id, 'order:', data[15].order);
console.log('First special:', data[16].id, 'category:', data[16].category);
console.log('Has order field on special?', 'order' in data[16]);
"
```

Expected:
```
Total causes: 46
First general: constructive-eviction order: 1 category: general
Last general: unlawful-retention-of-security-deposit order: 16
First special: fraud-or-deceit category: special
Has order field on special? false
```

- [ ] **Step 5: Commit**

```bash
git add data/causes-of-action.json scripts/generate-causes-json.js
git commit -m "feat: replace causes-of-action.json with authoritative 46-cause CSV data

- 16 General causes (ordered 1-16)
- 20 Special causes
- 8 Los Angeles causes
- 2 Santa Monica causes
- Corrected category assignments
- Added order field for General causes"
```

---

### Task 5: Verify the full application works

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/ryanhaines/Projects/Lipton Webserver"
npm run dev
```

- [ ] **Step 2: Test LLC defendant type**

Open `http://localhost:3000/complaint` (or the complaint form URL). Verify:
1. Defendant 1's type dropdown shows "Limited Liability Company" after "Corporate"
2. Selecting "Limited Liability Company" changes the placeholder to "LLC name"
3. Selecting "Corporate" shows placeholder "Corporation name" (not "Corporation or LLC name")
4. Click "Add Defendant" — the new defendant also has the LLC option
5. Fill in a defendant with type LLC, generate a complaint — verify the DOCX says "a limited liability company" after the defendant name

- [ ] **Step 3: Test causes of action**

On the complaint form page 2 (Causes of Action):
1. **General section**: verify 16 causes appear in order (Constructive Eviction first, Unlawful Retention of Security Deposit last)
2. **Special section**: verify 20 causes appear
3. **Los Angeles section**: verify 8 causes appear (select Los Angeles as city to reveal)
4. **Santa Monica section**: verify 2 causes appear (select Santa Monica as city to reveal)
5. **Count badges**: verify each category header shows correct count — (16), (20), (8), (2)
6. Click an ⓘ button — verify the sidebar preview shows heading and insert text
7. Select a few causes and generate — verify they appear in the DOCX output

- [ ] **Step 4: Run existing tests**

```bash
npm test
```

Verify no regressions. If complaint-specific tests reference old cause IDs that no longer exist, update them.

- [ ] **Step 5: Commit any test fixes if needed**

```bash
git add -A
git commit -m "fix: update tests for new causes of action data"
```

---

### Task 6: Clean up

**Files:**
- Delete: `scripts/generate-causes-json.js` (one-time script, no longer needed)

- [ ] **Step 1: Remove the conversion script**

```bash
rm scripts/generate-causes-json.js
```

- [ ] **Step 2: Commit cleanup**

```bash
git add scripts/generate-causes-json.js
git commit -m "chore: remove one-time CSV conversion script"
```

---

## Deployment Notes

After all tasks are complete:
1. User must manually edit `templates/Legal Complaint - Template.docx` before deploying
2. Push to `main` triggers auto-deploy via `.github/workflows/deploy-complaint-creator.yml`
3. Deploy trigger paths include `data/causes-of-action.json`, `forms/complaint/**`, `services/complaint-document-generator.js`, and `templates/**`
