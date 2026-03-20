# Yellow Highlight Warning Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a warning modal when the user clicks "Generate Complaint" and optional fields (Move In Date, Pronouns) are empty, explaining that those fields will appear yellow-highlighted in the generated DOCX.

**Architecture:** Frontend-only change. Static modal HTML added to `index.html` (following the existing `progress-overlay` pattern). Detection logic and show/hide added to `form-submission.js`. Styles added to `styles.css`.

**Tech Stack:** Vanilla HTML/CSS/JS (matches existing complaint form stack)

**Spec:** `docs/superpowers/specs/2026-03-19-highlight-warning-modal-design.md`

---

### Task 1: Add Modal HTML Markup

**Files:**
- Modify: `forms/complaint/index.html:249-261` (between form closing div and progress overlay)

- [ ] **Step 1: Add the modal HTML**

Insert this block immediately after line 248 (`</div>` closing `.form-container`) and before the `<!-- Progress Overlay -->` comment on line 250:

```html
    <!-- Highlight Warning Modal -->
    <div id="highlight-warning-overlay" class="highlight-warning-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="highlight-warning-title">
        <div class="highlight-warning-modal">
            <div class="highlight-warning-header">
                <h3 id="highlight-warning-title">Some fields need attention</h3>
                <p>No worries! These fields will appear <span class="highlight-preview">highlighted in yellow</span> in your document. Just look for the highlights and fill them in.</p>
            </div>
            <div id="highlight-warning-fields" class="highlight-warning-fields">
                <!-- Populated dynamically by JS -->
            </div>
            <div class="highlight-warning-buttons">
                <button type="button" id="highlight-go-back" class="btn-secondary">Go Back</button>
                <button type="button" id="highlight-continue" class="btn-primary">Continue Generating</button>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Verify the page loads without errors**

Open the form locally at `http://localhost:3000/forms/complaint/` and confirm no console errors. The modal should not be visible.

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/index.html
git commit -m "feat: add highlight warning modal HTML markup"
```

---

### Task 2: Add Modal Styles

**Files:**
- Modify: `forms/complaint/styles.css` (append to end of file)

- [ ] **Step 1: Add the modal CSS**

Append these styles to the end of `forms/complaint/styles.css`:

```css
/* ===== Highlight Warning Modal ===== */
.highlight-warning-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.highlight-warning-modal {
    background: #fff;
    border-radius: 12px;
    padding: 32px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    animation: fadeIn 0.2s ease-out;
}

.highlight-warning-header {
    border-left: 4px solid #FBBF24;
    padding-left: 16px;
    margin-bottom: 20px;
}

.highlight-warning-header h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #1F2A44;
}

.highlight-warning-header p {
    color: #555;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
}

.highlight-preview {
    background: #FEFCE8;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 600;
    color: #92400E;
}

.highlight-warning-fields {
    margin-bottom: 20px;
    padding-left: 20px;
}

.highlight-warning-field-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 14px;
    color: #374151;
}

.highlight-warning-field-row + .highlight-warning-field-row {
    border-top: 1px solid #F3F4F6;
}

.highlight-warning-swatch {
    width: 20px;
    height: 12px;
    background: #FEF08A;
    border-radius: 2px;
    flex-shrink: 0;
}

.highlight-warning-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.highlight-warning-buttons .btn-secondary {
    padding: 10px 20px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-size: 14px;
    cursor: pointer;
}

.highlight-warning-buttons .btn-secondary:hover {
    background: #F9FAFB;
}

.highlight-warning-buttons .btn-primary {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #00AEEF 0%, #0098D4 100%);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.highlight-warning-buttons .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);
}

.highlight-warning-buttons .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}
```

- [ ] **Step 2: Verify styles render correctly**

Temporarily remove `style="display: none;"` from the overlay div in `index.html`, reload the page, and confirm the modal looks correct. Then add `style="display: none;"` back.

- [ ] **Step 3: Commit**

```bash
git add forms/complaint/styles.css
git commit -m "style: add highlight warning modal styles"
```

---

### Task 3: Add Modal Logic to form-submission.js

**Files:**
- Modify: `forms/complaint/js/form-submission.js`

- [ ] **Step 1: Add the `getMissingHighlightFields()` detection function**

Add this function inside the IIFE, after the `collectFormData()` function (after line 110):

```javascript
    function getMissingHighlightFields() {
        const missing = [];
        const singleFields = document.getElementById('single-plaintiff-fields');

        // Only check when single-plaintiff fields are visible
        if (singleFields && singleFields.style.display !== 'none') {
            const moveInDate = document.getElementById('move-in-date');
            if (moveInDate && moveInDate.value === '') {
                missing.push('Move In Date');
            }

            const pronouns = document.getElementById('pronouns');
            if (pronouns && pronouns.value === '') {
                missing.push('Pronoun references (he/she, his/her, him/her)');
            }
        }

        return missing;
    }
```

- [ ] **Step 2: Add `showHighlightWarning()` and `hideHighlightWarning()` functions**

Add these after `getMissingHighlightFields()`:

```javascript
    function showHighlightWarning(missingFields) {
        const overlay = document.getElementById('highlight-warning-overlay');
        const fieldsContainer = document.getElementById('highlight-warning-fields');

        // Populate field rows (field names are hardcoded strings, not user input — no XSS risk)
        fieldsContainer.innerHTML = missingFields.map(field =>
            `<div class="highlight-warning-field-row">
                <span class="highlight-warning-swatch"></span>
                ${field}
            </div>`
        ).join('');

        overlay.style.display = 'flex';

        // Re-enable Continue button (may have been disabled from previous attempt)
        document.getElementById('highlight-continue').disabled = false;

        // Focus the Continue button for keyboard users
        document.getElementById('highlight-continue').focus();

        // Escape key handler
        overlay._escHandler = function(e) {
            if (e.key === 'Escape') hideHighlightWarning(false);
        };
        document.addEventListener('keydown', overlay._escHandler);

        // Backdrop click handler
        overlay._backdropHandler = function(e) {
            if (e.target === overlay) hideHighlightWarning(false);
        };
        overlay.addEventListener('click', overlay._backdropHandler);
    }

    function hideHighlightWarning(proceed) {
        const overlay = document.getElementById('highlight-warning-overlay');
        overlay.style.display = 'none';

        // Remove escape handler
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
            overlay._escHandler = null;
        }

        // Remove backdrop handler
        if (overlay._backdropHandler) {
            overlay.removeEventListener('click', overlay._backdropHandler);
            overlay._backdropHandler = null;
        }

        if (!proceed) {
            // Go Back — navigate to page 1 where the fields are
            const page1Btn = document.querySelector('[data-page="1"]');
            if (page1Btn) page1Btn.click();
            document.getElementById('submit-btn').disabled = false;
        }
    }
```

- [ ] **Step 3: Wire up the modal buttons**

Add this inside the `init()` function, after the form event listener (after line 12):

```javascript
        // Highlight warning modal buttons
        const goBackBtn = document.getElementById('highlight-go-back');
        if (goBackBtn) {
            goBackBtn.addEventListener('click', function() {
                hideHighlightWarning(false);
            });
        }

        const continueBtn = document.getElementById('highlight-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                this.disabled = true;
                hideHighlightWarning(true);
                proceedWithSubmit();
            });
        }
```

- [ ] **Step 4: Refactor `handleSubmit` to check for missing fields**

Replace the existing `handleSubmit` function (lines 15-53) with:

```javascript
    let _pendingFormData = null;

    async function handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        // Check for fields that will be yellow-highlighted
        const missingFields = getMissingHighlightFields();
        if (missingFields.length > 0) {
            _pendingFormData = collectFormData();
            showHighlightWarning(missingFields);
            return;
        }

        // No missing fields — proceed directly
        _pendingFormData = collectFormData();
        proceedWithSubmit();
    }

    async function proceedWithSubmit() {
        const formData = _pendingFormData;
        _pendingFormData = null;

        showProgress();
        updateProgress(5, 'Submitting form data...');

        try {
            const response = await fetch('/api/complaint-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Submission failed');
            }

            updateProgress(10, 'Form submitted. Generating document...');
            connectSSE(result.jobId);

        } catch (err) {
            hideProgress();
            document.getElementById('submit-btn').disabled = false;
            alert('Error submitting form: ' + err.message);
        }
    }
```

- [ ] **Step 5: Test manually — modal appears when fields are empty**

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/forms/complaint/`
3. Fill in case name + at least one plaintiff (Individual type) + one defendant
4. Leave Move In Date and Pronouns empty
5. Go to page 2, select a cause, click "Generate Complaint"
6. Verify: modal appears with both fields listed
7. Click "Go Back" — verify modal closes and form navigates to page 1
8. Go back to page 2, click "Generate Complaint" again
9. Click "Continue Generating" — verify generation proceeds normally

- [ ] **Step 6: Test manually — modal does NOT appear when fields are filled**

1. Fill in Move In Date and select Pronouns
2. Click "Generate Complaint"
3. Verify: generation starts immediately, no modal shown

- [ ] **Step 7: Test manually — modal does NOT appear with multiple plaintiffs**

1. Add a second Individual plaintiff
2. Verify the single-plaintiff fields are hidden
3. Click "Generate Complaint"
4. Verify: generation starts immediately, no modal shown

- [ ] **Step 8: Test manually — modal does NOT appear with Minor-type sole plaintiff**

1. Set the only plaintiff's type to "Minor"
2. Verify the single-plaintiff fields are hidden
3. Click "Generate Complaint"
4. Verify: generation starts immediately, no modal shown

- [ ] **Step 9: Test escape key and backdrop click**

1. Trigger the modal (empty fields, click Generate)
2. Press Escape — verify modal closes
3. Trigger again, click outside the modal card — verify modal closes

- [ ] **Step 10: Commit**

```bash
git add forms/complaint/js/form-submission.js
git commit -m "feat: intercept generate button with highlight warning modal"
```

---

### Task 4: Deploy and Verify

**Files:** None (deployment only)

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

The GitHub Actions workflow `Deploy Complaint Creator` will auto-trigger (paths include `forms/complaint/**`).

- [ ] **Step 2: Verify deployment**

```bash
gh run list --workflow="Deploy Complaint Creator" --limit=1
```

Wait for status `completed` / `success`.

- [ ] **Step 3: Verify on production**

Test at `https://complaints.liptonlegal.com`:
1. Fill form with empty Move In Date / Pronouns → modal appears
2. Click "Continue Generating" → document generates
3. Fill form with all fields → no modal, direct generation
