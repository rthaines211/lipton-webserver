# Defendant Type Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand defendant types to 7, consolidate first/last name into a single Name field, and make Filing Date fully optional.

**Architecture:** Four files modified in sequence — HTML structure first, then JS form logic, then data collection, then backend generation. No new files created.

**Tech Stack:** HTML, vanilla JS, Node.js (complaint-document-generator.js)

**Spec:** `docs/superpowers/specs/2026-03-20-defendant-type-enhancements-design.md`

---

### Task 1: Make Filing Date Fully Optional

**Files:**
- Modify: `forms/complaint/index.html:65-67`

- [ ] **Step 1: Remove required asterisk and attribute from Filing Date**

In `forms/complaint/index.html`, change lines 65-67 from:

```html
<label for="filing-date">Filing Date <span class="required">*</span></label>
<input type="date" id="filing-date" name="filing-date" required>
```

To:

```html
<label for="filing-date">Filing Date</label>
<input type="date" id="filing-date" name="filing-date">
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Open the complaint form. Confirm Filing Date no longer shows a red asterisk and the form submits without a filing date.

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/index.html
git commit -m "fix: make filing date fully optional — remove asterisk and required attr"
```

---

### Task 2: Update Defendant 1 HTML (index.html)

**Files:**
- Modify: `forms/complaint/index.html:166-187`

- [ ] **Step 1: Replace Defendant 1 block**

In `forms/complaint/index.html`, replace the Defendant 1 block (lines 166-187):

```html
<div class="party-block" data-index="1">
    <div class="party-header">
        <h3>Defendant 1</h3>
    </div>
    <div class="form-row three-col">
        <div class="form-group">
            <label>First Name <span class="required">*</span></label>
            <input type="text" name="defendant-1-first-name" required placeholder="First name">
        </div>
        <div class="form-group">
            <label>Last Name <span class="required">*</span></label>
            <input type="text" name="defendant-1-last-name" required placeholder="Last name">
        </div>
        <div class="form-group">
            <label>Type</label>
            <select name="defendant-1-type">
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
            </select>
        </div>
    </div>
</div>
```

With:

```html
<div class="party-block" data-index="1">
    <div class="party-header">
        <h3>Defendant 1</h3>
    </div>
    <div class="form-row two-col">
        <div class="form-group">
            <label>Name <span class="required">*</span></label>
            <input type="text" name="defendant-1-name" required placeholder="First and last name">
        </div>
        <div class="form-group">
            <label>Type</label>
            <select name="defendant-1-type" onchange="window.complaintForm.updateDefendantPlaceholder(this)">
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="government_entity">Government Entity</option>
                <option value="trust">Trust</option>
                <option value="estate">Estate</option>
                <option value="partnership">Partnership</option>
                <option value="association">Association</option>
            </select>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add forms/complaint/index.html
git commit -m "feat: update Defendant 1 HTML — single name field, 7 types, two-col layout"
```

---

### Task 3: Update addDefendant() and Add Placeholder Logic (form-logic.js)

**Files:**
- Modify: `forms/complaint/js/form-logic.js:414-441` (addDefendant template)
- Modify: `forms/complaint/js/form-logic.js` (add updateDefendantPlaceholder function, export it)

- [ ] **Step 1: Add the placeholder map and update function**

In `forms/complaint/js/form-logic.js`, add the following function just before the `addDefendant()` function (find the line `function addDefendant() {`):

```javascript
const defendantPlaceholders = {
    individual: 'First and last name',
    corporate: 'Corporation or LLC name',
    government_entity: 'Agency or department name',
    trust: 'Trust name',
    estate: 'Estate name',
    partnership: 'Partnership name',
    association: 'Association or HOA name',
};

function updateDefendantPlaceholder(selectEl) {
    const nameInput = selectEl.closest('.party-block').querySelector('input[name$="-name"]');
    if (nameInput) {
        nameInput.placeholder = defendantPlaceholders[selectEl.value] || 'Name';
    }
}
```

- [ ] **Step 2: Update addDefendant() template**

Replace the innerHTML template inside `addDefendant()` (lines 414-438). Find the block:

```javascript
        block.innerHTML = `
            <div class="party-header">
                <h3>Defendant ${defendantCount}</h3>
                <button type="button" class="btn-remove" onclick="window.complaintForm.removeDefendant(${defendantCount})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="form-row three-col">
                <div class="form-group">
                    <label>First Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-first-name" required placeholder="First name">
                </div>
                <div class="form-group">
                    <label>Last Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-last-name" required placeholder="Last name">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="defendant-${defendantCount}-type">
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                    </select>
                </div>
            </div>
        `;
```

Replace with:

```javascript
        block.innerHTML = `
            <div class="party-header">
                <h3>Defendant ${defendantCount}</h3>
                <button type="button" class="btn-remove" onclick="window.complaintForm.removeDefendant(${defendantCount})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label>Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-name" required placeholder="First and last name">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="defendant-${defendantCount}-type" onchange="window.complaintForm.updateDefendantPlaceholder(this)">
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                        <option value="government_entity">Government Entity</option>
                        <option value="trust">Trust</option>
                        <option value="estate">Estate</option>
                        <option value="partnership">Partnership</option>
                        <option value="association">Association</option>
                    </select>
                </div>
            </div>
        `;
```

- [ ] **Step 3: Export updateDefendantPlaceholder**

In `forms/complaint/js/form-logic.js`, find the export object at line 556:

```javascript
    window.complaintForm = {
        removePlaintiff,
        removeDefendant,
        toggleGuardian
    };
```

Replace with:

```javascript
    window.complaintForm = {
        removePlaintiff,
        removeDefendant,
        toggleGuardian,
        updateDefendantPlaceholder
    };
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
- Add a defendant, confirm single Name field with two-col layout
- Change type dropdown, confirm placeholder text changes
- Remove defendant, confirm reindexing works

- [ ] **Step 5: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "feat: single name field with dynamic placeholder, 7 defendant types"
```

---

### Task 4: Update Data Collection (form-submission.js)

**Files:**
- Modify: `forms/complaint/js/form-submission.js:126-133`

- [ ] **Step 1: Update defendant data collection**

In `forms/complaint/js/form-submission.js`, find the defendant collection block (lines 126-133):

```javascript
        const defendantBlocks = document.querySelectorAll('#defendants-container .party-block');
        defendantBlocks.forEach((block, i) => {
            const num = i + 1;
            const firstName = block.querySelector(`[name="defendant-${num}-first-name"]`);
            const lastName = block.querySelector(`[name="defendant-${num}-last-name"]`);
            const type = block.querySelector(`[name="defendant-${num}-type"]`);
            if (firstName) data[`defendant-${num}-first-name`] = firstName.value;
            if (lastName) data[`defendant-${num}-last-name`] = lastName.value;
            if (type) data[`defendant-${num}-type`] = type.value;
        });
```

Replace with:

```javascript
        const defendantBlocks = document.querySelectorAll('#defendants-container .party-block');
        defendantBlocks.forEach((block, i) => {
            const num = i + 1;
            const name = block.querySelector(`[name="defendant-${num}-name"]`);
            const type = block.querySelector(`[name="defendant-${num}-type"]`);
            if (name) data[`defendant-${num}-name`] = name.value;
            if (type) data[`defendant-${num}-type`] = type.value;
        });
```

- [ ] **Step 2: Commit**

```bash
git add forms/complaint/js/form-submission.js
git commit -m "feat: collect single defendant name field instead of first/last"
```

---

### Task 5: Update Backend Document Generator

**Files:**
- Modify: `services/complaint-document-generator.js:65` (validity filter)
- Modify: `services/complaint-document-generator.js:98-112` (name formatting + descriptors)
- Modify: `services/complaint-document-generator.js:238-247` (parseFormData)

- [ ] **Step 1: Update parseFormData**

In `services/complaint-document-generator.js`, find the defendant parsing loop (lines 238-247):

```javascript
        const defendants = [];
        const defendantCount = parseInt(formData.defendantCount) || 1;
        for (let i = 1; i <= defendantCount; i++) {
            defendants.push({
                index: i,
                firstName: formData[`defendant-${i}-first-name`] || '',
                lastName: formData[`defendant-${i}-last-name`] || '',
                type: formData[`defendant-${i}-type`] || 'individual',
            });
        }
```

Replace with:

```javascript
        const defendants = [];
        const defendantCount = parseInt(formData.defendantCount) || 1;
        for (let i = 1; i <= defendantCount; i++) {
            defendants.push({
                index: i,
                name: formData[`defendant-${i}-name`] || '',
                type: formData[`defendant-${i}-type`] || 'individual',
            });
        }
```

- [ ] **Step 2: Update validity filter**

Find line 65:

```javascript
        const validDefendants = defendants.filter(d => d.firstName || d.lastName);
```

Replace with:

```javascript
        const validDefendants = defendants.filter(d => d.name);
```

- [ ] **Step 3: Update defendant name formatting and type descriptors**

Find the defendant names block (lines 98-112):

```javascript
        // Build defendant names (ALL CAPS, semicolon-separated)
        const defendantNames = validDefendants
            .map(d => `${d.firstName} ${d.lastName}`.trim().toUpperCase())
            .join('; ');

        // Build defendant names with types
        const defendantNamesWithTypes = validDefendants
            .map(d => {
                const name = `${d.firstName} ${d.lastName}`.trim().toUpperCase();
                if (d.type === 'corporate') {
                    return `${name}, a corporate entity`;
                }
                return `${name}, an individual`;
            })
            .join('; ');
```

Replace with:

```javascript
        // Build defendant names (ALL CAPS, semicolon-separated)
        const defendantNames = validDefendants
            .map(d => d.name.trim().toUpperCase())
            .join('; ');

        // Type descriptor map
        const defendantTypeDescriptors = {
            individual: 'an individual',
            corporate: 'a corporate entity',
            government_entity: 'a government entity',
            trust: 'a trust',
            estate: 'an estate',
            partnership: 'a partnership',
            association: 'an association',
        };

        // Build defendant names with types
        const defendantNamesWithTypes = validDefendants
            .map(d => {
                const name = d.name.trim().toUpperCase();
                const descriptor = defendantTypeDescriptors[d.type] || 'an individual';
                return `${name}, ${descriptor}`;
            })
            .join('; ');
```

- [ ] **Step 4: Verify end-to-end**

Run: `npm run dev`
1. Fill out the complaint form with multiple defendants of different types
2. Generate the document
3. Open the DOCX and verify `<Defendant Names>` and `<Defendant Names With Types>` are correct

- [ ] **Step 5: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: backend support for single name field and 7 defendant types"
```
