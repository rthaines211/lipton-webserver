# Spanish Retainer Agreement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-plaintiff language selection (English/Spanish) to the contingency fee agreement form so each plaintiff's generated DOCX agreement uses the correct language template.

**Architecture:** Separate Spanish DOCX templates with identical placeholders. The form adds a language dropdown per plaintiff. The document generator picks the template based on language + minor status. No database changes needed.

**Tech Stack:** Vanilla HTML/CSS/JS (frontend), Node.js/Express (backend), docxtemplater (DOCX generation), PizZip

---

### Task 1: Add Language Dropdown to Plaintiff Block Template

**Files:**
- Modify: `forms/agreement/js/form-logic.js:20-100` (the `addPlaintiff()` function's innerHTML template)

**Step 1: Add the language dropdown HTML**

In `form-logic.js`, inside the `addPlaintiff()` function, add a language dropdown after the name fields grid (line 38, after the closing `</div>` of the first `form-grid`). Insert this new `form-grid` block:

```javascript
            <div class="form-grid" style="margin-top: 15px;">
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-language">Agreement Language</label>
                    <select id="plaintiff-${plaintiffCount}-language" name="plaintiff-${plaintiffCount}-language">
                        <option value="english" selected>English</option>
                        <option value="spanish">Spanish</option>
                    </select>
                </div>
            </div>
```

Insert this block between the name fields grid (ending at line 38) and the email/phone/unit grid (starting at line 40). The exact insertion point is after:
```javascript
            </div>
```
(line 38 — the closing `</div>` of the first `form-grid` containing first name and last name)

and before:
```javascript
            <div class="form-grid">
                <div class="form-group" style="flex: 9;">
                    <label for="plaintiff-${plaintiffCount}-email">Email Address
```
(line 40)

**Step 2: Verify the form renders correctly**

Run: `npm run dev` (or open `forms/agreement/index.html` locally)
Expected: Each plaintiff block shows "Agreement Language" dropdown with "English" selected by default, positioned between name fields and email/phone fields.

**Step 3: Commit**

```bash
git add forms/agreement/js/form-logic.js
git commit -m "feat: Add language dropdown to plaintiff block in agreement form"
```

---

### Task 2: Update Renumbering Logic for Language Dropdown

**Files:**
- Modify: `forms/agreement/js/form-logic.js:178-238` (the `updatePlaintiffReferences()` function)

**Step 1: Verify renumbering already handles the new field**

The existing `updatePlaintiffReferences()` function at line 178 already updates ALL `input` and `select` elements in a plaintiff block:

```javascript
const inputs = block.querySelectorAll('input, select');
inputs.forEach(input => {
    if (input.id) {
        input.id = input.id.replace(`plaintiff-${oldNumber}-`, `plaintiff-${newNumber}-`);
    }
    if (input.name) {
        input.name = input.name.replace(`plaintiff-${oldNumber}-`, `plaintiff-${newNumber}-`);
    }
});
```

Since it uses `querySelectorAll('input, select')`, the new `<select>` for language will automatically be renumbered. **No code change needed here.**

Similarly, the label `for` attributes are updated by the existing loop at line 191.

**Step 2: Test renumbering manually**

Run the app, add 3 plaintiffs, set plaintiff 2's language to "Spanish", then remove plaintiff 1. Verify:
- Plaintiff numbering updates correctly (old #2 becomes #1, old #3 becomes #2)
- The language dropdown retains its "Spanish" selection for the renumbered plaintiff
- Field IDs and names update correctly (inspect with browser DevTools)

**Step 3: Commit (skip if no changes needed)**

No commit needed — this task is verification only.

---

### Task 3: Collect Language in Form Submission

**Files:**
- Modify: `forms/agreement/js/form-submission.js:91-113` (inside the `collectFormData()` plaintiff loop)

**Step 1: Add language collection**

In `form-submission.js`, inside the plaintiff data collection loop (line 91: `for (let i = 1; i <= plaintiffCount; i++)`), add this line after line 96 (the phone field collection):

```javascript
        formData[`plaintiff-${i}-language`] = document.getElementById(`plaintiff-${i}-language`)?.value || 'english';
```

The full plaintiff collection block should read (lines 91-113 with the addition):

```javascript
    for (let i = 1; i <= plaintiffCount; i++) {
        formData[`plaintiff-${i}-first-name`] = document.getElementById(`plaintiff-${i}-first-name`)?.value || '';
        formData[`plaintiff-${i}-last-name`] = document.getElementById(`plaintiff-${i}-last-name`)?.value || '';
        formData[`plaintiff-${i}-unit`] = document.getElementById(`plaintiff-${i}-unit`)?.value || '';
        formData[`plaintiff-${i}-email`] = document.getElementById(`plaintiff-${i}-email`)?.value || '';
        formData[`plaintiff-${i}-phone`] = document.getElementById(`plaintiff-${i}-phone`)?.value || '';
        formData[`plaintiff-${i}-language`] = document.getElementById(`plaintiff-${i}-language`)?.value || 'english';

        const isMinorCheckbox = document.getElementById(`plaintiff-${i}-is-minor`);
        // ... rest stays the same
```

**Step 2: Verify data collection**

Open browser console, fill out the form with one plaintiff set to "Spanish", and run `collectFormData()` in the console. Verify the output includes `"plaintiff-1-language": "spanish"`.

**Step 3: Commit**

```bash
git add forms/agreement/js/form-submission.js
git commit -m "feat: Collect language preference per plaintiff in form submission"
```

---

### Task 4: Create Spanish DOCX Templates

**Files:**
- Create: `templates/LLG Contingency Fee Agreement - Template - Spanish.docx`
- Create: `templates/LLG Contingency Fee Agreement - Minor - Spanish.docx`

**Step 1: Copy existing English templates as starting point**

```bash
cp "templates/LLG Contingency Fee Agreement - Template.docx" "templates/LLG Contingency Fee Agreement - Template - Spanish.docx"
cp "templates/LLG Contingency Fee Agreement - Minor.docx" "templates/LLG Contingency Fee Agreement - Minor - Spanish.docx"
```

These copies use the exact same `<placeholder>` tags. The legal team will later open them in Word and replace the English text with Spanish while keeping all `<Plaintiff Full Name>`, `<Plaintiff Full Address>`, etc. placeholders intact.

**Step 2: Verify template files exist**

```bash
ls -la templates/*Spanish*
```

Expected: Two new `.docx` files.

**Step 3: Commit**

```bash
git add "templates/LLG Contingency Fee Agreement - Template - Spanish.docx" "templates/LLG Contingency Fee Agreement - Minor - Spanish.docx"
git commit -m "feat: Add Spanish DOCX templates (copies of English, pending legal translation)"
```

---

### Task 5: Update Document Generator Template Selection

**Files:**
- Modify: `services/contingency-document-generator.js:18-33` (constructor) and `services/contingency-document-generator.js:106-121` (template selection in `generateSingleAgreement`)

**Step 1: Add Spanish template paths in constructor**

In `contingency-document-generator.js`, update the constructor (lines 19-33) to add two new template path properties after the existing two:

```javascript
constructor() {
    this.templatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Template.docx');
    this.minorTemplatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Minor.docx');
    this.spanishTemplatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Template - Spanish.docx');
    this.spanishMinorTemplatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Minor - Spanish.docx');

    // ... rest of constructor stays the same
```

**Step 2: Update template selection in `generateSingleAgreement`**

In the `generateSingleAgreement` method, replace lines 107-109:

```javascript
        // Determine which template to use based on whether plaintiff is a minor
        const isMinor = plaintiff.isMinor;
        const templateToUse = isMinor ? this.minorTemplatePath : this.templatePath;
```

With:

```javascript
        // Determine which template to use based on minor status and language
        const isMinor = plaintiff.isMinor;
        const isSpanish = plaintiff.language === 'spanish';

        let templateToUse;
        if (isMinor && isSpanish) {
            templateToUse = this.spanishMinorTemplatePath;
        } else if (isMinor) {
            templateToUse = this.minorTemplatePath;
        } else if (isSpanish) {
            templateToUse = this.spanishTemplatePath;
        } else {
            templateToUse = this.templatePath;
        }
```

**Step 3: Commit**

```bash
git add services/contingency-document-generator.js
git commit -m "feat: Select English or Spanish template based on plaintiff language"
```

---

### Task 6: Parse Language Field in Document Generator

**Files:**
- Modify: `services/contingency-document-generator.js:206-270` (the `parseFormData` method, plaintiff extraction loop)

**Step 1: Add language extraction in parseFormData**

In the `parseFormData` method, inside the plaintiff loop (around line 224-251), add language extraction. After line 231 (`const guardianId = ...`), add:

```javascript
            const language = formData[`plaintiff-${i}-language`] || 'english';
```

Then add `language` to the plaintiff object being pushed (line 238-251). Add it after `guardianId,`:

```javascript
            plaintiffs.push({
                id: i,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                email,
                phone,
                unit,
                isMinor,
                guardianId,
                language,
                hasDifferentAddress,
                customStreet,
                customCityStateZip
            });
```

**Step 2: Commit**

```bash
git add services/contingency-document-generator.js
git commit -m "feat: Parse language field from form data in document generator"
```

---

### Task 7: End-to-End Verification

**Files:**
- No file changes — this is a manual test task

**Step 1: Start the development server**

```bash
npm run dev
```

**Step 2: Test English agreement (regression)**

1. Open the agreement form in browser
2. Add one plaintiff with language set to "English" (default)
3. Add one defendant
4. Fill in property address
5. Submit the form
6. Verify DOCX downloads and contains correct placeholder-filled content
7. Open the DOCX — it should be the English template

**Step 3: Test Spanish agreement**

1. Reset the form (or start fresh)
2. Add one plaintiff, change language dropdown to "Spanish"
3. Add one defendant, fill in property address
4. Submit
5. Verify DOCX downloads
6. Open the DOCX — it should be the Spanish template (currently a copy of English, but confirms the template selection logic works)

**Step 4: Test mixed language submission**

1. Add two plaintiffs: one English, one Spanish
2. Add one defendant, fill property address
3. Submit
4. Verify ZIP downloads with two DOCX files
5. Open each — one should be English template, one should be Spanish template

**Step 5: Test minor with Spanish**

1. Add plaintiff 1 (adult, English)
2. Add plaintiff 2 (minor, Spanish, guardian = plaintiff 1)
3. Submit
4. Verify the minor's agreement uses the Spanish minor template

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Complete Spanish retainer agreement support"
```

(Only if there were any additional tweaks discovered during testing)
