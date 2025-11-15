# Feature Specification: PDF Form Filling

**Feature Branch**: `001-pdf-form-filling`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "Develop a pdf form filling functionality using the data that is collected from the form. Currently there is only one form for us to start with what is in /Users/ryanhaines/Desktop/Lipton Webserver/normalization work/pdf_templates. Part of this feature function will need to be to identify the form fields and enter the correct data from the form submission."

## Clarifications

### Session 2025-11-12

- Q: When should the system generate the PDF for a form submission? → A: Asynchronously after form submission - PDF generates in background, user notified when ready
- Q: The CM-110 form has limited space for plaintiffs and defendants. What should happen when a submission exceeds this capacity? → A: Generate continuation pages - Create additional standardized pages for overflow entries
- Q: How long should generated PDFs be retained in storage before automatic deletion? → A: Should follow other doc generation
- Q: Who should be authorized to access and download a generated PDF? → A: Upload to Dropbox like other documents
- Q: How should the system handle PDF generation failures? → A: Immediate notification with retry - Notify user immediately of failure, automatically retry up to 3 times, update user on each attempt
- Q: How should PDF generation integrate with the existing Python discovery document pipeline? → A: Hybrid architecture - PDF generation runs in parallel (separate execution) with the Python pipeline, but provides unified user experience through coordinated SSE notifications and integrated download UI. Both processes are independent (can fail separately) but user sees coherent progress updates for both.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Fill PDF with Form Data (Priority: P1)

A legal office user submits case information through the web form. After submission, they receive a pre-filled PDF document (CM-110) with all the case details automatically populated in the correct fields, ready for review and filing with the court.

**Why this priority**: This is the core value proposition - automating the manual process of filling out legal PDF forms. It directly reduces time spent on data entry and eliminates transcription errors, which is the primary business need.

**Independent Test**: Can be fully tested by submitting a complete form entry through the existing system and verifying that a filled PDF is generated with all fields correctly populated. This delivers immediate value by producing a court-ready document.

**Acceptance Scenarios**:

1. **Given** a user has completed the auto-population form with plaintiff details, defendant details, and property address, **When** they submit the form, **Then** the form submission completes immediately and a CM-110 PDF begins generating asynchronously in the background
2. **Given** a PDF generation has completed, **When** the user checks their notifications, **Then** they are notified that the PDF is ready for download with plaintiff names, defendant names, and property address filled in the correct fields
3. **Given** the form includes multiple plaintiffs and defendants, **When** the PDF is generated, **Then** all plaintiffs and defendants are listed in the appropriate sections with correct numbering
4. **Given** the form includes discovery issues (vermin, insects, HVAC, electrical, etc.), **When** the PDF is generated, **Then** the relevant checkboxes and text fields in the CM-110 form are marked/filled accordingly
5. **Given** a form submission with a complete address, **When** the PDF is generated, **Then** the address fields (street, city, county, postal code) are correctly populated

---

### User Story 2 - Download Filled PDF (Priority: P2)

After a form is submitted and the PDF is generated, the user can download the filled PDF document to their local computer for review, printing, or filing with the court.

**Why this priority**: While generating the PDF is the core functionality, being able to access and use it is essential. This is P2 because it's a necessary follow-up to P1 but can be tested once PDF generation works.

**Independent Test**: Can be tested by triggering a download action after PDF generation and verifying the file is complete, readable, and contains the expected form data.

**Acceptance Scenarios**:

1. **Given** a PDF has been generated for a form submission, **When** the user clicks the download button, **Then** the PDF file is downloaded with a meaningful filename (e.g., "CM110_PlaintiffLastName_CaseNumber_Date.pdf")
2. **Given** a downloaded PDF, **When** the user opens it with a PDF reader, **Then** all filled fields are visible and properly formatted
3. **Given** multiple PDF downloads for different submissions, **When** the user reviews their downloads folder, **Then** each PDF has a unique, identifiable filename

---

### User Story 3 - Review PDF Before Download (Priority: P3)

Users can preview the generated PDF in their browser before downloading, allowing them to verify the data was correctly mapped and make any necessary corrections to the source form if needed.

**Why this priority**: This improves user experience and data quality by allowing verification before download, but the core functionality (generating and downloading) works without it.

**Independent Test**: Can be tested by opening a generated PDF in a browser preview pane and verifying all fields are visible and correctly positioned.

**Acceptance Scenarios**:

1. **Given** a PDF has been generated, **When** the user selects "preview", **Then** the PDF opens in a new browser tab or embedded viewer
2. **Given** a user is previewing a PDF and notices incorrect data, **When** they close the preview and edit the form submission, **Then** they can regenerate the PDF with corrected data
3. **Given** a PDF preview is open, **When** the user decides to download, **Then** they can click download directly from the preview interface

---

### User Story 4 - Handle Missing or Incomplete Data (Priority: P2)

When a form submission has missing or incomplete fields, the PDF generation process handles it gracefully by leaving fields blank rather than showing errors, and provides a summary of which fields were not populated.

**Why this priority**: Real-world usage will include incomplete forms, so robust handling is important for reliability. However, it's P2 because the primary path (complete forms) should work first.

**Independent Test**: Can be tested by submitting forms with various missing fields and verifying PDFs are still generated with appropriate blank spaces and a notification about missing data.

**Acceptance Scenarios**:

1. **Given** a form submission is missing the middle name for a plaintiff, **When** the PDF is generated, **Then** the middle name field is left blank and the document is otherwise complete
2. **Given** a form submission is missing optional discovery issues, **When** the PDF is generated, **Then** those sections are left unchecked/blank without causing errors
3. **Given** a form submission is missing critical required fields (e.g., plaintiff name), **When** PDF generation is attempted, **Then** the system provides a clear message indicating which required fields are missing
4. **Given** a PDF was generated with some blank fields, **When** the user reviews it, **Then** a notification indicates which form fields were not populated due to missing source data
5. **Given** PDF generation fails due to a transient error, **When** the system automatically retries, **Then** the user receives a notification about the retry attempt and is informed when generation ultimately succeeds or fails after all retries
6. **Given** PDF generation has failed after all automatic retries, **When** the user views the failure notification, **Then** they have an option to manually trigger regeneration

---

### Edge Cases

- What happens when the form data contains special characters or extremely long text that exceeds PDF field character limits?
- ~~How does the system handle form submissions with more plaintiffs or defendants than the PDF template has space for?~~ → Resolved: System generates continuation pages for overflow entries with proper cross-referencing
- What happens if the PDF template file is missing or corrupted?
- How does the system behave if multiple users request PDF generation simultaneously?
- What happens when a form includes contradictory selections (e.g., both "yes" and "no" for the same issue)?
- How does the system handle address data that doesn't fit standard formatting (e.g., international addresses, PO boxes)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify all fillable fields in the CM-110 PDF template by extracting field names and types
- **FR-002**: System MUST map form submission data fields to corresponding PDF form fields based on field name matching and semantic relationships
- **FR-003**: System MUST populate text fields in the PDF with data from form submissions (plaintiff names, defendant names, addresses, case details)
- **FR-004**: System MUST populate checkbox fields in the PDF based on boolean values and array selections from form submissions
- **FR-005**: System MUST handle multiple plaintiff entries by populating available plaintiff sections in the primary PDF and generating standardized continuation pages for overflow entries
- **FR-006**: System MUST handle multiple defendant entries by populating available defendant sections in the primary PDF and generating standardized continuation pages for overflow entries
- **FR-006a**: System MUST maintain proper cross-referencing between primary PDF and continuation pages, indicating "continued on attachment" or similar notation
- **FR-007**: System MUST generate a unique filename for each filled PDF based on case information and timestamp
- **FR-008**: System MUST preserve PDF formatting, fonts, and layout when filling fields
- **FR-009**: System MUST validate that required PDF fields are filled before marking the PDF as complete
- **FR-010**: System MUST handle missing or null data by leaving corresponding PDF fields blank without generating errors
- **FR-011**: System MUST truncate or wrap text that exceeds PDF field character limits appropriately
- **FR-012**: System MUST upload generated PDFs to Dropbox following the same process as other generated documents
- **FR-013**: System MUST store Dropbox file references with association to the original form submission, following the same retention policy as other generated documents in the system
- **FR-014**: System MUST log PDF generation events including success, failure, and data mapping issues
- **FR-015**: System MUST map discovery issue arrays (vermin, insects, HVAC, electrical, etc.) to appropriate PDF checkboxes or text fields
- **FR-016**: System MUST format address data to match PDF field structure (separate street, city, county, postal code fields)
- **FR-017**: System MUST handle date formatting from form submissions to match PDF date field requirements
- **FR-018**: System MUST support regeneration of PDFs for existing form submissions if data is corrected
- **FR-019**: System MUST trigger PDF generation asynchronously after form submission completes, without blocking the submission response
- **FR-020**: System MUST notify users immediately when PDF generation fails, including specific error details
- **FR-021**: System MUST automatically retry failed PDF generation up to 3 times with exponential backoff
- **FR-022**: System MUST notify users of each retry attempt and final outcome (success or exhausted retries)
- **FR-023**: System MUST provide users the ability to manually trigger PDF regeneration after all automatic retries are exhausted
- **FR-024**: System MUST handle concurrent PDF generation requests without data corruption or file conflicts
- **FR-025**: System MUST execute PDF generation in parallel with the Python discovery document pipeline, with independent failure handling (one process can fail without affecting the other)
- **FR-026**: System MUST send coordinated SSE notifications for both PDF generation and discovery document processing through a unified event stream, allowing users to track both processes from a single notification interface

### Key Entities

- **Form Submission**: Represents the structured JSON data collected from the web form, including plaintiff details, defendant details, discovery issues, and property information. This is the source data for PDF filling.

- **PDF Template**: The blank CM-110 court form with fillable fields. Contains field definitions, positioning, and formatting rules that determine where and how data appears.

- **Filled PDF**: The completed PDF document with form submission data populated into the template fields. Associated with a specific form submission and includes metadata about generation time, mapping completeness, retry attempts, and final status.

- **PDF Generation Job**: Tracks the asynchronous PDF generation process, including status (pending, processing, retrying, completed, failed), retry count, error messages, and timestamps for each attempt.

- **Field Mapping**: The relationship between form submission field names and PDF template field names. Defines how data flows from JSON structure to PDF fields, including transformations needed for format compatibility.

- **Plaintiff Entity**: Individual or organization listed as plaintiff, containing name components, type, age category, and discovery issues specific to that plaintiff.

- **Defendant Entity**: Individual or organization listed as defendant, containing name, type, and role (manager/owner).

- **Address**: Property address information with multiple format variants (full address, street only, city/state/postal) to match different PDF field requirements.

- **Discovery Issues**: Structured collection of habitability problems, violations, and conditions affecting the property, organized by category (vermin, insects, HVAC, electrical, fire hazards, plumbing, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a filled CM-110 PDF from a complete form submission in under 5 seconds
- **SC-002**: 95% of form fields with available data are correctly populated in generated PDFs
- **SC-003**: Generated PDFs are readable and printable in standard PDF viewers without formatting issues
- **SC-004**: System successfully handles form submissions with 1-10 plaintiffs and 1-10 defendants without errors
- **SC-005**: PDF generation succeeds even when 30% of optional fields are missing from form submission
- **SC-006**: System can process at least 10 concurrent PDF generation requests without performance degradation
- **SC-007**: Generated PDFs include at least 90% of submitted discovery issues correctly mapped to appropriate fields or checkboxes
- **SC-008**: Users can download generated PDFs with meaningful filenames that include case identifying information

## Assumptions *(optional)*

- The CM-110 PDF template has standard fillable form fields that can be programmatically accessed and modified
- Form submission data is already validated and structured in the JSON format shown in the reference example
- The system has an existing Dropbox integration for document uploads that can be reused for PDF uploads
- PDF generation will occur server-side as part of the form submission processing workflow
- The system has an existing document retention policy that applies to generated documents, which will also govern PDF storage lifecycle
- Dropbox access control and sharing permissions follow the same model as other uploaded documents
- The legal office users have appropriate PDF viewing software (Adobe Reader, browser PDF viewer, etc.)
- Form submissions are stored in the database with unique identifiers that can link to generated PDFs
- The system will initially support only the CM-110 form, with architecture designed to support additional form templates in the future
- PDF generation and Python discovery document pipeline will run as independent parallel processes, with PDF generation typically completing much faster (~5 seconds) than discovery document generation (~2-5 minutes)
- The existing SSE notification infrastructure can be extended to handle notifications from both PDF generation and discovery document processes in a coordinated manner

## Dependencies *(optional)*

- PDF manipulation library capable of reading template fields and writing data to fillable PDFs
- Existing form submission endpoint and data storage system
- Dropbox integration service for uploading generated PDFs (consistent with existing document upload workflow)
- Access to the CM-110 PDF template file in the codebase

## Constraints *(optional)*

- PDF field names in the template may not match form submission field names exactly, requiring intelligent mapping logic
- PDF forms have character limits on text fields that may truncate long entries
- PDF templates have fixed space for plaintiffs/defendants, which may require handling overflow cases
- Court forms must maintain specific formatting and layout requirements for legal validity
- Generated PDFs should be immutable once created to maintain audit trail integrity

## Out of Scope *(optional)*

- Support for additional PDF forms beyond CM-110 (will be addressed in future features)
- Digital signature capabilities on generated PDFs
- PDF form validation against court filing requirements
- Editing or annotation of generated PDFs within the application
- Optical Character Recognition (OCR) for non-fillable PDF forms
- Merging multiple form types into a single PDF package
- Email delivery of generated PDFs (separate feature)
- Integration with court electronic filing systems
- Multi-language support for PDF forms
- Real-time collaborative editing of form data before PDF generation
