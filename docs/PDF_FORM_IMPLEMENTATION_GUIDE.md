# PDF Form Implementation Guide

## Overview

This guide documents the complete process for adding new PDF court forms to the Legal Form Application. It was created based on lessons learned from implementing Batch 1 (CIV-109 and CM-010).

## Quick Reference Checklist

Use this checklist for each new PDF form:

### 1. Template Setup
- [ ] Copy PDF template to `new templates/` directory
- [ ] Verify template is tracked in git (check `.gitignore` exceptions)
- [ ] Extract field names using `pdftk <template.pdf> dump_data_fields`
- [ ] Test if PDF works with pdf-lib or requires pdftk

### 2. Backend Implementation
- [ ] Add template path to `server/utils/pdf-templates.js`
- [ ] Create field mapping function in `server/utils/pdf-field-mapper.js`
- [ ] Add to PDFTK_DOCUMENT_TYPES if needed (XFA forms)
- [ ] Add document type to `server/routes/pdf-routes.js` templateMap
- [ ] Add document type to `routes/forms.js` validTypes array
- [ ] Create field mapping config in `server/config/<doctype>-field-mapping.json`

### 3. Frontend Implementation
- [ ] Add checkbox to confirmation modal in `index.html`
- [ ] Add checkbox to regeneration modal in `index.html`
- [ ] Add status element to progress modal in `index.html`
- [ ] Add document type to `pdfDocumentTypes` in `js/form-submission.js`
- [ ] Update `hasPdfDocuments` check to include new type
- [ ] Update `initializeDocumentStatusUI()` for new type

### 4. Deployment
- [ ] Commit all changes
- [ ] Push to main (triggers CI/CD)
- [ ] Verify staging deployment
- [ ] Test on staging environment
- [ ] Approve production deployment

---

## Detailed Implementation Steps

### Phase 1: Template Analysis

#### 1.1 Extract Field Names
```bash
pdftk "new templates/Your Form (XX-000).pdf" dump_data_fields > field-dump.txt
```

#### 1.2 Identify Field Structure
- **AcroForm PDFs** (simple): Work with pdf-lib directly
- **XFA PDFs** (complex): Require pdftk fill_form

To test which type:
```javascript
// If pdf-lib throws "Could not find page for PDFRef" errors, use pdftk
```

#### 1.3 Document Key Fields
Create a mapping document identifying:
- Field names from the PDF
- Corresponding form data fields
- Any transformations needed (e.g., uppercase)

---

### Phase 2: Backend Implementation

#### 2.1 Register Template Path

**File: `server/utils/pdf-templates.js`**

```javascript
const TEMPLATE_PATHS = {
  // ... existing templates
  'newdoc': path.join(__dirname, '../../new templates/Your Form (XX-000).pdf')
};
```

#### 2.2 Create Field Mapping Function

**File: `server/utils/pdf-field-mapper.js`**

```javascript
function mapNewDocFields(formData) {
    const pdfFields = {};

    try {
        logger.info('Starting XX-000 field mapping');

        // Map each field
        const fieldValue = formData.SomeField || '';
        if (fieldValue) {
            pdfFields['PDF.Field.Name[0]'] = fieldValue;
        }

        logger.info('XX-000 field mapping complete', {
            fieldCount: Object.keys(pdfFields).length
        });
        return pdfFields;

    } catch (error) {
        logger.error('Error mapping XX-000 fields', { error: error.message });
        throw new Error(`XX-000 field mapping failed: ${error.message}`);
    }
}

// Add to switch statement in mapFieldsForDocumentType()
switch (documentType) {
    case 'newdoc':
        return mapNewDocFields(formData);
    // ... other cases
}
```

#### 2.3 Configure pdftk (for XFA PDFs only)

**File: `server/services/pdf-service.js`**

```javascript
// Add to PDFTK_DOCUMENT_TYPES array
const PDFTK_DOCUMENT_TYPES = ['cm010', 'newdoc'];
```

#### 2.4 Add Route Mapping

**File: `server/routes/pdf-routes.js`**

```javascript
const templateMap = {
    // ... existing mappings
    'newdoc': 'newdoc'
};
```

#### 2.5 Add to Valid Types

**File: `routes/forms.js`**

```javascript
const validTypes = ['srogs', 'pods', 'admissions', 'cm110', 'civ109', 'cm010', 'newdoc'];
```

---

### Phase 3: Frontend Implementation

#### 3.1 Add Confirmation Modal Checkbox

**File: `index.html`** (in confirmation modal)

```html
<div class="checkbox-group">
    <input type="checkbox" id="doc-newdoc" name="document-selection" value="newdoc">
    <label for="doc-newdoc">
        <span class="checkbox-custom"></span>
        <span class="checkbox-label">XX-000 (Description)</span>
    </label>
</div>
```

#### 3.2 Add Regeneration Modal Checkbox

**File: `index.html`** (in regeneration modal)

```html
<div class="checkbox-group">
    <input type="checkbox" id="regen-doc-newdoc" name="regenerate-document-selection" value="newdoc">
    <label for="regen-doc-newdoc">
        <span class="checkbox-custom"></span>
        <span class="checkbox-label">XX-000 (Description)</span>
    </label>
</div>
```

#### 3.3 Add Progress Modal Status Element

**File: `index.html`** (in submission progress modal)

```html
<!-- XX-000 PDF Status -->
<div id="doc-status-newdoc" class="document-status-item" style="display: none;">
    <i id="doc-icon-newdoc" class="fas fa-spinner fa-spin" style="color: #00AEEF; margin-right: 8px;"></i>
    <span style="flex: 1; font-weight: 500;">XX-000 PDF (Description)</span>
    <span id="doc-status-text-newdoc" style="font-size: 0.85rem; color: #5B6475;">Processing...</span>
</div>
```

#### 3.4 Update JavaScript

**File: `js/form-submission.js`**

```javascript
// 1. Add to pdfDocumentTypes
const pdfDocumentTypes = {
    'cm110': 'CM-110',
    'civ109': 'CIV-109',
    'cm010': 'CM-010',
    'newdoc': 'XX-000'
};

// 2. Update hasPdfDocuments check
const hasPdfDocuments = selectedDocuments.some(doc =>
    ['cm110', 'civ109', 'cm010', 'newdoc'].includes(doc)
);

// 3. Update initializeDocumentStatusUI()
const newdocStatus = document.getElementById('doc-status-newdoc');
const hasNewdoc = selectedDocuments.includes('newdoc');
if (newdocStatus) {
    newdocStatus.style.display = hasNewdoc ? 'flex' : 'none';
}

// 4. Update checkAllPdfComplete()
const pdfTypes = ['cm110', 'civ109', 'cm010', 'newdoc'];
```

---

## Common Issues and Solutions

### Issue 1: Template Not Found in Docker

**Symptom:**
```
Error: Template file not found: /app/new templates/Your Form.pdf
```

**Cause:** PDF files are ignored by `.gitignore` by default.

**Solution:** Add exception to `.gitignore`:
```gitignore
!new templates/*.pdf
```

Then force-add the file:
```bash
git add -f "new templates/Your Form (XX-000).pdf"
```

### Issue 2: pdftk Not Found

**Symptom:**
```
/bin/sh: pdftk: not found
```

**Cause:** pdftk not installed in Docker container.

**Solution:** Use `node:20-slim` base image and install pdftk:
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends pdftk && rm -rf /var/lib/apt/lists/*
```

Note: Alpine Linux (`node:20-alpine`) does NOT have pdftk available.

### Issue 3: pdf-lib PDFRef Error

**Symptom:**
```
Error: Could not find page for PDFRef 1521 0 R
```

**Cause:** PDF uses XFA (XML Forms Architecture) which pdf-lib doesn't support.

**Solution:** Add document type to `PDFTK_DOCUMENT_TYPES` array to use pdftk fill_form instead.

### Issue 4: Progress Modal Not Showing

**Symptom:** Form submits but progress modal doesn't appear when only new PDF types are selected.

**Cause:** `hasPdfDocuments` check doesn't include the new document type.

**Solution:** Update the check in `js/form-submission.js`:
```javascript
const hasPdfDocuments = selectedDocuments.some(doc =>
    ['cm110', 'civ109', 'cm010', 'newdoc'].includes(doc)  // Add new type
);
```

### Issue 5: Document Status Not Updating

**Symptom:** Progress modal shows but document status doesn't update.

**Cause:** Missing status element in HTML or missing initialization in JavaScript.

**Solution:**
1. Add status element HTML with correct IDs: `doc-status-{type}`, `doc-icon-{type}`, `doc-status-text-{type}`
2. Update `initializeDocumentStatusUI()` to handle new type
3. Update `checkAllPdfComplete()` to include new type in `pdfTypes` array

---

## File Reference

| File | Purpose |
|------|---------|
| `server/utils/pdf-templates.js` | Template path registry |
| `server/utils/pdf-field-mapper.js` | Form data to PDF field mapping |
| `server/services/pdf-service.js` | PDF generation logic, pdftk integration |
| `server/routes/pdf-routes.js` | PDF API endpoints |
| `routes/forms.js` | Valid document type validation |
| `js/form-submission.js` | Frontend submission and progress tracking |
| `index.html` | UI elements (modals, checkboxes, status) |
| `.gitignore` | PDF file tracking exceptions |
| `Dockerfile` | Container configuration (pdftk installation) |

---

## Deployment Workflow

1. **Commit to feature branch:**
   ```bash
   git checkout -b feature/new-form-xxx
   git add .
   git commit -m "feat: Add XX-000 PDF form generation"
   ```

2. **Push to origin:**
   ```bash
   git push -u origin feature/new-form-xxx
   ```

3. **Merge to main:**
   ```bash
   git checkout main
   git merge feature/new-form-xxx
   git push origin main
   ```

4. **CI/CD Pipeline:**
   - Push to `main` triggers GitHub Actions
   - Runs quality checks, tests, security scans
   - Builds Docker image with pdftk
   - Deploys to **staging** automatically
   - Deploys to **production** after manual approval

5. **Testing:**
   - Staging URL: `https://node-server-staging-zyiwmzwenq-uc.a.run.app`
   - Test with `?token=<ACCESS_TOKEN_STAGING>`

---

## Batch 1 Implementation Summary (CIV-109 & CM-010)

### CIV-109 (Civil Case Addendum)
- **PDF Type:** AcroForm (works with pdf-lib)
- **Fields Mapped:** County, Short Title, City, State, Zip, Address
- **Template Location:** `new templates/Civil Case Addendum (CIV-109).pdf`

### CM-010 (Civil Case Cover Sheet)
- **PDF Type:** XFA (requires pdftk)
- **Fields Mapped:** County, Case Name (uppercase)
- **Template Location:** `new templates/Civil Case Cover Sheet (CM-010).pdf`

### Issues Encountered & Resolved:
1. pdftk not in Alpine Linux - switched to `node:20-slim`
2. Templates not tracked in git - added `.gitignore` exception
3. Progress modal not showing for PDF-only selection - updated `hasPdfDocuments` check
4. CIV-109 path pointing to wrong directory - fixed path in `pdf-templates.js`

### Commits:
1. `feat: Add CIV-109 and CM-010 PDF form generation (Batch 1)`
2. `fix: Add pdftk to Docker container for CM-010 PDF generation`
3. `fix: Switch to node:20-slim for pdftk compatibility`
4. `fix: Add PDF templates for CIV-109 and CM-010 to git`
5. `fix: Add CIV-109 and CM-010 to progress modal and document tracking`

---

## Future Batches

### Batch 2: SUM-100, SUM-200A
- Follow this guide
- Extract fields first
- Determine if pdf-lib or pdftk needed
- Update all files per checklist

### Batch 3: CIV-010, CIV-011
- Same process
- Document any new issues encountered

---

*Last Updated: December 30, 2025*
*Version: 1.0*
