# Unit Grouping & Guardian Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix guardian dropdown to filter out minors, add unit number fields for multi-individual cases, and group plaintiffs by unit in generated documents.

**Architecture:** Three surgical changes across frontend form logic, data collection, and document generator. No new files — all modifications to existing code. Frontend dynamically shows/hides unit fields based on individual count; generator groups plaintiffs by unit number for document output.

**Tech Stack:** Vanilla JS (frontend), Node.js (backend), docxtemplater (DOCX generation)

**Spec:** `docs/superpowers/specs/2026-03-19-unit-grouping-guardian-fix-design.md`

---

### Task 1: Fix guardian dropdown to filter out minors

**Files:**
- Modify: `forms/complaint/js/form-logic.js:483-497` (updateGuardianSelects inner loop)

- [ ] **Step 1: Add type check to updateGuardianSelects**

In `forms/complaint/js/form-logic.js`, inside `updateGuardianSelects()`, after the self-check on line 487, add a check that reads the other plaintiff's type and skips minors:

```javascript
// Replace lines 484-496 (the inner blocks.forEach) with:
blocks.forEach(otherBlock => {
    const otherNum = parseInt(otherBlock.dataset.index);
    if (otherNum === num) return; // Can't be guardian of self

    // Only show individual (adult) plaintiffs as guardian options
    const otherType = otherBlock.querySelector(`[name="plaintiff-${otherNum}-type"]`);
    if (otherType && otherType.value === 'minor') return;

    const firstName = otherBlock.querySelector(`[name="plaintiff-${otherNum}-first-name"]`)?.value || '';
    const lastName = otherBlock.querySelector(`[name="plaintiff-${otherNum}-last-name"]`)?.value || '';
    const label = firstName || lastName ? `${firstName} ${lastName}`.trim() : `Plaintiff ${otherNum}`;

    const option = document.createElement('option');
    option.value = otherNum;
    option.textContent = label;
    select.appendChild(option);
});
```

- [ ] **Step 2: Add guardian invalidation on type change**

In the same file, in `toggleGuardian()` (line 452), after the existing logic, add invalidation when a plaintiff becomes a minor. After the `updateSinglePlaintiffFields()` call on line 470, add:

```javascript
// After updateSinglePlaintiffFields(); on line 470, add:

// Invalidate any guardian selections pointing to this plaintiff if they became a minor
if (typeSelect.value === 'minor') {
    const blocks = document.querySelectorAll('#plaintiffs-container .party-block');
    blocks.forEach(block => {
        const blockNum = parseInt(block.dataset.index);
        if (blockNum === plaintiffNumber) return;
        const guardianSelect = document.getElementById(`plaintiff-${blockNum}-guardian`);
        if (guardianSelect && guardianSelect.value === String(plaintiffNumber)) {
            guardianSelect.value = '';
        }
    });
}
```

- [ ] **Step 3: Verify manually**

Start the dev server and test:
1. Add 3 plaintiffs. Set plaintiff 2 as Minor. Confirm guardian dropdown for plaintiff 2 only shows plaintiff 1 and 3 (not itself).
2. Set plaintiff 3 as Minor. Confirm guardian dropdown for plaintiff 3 only shows plaintiff 1. Confirm plaintiff 2's guardian dropdown also only shows plaintiff 1.
3. If plaintiff 2 had selected plaintiff 3 as guardian before plaintiff 3 became a minor, confirm plaintiff 2's guardian selection is cleared.

- [ ] **Step 4: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "fix: filter minors from guardian dropdown and invalidate on type change"
```

---

### Task 2: Add unit number field to plaintiff 1 block in HTML

**Files:**
- Modify: `forms/complaint/index.html:120-121` (between three-col row and guardian container for plaintiff 1)

- [ ] **Step 1: Add unit number container to plaintiff 1 block**

In `forms/complaint/index.html`, after the closing `</div>` of the `form-row three-col` div (line 120) and before the guardian container div (line 121), insert:

```html
                                <div class="unit-number-container" style="display: none;">
                                    <div class="form-group">
                                        <label>Unit #</label>
                                        <input type="text" name="plaintiff-1-unit" placeholder="e.g. 101, 2B">
                                    </div>
                                </div>
```

- [ ] **Step 2: Commit**

```bash
git add forms/complaint/index.html
git commit -m "feat: add hidden unit number container to plaintiff 1 block"
```

---

### Task 3: Add unit number container to dynamic plaintiff blocks and implement updateUnitFields

**Files:**
- Modify: `forms/complaint/js/form-logic.js:265-297` (addPlaintiff block.innerHTML)
- Modify: `forms/complaint/js/form-logic.js:258-303` (addPlaintiff function — add updateUnitFields call)
- Modify: `forms/complaint/js/form-logic.js:313-360` (reindexPlaintiffs — add unit field reindex + updateUnitFields call)
- Modify: `forms/complaint/js/form-logic.js:452-471` (toggleGuardian — add updateUnitFields call)
- Modify: `forms/complaint/js/form-logic.js:305-311` (removePlaintiff — already calls reindexPlaintiffs which will call updateUnitFields)

- [ ] **Step 1: Add unit number container to dynamic plaintiff block template**

In `forms/complaint/js/form-logic.js`, in the `addPlaintiff()` function, in the `block.innerHTML` template string (line 265-297), insert the unit number container after the closing `</div>` of the `form-row three-col` div (after line 288) and before the guardian container div (line 289):

```javascript
// After the </div> closing the form-row three-col (line 288), add:
            <div class="unit-number-container" style="display: none;">
                <div class="form-group">
                    <label>Unit #</label>
                    <input type="text" name="plaintiff-${plaintiffCount}-unit" placeholder="e.g. 101, 2B">
                </div>
            </div>
```

- [ ] **Step 2: Add updateUnitFields function**

In `forms/complaint/js/form-logic.js`, after the `updateSinglePlaintiffFields()` function (after line 372) and before the Defendants section comment (line 374), add:

```javascript
    function updateUnitFields() {
        const blocks = document.querySelectorAll('#plaintiffs-container .party-block');
        const typeSelects = document.querySelectorAll('#plaintiffs-container .party-block select[name$="-type"]');
        const individualCount = Array.from(typeSelects).filter(s => s.value === 'individual').length;
        const showUnits = individualCount >= 2;

        blocks.forEach(block => {
            const num = parseInt(block.dataset.index);
            const typeSelect = block.querySelector(`[name="plaintiff-${num}-type"]`);
            const container = block.querySelector('.unit-number-container');
            if (!container) return;

            // Only show unit field on individual plaintiffs when 2+ individuals exist
            if (showUnits && typeSelect && typeSelect.value === 'individual') {
                container.style.display = '';
            } else {
                container.style.display = 'none';
            }
        });
    }
```

- [ ] **Step 3: Call updateUnitFields from addPlaintiff**

In `addPlaintiff()`, after the `updateSinglePlaintiffFields()` call on line 302, add:

```javascript
        updateUnitFields();
```

- [ ] **Step 4: Update reindexPlaintiffs to handle unit field name attributes and call updateUnitFields**

In `reindexPlaintiffs()`, the existing loop on lines 322-331 already updates all `input` and `select` elements with `name.replace(/plaintiff-\d+-/, ...)`. Since the unit input follows the same `plaintiff-N-unit` naming pattern, it will be reindexed automatically by the existing logic.

After the `updateSinglePlaintiffFields()` call on line 359, add:

```javascript
        updateUnitFields();
```

- [ ] **Step 5: Call updateUnitFields from toggleGuardian**

In `toggleGuardian()`, after the `updateSinglePlaintiffFields()` call on line 470, add:

```javascript
        updateUnitFields();
```

- [ ] **Step 6: Verify manually**

1. Load the form. Add 2 plaintiffs (both individual). Confirm unit number field appears on both.
2. Change plaintiff 2 to Minor. Confirm unit field disappears from plaintiff 2. If only 1 individual remains, unit field also disappears from plaintiff 1.
3. Add a third plaintiff (individual). Confirm unit fields reappear on plaintiff 1 and 3 (not on plaintiff 2 who is a minor).
4. Remove plaintiff 3. Confirm unit fields disappear (back to 1 individual).

- [ ] **Step 7: Commit**

```bash
git add forms/complaint/js/form-logic.js
git commit -m "feat: add unit number fields with dynamic show/hide based on individual count"
```

---

### Task 4: Collect unit number in form submission

**Files:**
- Modify: `forms/complaint/js/form-submission.js:72-83` (plaintiff collection loop)

- [ ] **Step 1: Add unit number collection**

In `forms/complaint/js/form-submission.js`, in the `collectFormData()` plaintiff loop (lines 72-83), after the guardian line (line 82), add:

```javascript
            const unit = block.querySelector(`[name="plaintiff-${num}-unit"]`);
            if (unit && unit.value) data[`plaintiff-${num}-unit`] = unit.value;
```

- [ ] **Step 2: Commit**

```bash
git add forms/complaint/js/form-submission.js
git commit -m "feat: collect unit number from plaintiff blocks in form submission"
```

---

### Task 5: Parse unitNumber in document generator

**Files:**
- Modify: `services/complaint-document-generator.js:206-216` (parseFormData plaintiff loop)

- [ ] **Step 1: Add unitNumber to plaintiff parsing**

In `services/complaint-document-generator.js`, in the `parseFormData()` plaintiff loop (lines 208-216), add `unitNumber` to the pushed object. Change line 214 area:

```javascript
// Replace lines 209-216 with:
            plaintiffs.push({
                index: i,
                firstName: formData[`plaintiff-${i}-first-name`] || '',
                lastName: formData[`plaintiff-${i}-last-name`] || '',
                type: formData[`plaintiff-${i}-type`] || 'individual',
                guardianIndex: formData[`plaintiff-${i}-guardian`] ? parseInt(formData[`plaintiff-${i}-guardian`]) : null,
                unitNumber: formData[`plaintiff-${i}-unit`] || '',
            });
```

- [ ] **Step 2: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: parse unitNumber from form data in complaint generator"
```

---

### Task 6: Implement grouped plaintiff ordering and formatting in document generator

**Files:**
- Modify: `services/complaint-document-generator.js:64-90` (plaintiff name building section)

- [ ] **Step 1: Add orderPlaintiffsByUnit helper method**

In `services/complaint-document-generator.js`, add a new method to the `ComplaintDocumentGenerator` class, after the `parseFormData` method (after line 232). Insert before the `buildCausesOfActionData` method:

```javascript
    /**
     * Order plaintiffs by unit number: group by unit, adults first within each group.
     * Returns a new array in grouped order. If no unit numbers present, returns original order.
     */
    orderPlaintiffsByUnit(plaintiffs, plaintiffByIndex) {
        const hasUnits = plaintiffs.some(p => p.unitNumber);
        if (!hasUnits) return plaintiffs;

        // Resolve minor unit numbers from their guardian
        const resolved = plaintiffs.map(p => {
            if (p.type === 'minor' && p.guardianIndex) {
                const guardian = plaintiffByIndex[p.guardianIndex];
                return { ...p, resolvedUnit: guardian ? guardian.unitNumber : '' };
            }
            return { ...p, resolvedUnit: p.unitNumber };
        });

        // Group by resolved unit number (preserve insertion order of first occurrence)
        const groups = new Map();
        const ungrouped = [];

        resolved.forEach(p => {
            const unit = p.resolvedUnit;
            if (unit) {
                if (!groups.has(unit)) groups.set(unit, []);
                groups.get(unit).push(p);
            } else {
                ungrouped.push(p);
            }
        });

        // Within each group: adults first, then minors
        const sortWithinGroup = (arr) => {
            const adults = arr.filter(p => p.type !== 'minor');
            const minors = arr.filter(p => p.type === 'minor');
            return [...adults, ...minors];
        };

        const ordered = [];
        for (const [, group] of groups) {
            ordered.push(...sortWithinGroup(group));
        }
        // Ungrouped bucket: adults first, appended at end
        ordered.push(...sortWithinGroup(ungrouped));

        return ordered;
    }
```

- [ ] **Step 2: Add joinPlaintiffList helper method**

Add another helper method right after `orderPlaintiffsByUnit`:

```javascript
    /**
     * Join an array of strings with "; " and "; and " before the last item.
     * Only uses "; and" when unit grouping is active (hasUnits=true).
     */
    joinPlaintiffList(items, hasUnits) {
        if (!hasUnits) return items.join('; ');
        if (items.length <= 1) return items.join('');
        return items.slice(0, -1).join('; ') + '; and ' + items[items.length - 1];
    }
```

- [ ] **Step 3: Update plaintiff name building to use ordering and join helpers**

In the `generateComplaint` method, replace the plaintiff name building section (lines 67-90) with:

```javascript
        // Build a lookup of plaintiffs by index for guardian resolution
        const plaintiffByIndex = {};
        validPlaintiffs.forEach(p => { plaintiffByIndex[p.index] = p; });

        // Order plaintiffs by unit (grouped: adults first per unit)
        const orderedPlaintiffs = this.orderPlaintiffsByUnit(validPlaintiffs, plaintiffByIndex);
        const hasUnits = validPlaintiffs.some(p => p.unitNumber);

        // Build plaintiff names (ALL CAPS, grouped order)
        const plaintiffNames = this.joinPlaintiffList(
            orderedPlaintiffs.map(p => `${p.firstName} ${p.lastName}`.trim().toUpperCase()),
            hasUnits
        );

        // Build plaintiff names with types (ALL CAPS name + type descriptor, grouped order)
        const plaintiffNamesWithTypes = this.joinPlaintiffList(
            orderedPlaintiffs.map(p => {
                const name = `${p.firstName} ${p.lastName}`.trim().toUpperCase();
                if (p.type === 'minor') {
                    const guardian = p.guardianIndex ? plaintiffByIndex[p.guardianIndex] : null;
                    if (guardian) {
                        const guardianName = `${guardian.firstName} ${guardian.lastName}`.trim().toUpperCase();
                        return `${name}, minor by and through Guardian Ad Litem, ${guardianName}`;
                    }
                    return `${name}, a minor`;
                }
                return `${name}, an individual`;
            }),
            hasUnits
        );
```

- [ ] **Step 4: Verify manually**

Start the dev server and test document generation:

1. **Single individual (no units):** 1 plaintiff → flat format, no "; and". Same as before.
2. **Two individuals, same unit:** Add 2 individuals both with unit "101" → grouped format with "; and" before last.
3. **Two units with minors:**
   - Plaintiff 1: John Doe, individual, unit 101
   - Plaintiff 2: Jane Doe, minor, guardian=1 (inherits unit 101)
   - Plaintiff 3: Bob Smith, individual, unit 202
   - Plaintiff 4: Alice Smith, minor, guardian=3 (inherits unit 202)
   - Expected `<Plaintiff Names With Types>`:
     ```
     JOHN DOE, an individual; JANE DOE, minor by and through Guardian Ad Litem, JOHN DOE; BOB SMITH, an individual; and ALICE SMITH, minor by and through Guardian Ad Litem, BOB SMITH
     ```

- [ ] **Step 5: Commit**

```bash
git add services/complaint-document-generator.js
git commit -m "feat: group plaintiffs by unit number in document output with '; and' formatting"
```

---

### Task 7: Add CSS for unit number container (if needed)

**Files:**
- Modify: `forms/complaint/styles.css`

- [ ] **Step 1: Check if styling is needed**

The unit number container uses the same `.form-group` class as other fields. Check if it renders correctly without additional CSS. If it does, skip this task.

If spacing or layout adjustments are needed, add to `forms/complaint/styles.css`:

```css
.unit-number-container {
    margin-top: 0.5rem;
}

.unit-number-container .form-group {
    max-width: 200px;
}
```

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add forms/complaint/styles.css
git commit -m "style: add unit number field layout"
```
