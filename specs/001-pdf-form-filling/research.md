# Research & Technology Decisions: PDF Form Filling

**Feature**: PDF Form Filling (001-pdf-form-filling)
**Date**: 2025-11-12
**Status**: Complete

## Research Questions & Decisions

### 1. PDF Manipulation Library Selection

**Question**: Which Node.js library best handles fillable PDF form manipulation?

**Options Evaluated**:
- **pdf-lib** - Pure JavaScript, no external dependencies
- **pdf-fill-form** - Native bindings to PDFtk
- **@sparticuz/pdffiller** - PDFtk wrapper with promise-based API
- **pdftk** (via child_process) - Direct PDFtk command-line invocation
- **hummus** - C++ bindings for PDF manipulation

**Evaluation Criteria**:
1. Can read PDF form fields (AcroForms)
2. Can write to fields (text and checkboxes)
3. Preserves PDF formatting and layout
4. Handles checkboxes correctly
5. Active maintenance (updated in 2023-2025)
6. No external binary dependencies (preferred for Cloud Run deployment)
7. Works in Node.js 18+

**Research Findings** (from web search 2025-11-12):

| Library | Read Fields | Write Fields | Preserve Format | Checkboxes | Active Maintenance | External Deps | Node 18+ |
|---------|-------------|--------------|-----------------|------------|-------------------|---------------|----------|
| **pdf-lib** | ✅ | ✅ | ✅ | ✅ | ✅ (2023-2025) | ❌ None | ✅ |
| pdf-fill-form | ✅ | ✅ | ✅ | ✅ | ⚠️ Last published 4 years ago | ✅ PDFtk | ✅ |
| @sparticuz/pdffiller | ✅ | ✅ | ✅ | ✅ | ✅ (pdftk-java fork) | ✅ PDFtk/Java | ✅ |
| pdftk (child_process) | ✅ | ✅ | ✅ | ✅ | ✅ (pdftk-java) | ✅ PDFtk binary | ✅ |
| hummus | ✅ | ✅ | ⚠️ Complex API | ⚠️ | ❌ Deprecated | ✅ C++ bindings | ⚠️ |

**Decision**: **pdf-lib** (chosen)

**Rationale**:
1. **Zero external dependencies** - No PDFtk binary required, simplifies Docker deployment to Cloud Run
2. **Pure JavaScript** - Cross-platform, no compilation needed, easier debugging
3. **Active maintenance** - Used and maintained in 2023-2025, extensive documentation
4. **Full AcroForm support** - Can read and write text fields, checkboxes, radio buttons, dropdowns
5. **Format preservation** - Maintains original PDF layout, fonts, and styling
6. **Modern API** - Promise-based, async/await compatible
7. **Cloud Run compatible** - Works in containerized Node.js environment without additional system dependencies

**Alternatives Considered**:
- **PDFtk-based solutions** - More reliable for complex PDFs but require external binary (pdftk-java). Would add deployment complexity to Cloud Run container.
- **pdf-fill-form** - Abandoned (4 years since last publish). Not suitable for production.

**Package to Install**: `pdf-lib` (latest stable version)

---

### 2. Field Mapping Strategy

**Question**: How to map JSON field names to PDF form field names when they don't match exactly?

**Research Findings**:
- PDF AcroForm fields have internal names (e.g., `topmostSubform[0].Page1[0].PlaintiffName[0]`)
- Form submission JSON has logical names (e.g., `plaintiffName`, `plaintiffFirstName`)
- Field names rarely match exactly between JSON and PDF

**Approaches Evaluated**:
1. **Manual mapping configuration file** - Explicit JSON mapping PDF field name → form field path
2. **Fuzzy matching** - Algorithmic matching based on string similarity
3. **Convention-based mapping** - Naming convention rules (camelCase → TitleCase, etc.)

**Decision**: **Manual mapping configuration file** (JSON-based)

**Rationale**:
1. **Explicit and predictable** - No ambiguity, clear mapping rules
2. **Easy to debug** - Can inspect mapping file to understand data flow
3. **Type-safe transformations** - Can specify field type (text, checkbox, date) and transformation rules
4. **Supports complex mappings** - One JSON field can map to multiple PDF fields, or vice versa
5. **Court form compliance** - Legal forms have specific field requirements that need explicit control

**Implementation Approach**:
- Create `server/config/cm110-field-mapping.json` with structure:
  ```json
  {
    "plaintiffName": {
      "pdfField": "topmostSubform[0].Page1[0].PlaintiffName[0]",
      "type": "text",
      "transform": "fullName"
    },
    "propertyAddress": {
      "pdfField": "topmostSubform[0].Page1[0].PropertyAddress[0]",
      "type": "text",
      "transform": "address"
    }
  }
  ```
- Utility function `mapFormDataToPdfFields()` reads configuration and applies transformations
- Future: Could add fuzzy matching as fallback for unmapped fields

---

### 3. Continuation Page Generation

**Question**: How to generate standardized continuation pages for overflow plaintiffs/defendants?

**Research**: Court standards for continuation pages (LA Superior Court)

**Findings**:
- California courts accept continuation pages for forms with limited space
- Continuation pages must:
  - Reference the main form (case number, form type)
  - Be clearly labeled "Continuation of [Section Name]"
  - Maintain consistent formatting with main form
  - Be numbered sequentially

**Decision**: **Generate standardized continuation pages using pdf-lib**

**Approach**:
1. **Detect overflow**: Count plaintiffs/defendants, compare to primary PDF capacity
2. **Create continuation page**:
   - Use pdf-lib to create new PDF page
   - Add header with case number and form reference
   - Add "Continuation of Plaintiffs" / "Continuation of Defendants" title
   - List overflow entries in structured format
3. **Merge PDFs**: Append continuation page(s) to primary PDF using pdf-lib page operations
4. **Cross-reference**: Add "See Attachment A" notation in primary PDF

**Template Structure** (to be created):
```
Continuation of Case Management Statement (Form CM-110)
Case Number: [case_number]

Continuation of Plaintiffs:
4. [Plaintiff 4 name]
5. [Plaintiff 5 name]
...
```

**File**: Will create `normalization work/pdf_templates/continuation-template.pdf` or generate programmatically

---

### 4. Async Job Processing

**Question**: Should we use a job queue library or simple database polling?

**Options Evaluated**:
- **Bull** - Redis-based queue, feature-rich, separate infrastructure
- **pg-boss** - PostgreSQL-based queue, uses existing database
- **Simple polling** - Custom polling loop with database queries

**Evaluation Criteria**:
1. Fits existing infrastructure (prefer PostgreSQL over Redis)
2. Supports retry logic with exponential backoff
3. Monitoring and observability capabilities
4. Deployment complexity (Cloud Run constraints)
5. Scale requirements (10-50 PDFs/day initially)

**Decision**: **pg-boss** (PostgreSQL-based job queue)

**Rationale**:
1. **Uses existing PostgreSQL database** - No additional infrastructure (Redis) required
2. **Built-in retry logic** - Supports exponential backoff, max retry attempts
3. **Job monitoring** - Query job state directly from database
4. **Transactional guarantees** - Jobs and data updates in same database transaction
5. **Cloud Run compatible** - No persistent connections required, works with serverless
6. **Scale appropriate** - Handles 10-50 PDFs/day easily, can scale to hundreds
7. **Simple deployment** - One less service to manage vs. Redis

**Package to Install**: `pg-boss` (latest stable version)

**Configuration**:
```javascript
const PgBoss = require('pg-boss');
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  retryLimit: 3,
  retryDelay: 1,
  retryBackoff: true,
  expireInHours: 48
});
```

**Alternative Considered**:
- **Simple polling** - Would work for MVP but lacks retry sophistication and monitoring. pg-boss provides production-ready features with minimal complexity.

---

### 5. PDF Template Field Inspection

**Question**: How to programmatically extract field names and types from CM-110.pdf?

**Approach**: Use pdf-lib's `PDFDocument.load()` and `getForm()` methods

**Research Findings**:
- pdf-lib can load existing PDFs and access AcroForm field metadata
- Field inspection returns: field name, field type, field value, field options
- Field types: text field, checkbox, radio button, dropdown, button

**Implementation**:
```javascript
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function inspectPdfFields(pdfPath) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const fieldInfo = fields.map(field => ({
    name: field.getName(),
    type: field.constructor.name,
    value: field.getValue ? field.getValue() : null
  }));

  return fieldInfo;
}
```

**Decision**: Implement `getTemplateFields()` utility in `server/utils/pdf-templates.js`

**Output**: JSON file documenting all CM-110 fields for reference during field mapping configuration

---

## Implementation Dependencies

### NPM Packages to Install

```bash
npm install pdf-lib pg-boss
```

**pdf-lib** (v1.17.1 or latest):
- Purpose: PDF form field manipulation
- License: MIT
- Size: ~400KB minified
- Dependencies: None (pure JavaScript)

**pg-boss** (v9.0.3 or latest):
- Purpose: PostgreSQL-based job queue
- License: MIT
- Dependencies: pg (PostgreSQL client, already in project)

### System Requirements

- Node.js 18+ (already in use per plan.md)
- PostgreSQL (already in use per plan.md)
- No additional system dependencies

---

## Validation Plan

### Phase 0 Validation (Research Phase)

**T002**: Test pdf-lib with CM-110.pdf
```bash
node -e "
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function test() {
  const pdfBytes = fs.readFileSync('normalization work/pdf_templates/cm110.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  console.log('Fields found:', form.getFields().length);
}

test();
"
```

**Expected**: Successfully loads CM-110.pdf and lists form fields

**T003**: Document field names and types
- Run inspection utility
- Export to JSON
- Validate field types (text, checkbox)
- Confirm all expected fields present

**T004**: Test pg-boss with PostgreSQL
```bash
node -e "
const PgBoss = require('pg-boss');

async function test() {
  const boss = new PgBoss(process.env.DATABASE_URL);
  await boss.start();
  console.log('pg-boss connected');
  await boss.stop();
}

test();
"
```

**Expected**: Successfully connects to PostgreSQL and initializes pg-boss schema

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| pdf-lib cannot handle CM-110 field structure | Low | High | Validate with T002 before proceeding. Have pdftk fallback ready. |
| Field mapping complexity exceeds estimates | Medium | Medium | Manual mapping provides explicit control. Can iterate on mappings. |
| pg-boss performance inadequate for scale | Low | Low | Current scale (10-50 PDFs/day) well within pg-boss capacity. |
| Continuation pages don't meet court standards | Medium | High | Research court requirements early. Validate with legal staff. |

---

## Next Steps

**Research Complete** ✅

**Ready for Phase 1: Project Structure Setup (T006-T013)**
1. Install dependencies: `npm install pdf-lib pg-boss`
2. Create file structure for services, routes, models, utilities
3. Validate pdf-lib with CM-110.pdf
4. Document CM-110 field structure

**Blockers**: None - all research questions resolved, technology decisions made

**Confidence Level**: High - pdf-lib and pg-boss are proven solutions with active maintenance and good documentation
