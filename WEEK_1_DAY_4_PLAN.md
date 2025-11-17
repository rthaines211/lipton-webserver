# Week 1, Day 4 - Detailed Plan

**Date:** November 18, 2025
**Branch:** dev/intake-system
**Goal:** Service Layer Enhancement - Storage & Email

---

## Overview

Create intake-specific services by adapting existing Dropbox and email infrastructure for the intake system. Focus on reusability and maintaining consistency with existing patterns.

---

## Morning Tasks (9:00 AM - 12:00 PM)

### Task 1: Create Intake Storage Service (2 hours)

**File:** `services/storage-service.js`

**Purpose:** Wrap existing Dropbox service with intake-specific functionality

**Implementation Details:**

1. **Import existing Dropbox service**
   ```javascript
   const dropboxService = require('../dropbox-service');
   ```

2. **Create intake-specific upload functions:**
   - `createClientFolder(streetAddress, fullName)` - Create `/Current Clients/<Street>/<Name>/`
   - `uploadIntakeDocument(streetAddress, fullName, file, documentType)` - Upload single document
   - `uploadIntakeDocuments(streetAddress, fullName, files)` - Upload multiple documents
   - `createDropboxSharedLink(streetAddress, fullName)` - Generate shareable upload link
   - `sanitizeFolderName(name)` - Clean street address/name for folder use
   - `getClientFolderPath(streetAddress, fullName)` - Get full Dropbox path

3. **Folder Structure:**
   ```
   /Current Clients/
     ├── 123 Main Street/
     │   └── John Doe/
     │       ├── intake-submission.json
     │       └── uploaded-documents/
     │           ├── identification/
     │           ├── supporting-docs/
     │           └── additional-files/
   ```

   **Path Format:** `/Current Clients/<Street Address>/<Full Name>/`
   - Street Address: From intake form (e.g., "123 Main Street")
   - Full Name: `${firstName} ${lastName}` (e.g., "John Doe")
   - Shared link points to client's folder for document uploads

4. **Features:**
   - File validation (type, size limits)
   - Automatic folder creation per street address + name
   - Shared link creation for client upload access
   - Upload metadata tracking
   - Error handling with graceful fallback
   - Path sanitization (remove special characters from folder names)

**Dependencies:**
- Existing `dropbox-service.js`
- File upload middleware (multer - already in project)

---

### Task 2: Add Intake Email Template (1 hour)

**File:** `email-templates.js` (modify existing)

**Purpose:** Add intake confirmation template matching existing style

**Template Function:** `getIntakeConfirmationTemplate(options)`

**Options:**
```javascript
{
  firstName: string,
  lastName: string,
  streetAddress: string,    // e.g., "123 Main Street"
  intakeNumber: string,     // e.g., "INT-2025-00001"
  dropboxLink: string,      // Shared link to client's Dropbox folder
  submittedAt: Date
}
```

**Template Design** (matching existing style):

**Header:** Same gradient style
```
Lipton Legal Group
Client Intake System
```

**Subject:** `Intake Submitted - [intakeNumber]`

**Content:**
- ✅ Confirmation: "We received your intake submission"
- 📋 Reference number: Display intake number prominently
- 📍 Property address: Display street address
- 🔒 Security message: "Your information is secure"
- 📎 CTA Button: "Upload Additional Documents" → dropboxLink (shared folder access)
- 💡 Instructions: "Use this link to upload additional documents directly to your case folder"
- 📞 Footer: Contact info and automated notification disclaimer

**Colors:** Match existing
- Primary: #00AEEF (Lipton Legal blue)
- Header gradient: #1F2A44 to #2A3B5A
- Text: #333333
- Background: #f8f9fa

**Must Include:**
- Mobile-responsive design
- Plain text fallback
- HTML email best practices
- Same structure as existing templates

---

## Afternoon Tasks (1:00 PM - 5:00 PM)

### Task 3: Enhance Email Service for Intake (1 hour)

**File:** `email-service.js` (modify existing)

**Purpose:** Add intake email function using existing retry/validation logic

**New Function:** `sendIntakeConfirmation(options)`

```javascript
/**
 * Send intake confirmation email
 *
 * @param {Object} options
 * @param {string} options.to - Client email
 * @param {string} options.firstName - Client first name
 * @param {string} options.lastName - Client last name
 * @param {string} options.streetAddress - Property address
 * @param {string} options.intakeNumber - Intake reference (INT-2025-00001)
 * @param {string} options.dropboxLink - Shared Dropbox folder link for uploads
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendIntakeConfirmation(options) {
  // Use existing validation, retry, and SendGrid logic
  // Call new template: emailTemplates.getIntakeConfirmationTemplate(options)
}
```

**Reuses Existing:**
- Email validation (`validateEmail`)
- Retry logic (`sendWithRetry`)
- SendGrid configuration
- Error handling patterns

---

### Task 4: Update Intake Service Integration (1.5 hours)

**File:** `services/intake-service.js` (enhance existing)

**Purpose:** Integrate storage and email services into intake workflows

**Enhancements:**

1. **Add service imports:**
   ```javascript
   const storageService = require('./storage-service');
   const emailService = require('../email-service');
   ```

2. **Enhance existing methods:**

   **`createIntakeSubmission()`** - Create Dropbox folder and send email
   ```javascript
   // After creating intake in database

   // 1. Create client folder in Dropbox
   const folderPath = await storageService.createClientFolder(
     intakeData.current_street_address,
     `${intakeData.first_name} ${intakeData.last_name}`
   );

   // 2. Create shared link to folder for client uploads
   const dropboxLink = await storageService.createDropboxSharedLink(
     intakeData.current_street_address,
     `${intakeData.first_name} ${intakeData.last_name}`
   );

   // 3. Send confirmation email with Dropbox link
   const emailResult = await emailService.sendIntakeConfirmation({
     to: intakeData.client_email,
     firstName: intakeData.first_name,
     lastName: intakeData.last_name,
     streetAddress: intakeData.current_street_address,
     intakeNumber: intakeNumber,
     dropboxLink: dropboxLink
   });
   ```

   **New: `uploadIntakeDocument(streetAddress, fullName, file)`**
   ```javascript
   async uploadIntakeDocument(streetAddress, fullName, file) {
     // Validate file
     // Upload to Dropbox via storage service
     // Store metadata in database
     // Return result with Dropbox path
   }
   ```

3. **Add helper methods:**
   - `getClientDropboxPath(streetAddress, fullName)` - Get Dropbox folder path
   - `getIntakeDocuments(streetAddress, fullName)` - List uploaded documents
   - `validateFileUpload(file)` - Check file type/size
   - `sanitizeAddressForFolder(address)` - Clean address for folder name

---

### Task 5: Testing & Documentation (1.5 hours)

**Testing:**

1. **Storage Service Tests:**
   ```bash
   # Test Dropbox folder creation
   node -e "const storage = require('./services/storage-service'); \
            storage.createClientFolder('123 Main Street', 'John Doe').then(console.log)"

   # Test shared link creation
   node -e "const storage = require('./services/storage-service'); \
            storage.createDropboxSharedLink('123 Main Street', 'John Doe').then(console.log)"
   ```

2. **Email Template Tests:**
   ```bash
   # Render template to verify HTML
   node -e "const templates = require('./email-templates'); \
            console.log(templates.getIntakeConfirmationTemplate({
              firstName: 'John',
              lastName: 'Doe',
              streetAddress: '123 Main Street',
              intakeNumber: 'INT-2025-00001',
              dropboxLink: 'https://www.dropbox.com/sh/example123'
            }).html)"
   ```

3. **Integration Test:**
   - Create test intake submission
   - Verify Dropbox folder created: `/Current Clients/123 Main Street/John Doe/`
   - Verify shared link generated and accessible
   - Verify email sent with correct Dropbox link

**Documentation:**

1. **Update service JSDoc:**
   - Document all new functions
   - Add usage examples
   - Note dependencies

2. **Create Day 4 summary:** `WEEK_1_DAY_4_COMPLETE.md`
   - What was built
   - How services integrate
   - Testing results

---

## Deliverables

### New Files (1)
- `services/storage-service.js` - Intake storage wrapper (~200 lines)

### Modified Files (2)
- `email-templates.js` - Add intake template (~150 lines)
- `email-service.js` - Add sendIntakeConfirmation (~50 lines)

### Enhanced Files (1)
- `services/intake-service.js` - Integrate storage/email (~100 lines added)

### Documentation (1)
- `WEEK_1_DAY_4_COMPLETE.md` - Day summary

---

## Success Criteria

✅ Storage service successfully uploads to Dropbox
✅ Intake email template matches existing design
✅ Email confirmation sends successfully
✅ Intake service integrates both services
✅ All functions have JSDoc documentation
✅ Manual tests pass

---

## Notes

- **Reuse existing infrastructure** - Don't rebuild Dropbox/SendGrid logic
- **Maintain consistency** - Email templates must match existing style exactly
- **Security** - Validate all file uploads, sanitize email inputs
- **Error handling** - Graceful fallback if Dropbox/email fails
- **Environment variables** - Use existing DROPBOX_* and SENDGRID_* vars

---

**Estimated Time:** 6-7 hours
**Complexity:** Medium (mostly integration work)
**Dependencies:** Existing dropbox-service.js, email-service.js

---

*Created: November 17, 2025*
*Ready for Day 4 implementation*
