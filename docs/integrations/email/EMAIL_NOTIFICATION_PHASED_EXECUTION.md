# Email Notification Feature - Phased Execution Guide

**Purpose:** Step-by-step execution guide for implementing email notifications
**Status:** 🚀 Ready to Build
**Start Date:** 2025-10-24
**Reference:** See `EMAIL_NOTIFICATION_IMPLEMENTATION_PLAN.md` for detailed specifications

---

## 🎯 Quick Overview

**What We're Building:**
Email notifications sent to users when their documents are ready after Docmosis generation.

**Key Requirements:**
- Email sent ONLY after pipeline completes successfully
- Include Dropbox shared link (if available)
- Graceful fallback if no Dropbox link
- Subject: `{streetAddress} - Discover Forms Generated`
- Non-blocking (won't fail form submission if email fails)

**Total Phases:** 6
**Estimated Time:** 6-9 hours
**Deployment Target:** GCP Cloud Run

---

## Phase 1: Setup Foundation (1-2 hours)

**Goal:** Install SendGrid, create email service module, configure environment

### ✅ Checkpoint 1.1: Install SendGrid Package

**Task:** Add SendGrid to project dependencies

```bash
npm install @sendgrid/mail --save
```

**Expected Result:**
- `package.json` updated with `@sendgrid/mail` dependency
- `package-lock.json` updated

**Verification:**
```bash
npm list @sendgrid/mail
# Should show: @sendgrid/mail@7.x.x
```

---

### ✅ Checkpoint 1.2: Create Email Service Module

**Task:** Create `email-service.js` with core functionality

**File:** `email-service.js` (NEW FILE)

**Required Functions:**
1. `initialize()` - Setup SendGrid client
2. `sendCompletionNotification(options)` - Main email sending function
3. `sendWithRetry(emailData, maxRetries)` - Retry logic
4. `validateEmail(email)` - Email validation
5. `isEnabled()` - Check if email service is active

**Key Features:**
- Try-catch error handling
- Exponential backoff retry (1s, 2s, 4s)
- Winston logging integration
- Never throw errors (return success/failure object)

**Function Signature:**
```javascript
/**
 * Send completion notification email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.streetAddress - Property address
 * @param {number} options.caseId - Case ID
 * @param {string|null} options.dropboxLink - Dropbox shared link (optional)
 * @param {number} options.documentCount - Number of documents generated
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendCompletionNotification(options) { ... }
```

**Template Structure:**
```javascript
// email-service.js structure
const sgMail = require('@sendgrid/mail');
const logger = require('./monitoring/logger');
const emailTemplates = require('./email-templates');

// Configuration from environment
const CONFIG = {
    apiKey: process.env.SENDGRID_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'notifications@liptonlegal.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Lipton Legal',
    enabled: process.env.EMAIL_ENABLED !== 'false',
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000')
};

// Initialize SendGrid
function initialize() { ... }

// Main send function
async function sendCompletionNotification(options) { ... }

// Retry wrapper
async function sendWithRetry(emailData, maxRetries = 3) { ... }

// Validation
function validateEmail(email) { ... }

// Status check
function isEnabled() { ... }

module.exports = {
    sendCompletionNotification,
    isEnabled
};
```

**Verification:**
- File created: `email-service.js`
- Exports: `sendCompletionNotification`, `isEnabled`
- No syntax errors: `node -c email-service.js`

---

### ✅ Checkpoint 1.3: Create Email Templates Module

**Task:** Create `email-templates.js` with HTML templates

**File:** `email-templates.js` (NEW FILE)

**Required Functions:**
1. `getCompletionEmailTemplate(options)` - Email with Dropbox link
2. `getCompletionEmailTemplateNoLink(options)` - Email without link
3. `getPlainTextVersion(htmlContent)` - Plain text fallback

**Template Variables:**
- `{{name}}` - User's name
- `{{streetAddress}}` - Property address
- `{{documentCount}}` - Number of documents
- `{{completionDate}}` - Timestamp
- `{{dropboxLink}}` - Shared link URL

**Design Requirements:**
- Lipton Legal blue: `#00AEEF`
- Mobile-responsive
- Clean, professional layout
- Clear call-to-action button
- Fallback message if no Dropbox link

**Function Signature:**
```javascript
/**
 * Get completion email template with Dropbox link
 * @param {Object} options
 * @param {string} options.name - Recipient name
 * @param {string} options.streetAddress - Property address
 * @param {number} options.documentCount - Number of documents
 * @param {string} options.dropboxLink - Dropbox shared link
 * @returns {Object} { subject, html, text }
 */
function getCompletionEmailTemplate(options) { ... }
```

**Subject Line Format:**
```
{streetAddress} - Discover Forms Generated
```

**Example:** `123 Main Street - Discover Forms Generated`

**Verification:**
- File created: `email-templates.js`
- Exports: `getCompletionEmailTemplate`, `getCompletionEmailTemplateNoLink`
- Test template rendering: Call function with sample data
- No syntax errors: `node -c email-templates.js`

---

### ✅ Checkpoint 1.4: Update Environment Configuration

**Task:** Add email configuration to `.env.example`

**File:** `.env.example` (MODIFY)

**Add these lines at the end:**
```env

# ============================================
# Email Notification Configuration
# ============================================

# Email Service Provider
EMAIL_PROVIDER=sendgrid

# SendGrid API Key
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.your-api-key-here

# Email Settings
EMAIL_FROM_ADDRESS=notifications@liptonlegal.com
EMAIL_FROM_NAME=Lipton Legal
EMAIL_ENABLED=true

# Email Retry Configuration
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=1000
```

**Task:** Create your local `.env` file

**Action:** Copy `.env.example` to `.env` and add real SendGrid API key

```bash
cp .env.example .env
```

**Important:** Add `.env` to `.gitignore` if not already there!

**Verification:**
- `.env.example` updated
- `.env` created with placeholder API key
- `.gitignore` contains `.env`

---

### ✅ Checkpoint 1.5: Test Email Service Module

**Task:** Create test script to verify SendGrid connection

**File:** `test-email-service.js` (TEMPORARY TEST FILE)

```javascript
require('dotenv').config();
const emailService = require('./email-service');

async function testEmailService() {
    console.log('🧪 Testing Email Service...\n');

    // Test 1: Check if enabled
    console.log('Test 1: Check if email service is enabled');
    const enabled = emailService.isEnabled();
    console.log(`   Result: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n`);

    if (!enabled) {
        console.log('⚠️  Email service disabled. Enable EMAIL_ENABLED=true in .env');
        return;
    }

    // Test 2: Send test email
    console.log('Test 2: Send test email');
    console.log('   To: your-test-email@example.com'); // Replace with your email

    const result = await emailService.sendCompletionNotification({
        to: 'your-test-email@example.com', // REPLACE THIS
        name: 'Test User',
        streetAddress: '123 Test Street',
        caseId: 99999,
        dropboxLink: 'https://www.dropbox.com/test',
        documentCount: 32
    });

    if (result.success) {
        console.log('   Result: ✅ Email sent successfully!');
        console.log('   Check your inbox (and spam folder)');
    } else {
        console.log('   Result: ❌ Email failed');
        console.log(`   Error: ${result.error}`);
    }
}

testEmailService()
    .then(() => console.log('\n✅ Test complete'))
    .catch(error => console.error('\n❌ Test failed:', error));
```

**Run Test:**
```bash
node test-email-service.js
```

**Expected Output:**
```
🧪 Testing Email Service...

Test 1: Check if email service is enabled
   Result: ✅ Enabled

Test 2: Send test email
   To: your-test-email@example.com
   Result: ✅ Email sent successfully!
   Check your inbox (and spam folder)

✅ Test complete
```

**Verification:**
- Test script runs without errors
- Email received in inbox (check spam)
- Email formatting looks correct
- Subject line correct
- Dropbox link works

**⚠️ If test fails:**
- Check `SENDGRID_API_KEY` is correct in `.env`
- Verify API key has "Mail Send" permissions
- Confirm sender email is verified in SendGrid
- Check SendGrid dashboard for error details

---

### 📋 Phase 1 Completion Checklist

- [ ] SendGrid package installed (`@sendgrid/mail`)
- [ ] `email-service.js` created (~250 lines)
- [ ] `email-templates.js` created (~200 lines)
- [ ] `.env.example` updated with email config
- [ ] `.env` created with real SendGrid API key
- [ ] Test script runs successfully
- [ ] Test email received and formatted correctly

**Phase 1 Complete! ✅**

---

## Phase 2: SendGrid Account Setup (30 minutes)

**Goal:** Create SendGrid account, verify sender, get API key

### ✅ Checkpoint 2.1: Create SendGrid Account

**Action:** Sign up for free SendGrid account

1. Go to [sendgrid.com](https://sendgrid.com)
2. Click "Sign Up"
3. Choose "Free" plan (100 emails/day)
4. Enter details:
   - Email: Your work email
   - Company: Lipton Legal
5. Verify email address
6. Complete account setup

**Verification:**
- Account created
- Email verified
- Can log into SendGrid dashboard

---

### ✅ Checkpoint 2.2: Verify Sender Email

**Action:** Verify `notifications@liptonlegal.com` as sender

**Option A: Single Sender Verification (Quick - 5 minutes)**

1. Log into SendGrid dashboard
2. Go to **Settings** → **Sender Authentication**
3. Click **"Verify a Single Sender"**
4. Fill out form:
   - From Email: `notifications@liptonlegal.com`
   - From Name: `Lipton Legal`
   - Reply-To: `notifications@liptonlegal.com`
   - Company Address: (fill in your address)
5. Click **"Create"**
6. Check email for verification link
7. Click verification link
8. Status changes to **"Verified"** ✓

**⚠️ Note:** You must have access to `notifications@liptonlegal.com` inbox to verify.

**Option B: Domain Verification (Better - 1-2 days)**

1. Go to **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Select DNS provider: **"Cloudflare"**
4. Enter domain: `liptonlegal.com`
5. SendGrid provides 3 DNS records (CNAME)
6. Add records to Cloudflare DNS settings
7. Wait 24-48 hours for verification
8. Status changes to **"Verified"** ✓

**Recommendation:** Start with Option A (quick), upgrade to Option B later for better deliverability.

**Verification:**
- Sender email verified (green checkmark in SendGrid)
- Can send from `notifications@liptonlegal.com`

---

### ✅ Checkpoint 2.3: Create API Key

**Action:** Create API key with proper permissions

1. Log into SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Settings:
   - Name: `lipton-legal-notifications`
   - Type: **"Restricted Access"**
   - Permissions:
     - **Mail Send**: Full Access ✓
     - All others: No Access
5. Click **"Create & View"**
6. **IMPORTANT:** Copy API key immediately (shown only once!)
7. Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Security Note:** Never commit this key to git!

**Action:** Add API key to `.env`

```bash
# Open .env file
nano .env

# Replace placeholder with real key:
SENDGRID_API_KEY=SG.your-actual-api-key-here

# Save and close
```

**Verification:**
- API key copied
- API key added to `.env`
- `.env` not tracked by git
- Can see key in SendGrid dashboard

---

### 📋 Phase 2 Completion Checklist

- [ ] SendGrid account created
- [ ] Sender email verified (`notifications@liptonlegal.com`)
- [ ] API key created with Mail Send permissions
- [ ] API key added to `.env` file
- [ ] Re-run test script: `node test-email-service.js`
- [ ] Test email received successfully

**Phase 2 Complete! ✅**

---

## Phase 3: Frontend Updates (15 minutes)

**Goal:** Enable email input field and update button text

### ✅ Checkpoint 3.1: Enable Email Input Field

**File:** `index.html`
**Line:** 2887

**Current Code:**
```html
<input type="email" id="notificationEmailInput" name="notificationEmailInput"
       placeholder="Email notification functionality coming soon..." disabled>
```

**New Code:**
```html
<input type="email" id="notificationEmailInput" name="notificationEmailInput"
       placeholder="your.email@example.com" required>
```

**Changes:**
1. Remove `disabled` attribute
2. Change placeholder to example email
3. Add `required` attribute (optional but recommended)

**Verification:**
- Open `index.html` in browser
- Fill out form
- Click submit → Email modal appears
- Email input is enabled (not grayed out)
- Can type in email field

---

### ✅ Checkpoint 3.2: Update Button Text

**File:** `index.html`
**Line:** 2896

**Current Code:**
```html
<button type="button" class="btn btn-primary" onclick="submitEmailNotification()">
    <i class="fas fa-paper-plane"></i> Save Email & Submit
</button>
```

**New Code:**
```html
<button type="button" class="btn btn-primary" onclick="submitEmailNotification()">
    <i class="fas fa-paper-plane"></i> Email & Submit
</button>
```

**Changes:**
1. Change button text: "Save Email & Submit" → "Email & Submit"

**Verification:**
- Open `index.html` in browser
- Fill out form
- Click submit → Email modal appears
- Button text reads "Email & Submit"

---

### ✅ Checkpoint 3.3: Test Email Validation

**Task:** Verify email validation works

**Test Cases:**

1. **Valid email:** `user@example.com`
   - Should accept and submit

2. **Invalid email:** `notanemail`
   - Should show validation error

3. **Empty email (opt-out):** Click "Skip & Submit"
   - Should submit without email

**Expected Behavior:**
- Valid emails accepted
- Invalid emails rejected with error message
- Skip option works

**Verification:**
- All test cases pass
- Validation error messages display correctly
- Form submits successfully in all cases

---

### 📋 Phase 3 Completion Checklist

- [ ] Email input field enabled (line 2887)
- [ ] Button text updated to "Email & Submit" (line 2896)
- [ ] Email validation tested (valid/invalid/empty)
- [ ] Modal displays correctly
- [ ] Form submission works

**Phase 3 Complete! ✅**

---

## Phase 4: Backend Integration (2-3 hours)

**Goal:** Add email sending logic to pipeline completion

### ✅ Checkpoint 4.1: Investigate Dropbox Integration

**Task:** Find where documents are uploaded after Docmosis generation

**Files to Check:**
1. `/api/main.py` - Python FastAPI endpoints
2. `/api/etl_service.py` - Python ETL logic
3. `server.js` - Node.js backend
4. `dropbox-service.js` - Dropbox utilities

**Questions to Answer:**
- Where are documents uploaded to Dropbox?
- What folder structure is used?
- How to generate shared links?

**Search Commands:**
```bash
# Search Python API for Dropbox references
grep -r "dropbox" api/

# Search for upload functions
grep -r "upload" api/

# Check existing Dropbox service
cat dropbox-service.js | grep -A 10 "function"
```

**Expected Finding:**
- Documents uploaded to: `/Apps/LegalFormApp/{streetAddress}/`
- Upload happens in Python or Node.js
- Shared link generation method (or need to add it)

**Action:** Document findings in comments for next checkpoint

---

### ✅ Checkpoint 4.2: Add Dropbox Shared Link Function

**File:** `dropbox-service.js` (MODIFY)

**Task:** Add function to create shared links

**New Function:**
```javascript
/**
 * Creates a shared link for a Dropbox folder
 * @param {string} folderPath - Dropbox folder path (e.g., /Apps/LegalFormApp/123 Main St/)
 * @returns {Promise<string|null>} Shared link URL or null if fails
 */
async function createSharedLink(folderPath) {
    if (!dbx || !DROPBOX_CONFIG.enabled) {
        console.log('ℹ️  Dropbox disabled, cannot create shared link');
        return null;
    }

    try {
        // Check if shared link already exists
        const existingLinks = await dbx.sharingListSharedLinks({
            path: folderPath,
            direct_only: true
        });

        if (existingLinks.result.links.length > 0) {
            const existingUrl = existingLinks.result.links[0].url;
            console.log(`📎 Using existing Dropbox shared link: ${existingUrl}`);
            return existingUrl;
        }

        // Create new shared link
        const response = await dbx.sharingCreateSharedLinkWithSettings({
            path: folderPath,
            settings: {
                requested_visibility: 'public',
                audience: 'public',
                access: 'viewer'
            }
        });

        const newUrl = response.result.url;
        console.log(`📎 Created new Dropbox shared link: ${newUrl}`);
        return newUrl;

    } catch (error) {
        console.error('❌ Failed to create Dropbox shared link:', error.error || error.message);

        // Return null on failure (graceful degradation)
        return null;
    }
}

// Add to module exports
module.exports = {
    uploadFile,
    ensureFolderExists,
    isEnabled,
    createSharedLink  // ← NEW EXPORT
};
```

**Verification:**
- Function added to `dropbox-service.js`
- Exported in `module.exports`
- No syntax errors: `node -c dropbox-service.js`

---

### ✅ Checkpoint 4.3: Add Email Service Import

**File:** `server.js`
**Line:** ~5-10 (top of file with other requires)

**Add this line:**
```javascript
const emailService = require('./email-service');
```

**Full context:**
```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const emailService = require('./email-service');  // ← NEW IMPORT
// ... rest of imports
```

**Verification:**
- Import added near top of `server.js`
- No syntax errors: `node -c server.js`

---

### ✅ Checkpoint 4.4: Add Email Sending Logic

**File:** `server.js`
**Function:** `callNormalizationPipeline()`
**Line:** ~1338 (after `if (response.data.success)`)

**Location:** Inside the success block, after cache update

**Current Code (line ~1325-1345):**
```javascript
if (response.data.success) {
    console.log(`✅ Pipeline completed successfully in ${executionTime}ms`);

    // Extract webhook summary
    const webhookSummary = response.data.webhook_summary || null;
    if (webhookSummary) {
        console.log(`📄 Documents generated: ${webhookSummary.total_sets} (${webhookSummary.succeeded} succeeded, ${webhookSummary.failed} failed)`);
    }

    if (response.data.phase_results) {
        Object.entries(response.data.phase_results).forEach(([phase, results]) => {
            console.log(`   - ${phase}:`, JSON.stringify(results));
        });
    }

    // Store success status in cache
    setPipelineStatus(caseId, {
        status: 'success',
        phase: 'complete',
        progress: 100,
        currentPhase: webhookSummary ? `Generated ${webhookSummary.total_sets} documents` : 'Complete',
        totalPhases: 5,
        startTime: startTime,
        endTime: Date.now(),
        executionTime: executionTime,
        error: null,
        result: response.data,
        webhookSummary: webhookSummary
    });

    // ⬇️ ADD EMAIL LOGIC HERE ⬇️

    return {
        success: true,
        executionTime: executionTime,
        case_id: caseId,
        ...response.data
    };
}
```

**New Code to Insert:**
```javascript
// ============================================
// EMAIL NOTIFICATION LOGIC (NEW)
// ============================================

// Send email notification if user opted in
const shouldSendEmail = structuredData.raw_payload?.notificationEmail &&
                       structuredData.raw_payload?.notificationEmailOptIn === true;

if (shouldSendEmail) {
    console.log(`📧 Preparing email notification for: ${structuredData.raw_payload.notificationEmail}`);

    // Don't await - run email sending async (non-blocking)
    (async () => {
        try {
            // Extract street address from form data (multiple possible locations)
            const streetAddress =
                structuredData.raw_payload['street-address'] ||
                structuredData.Full_Address?.StreetAddress ||
                structuredData.raw_payload['Full_Address.StreetAddress'] ||
                'your property';

            console.log(`📍 Property address: ${streetAddress}`);

            // Try to get Dropbox shared link (if Dropbox enabled)
            let dropboxLink = null;
            const dropboxService = require('./dropbox-service');

            if (dropboxService.isEnabled()) {
                // Format folder path for Dropbox
                const folderPath = `/Apps/LegalFormApp/${streetAddress}`;
                console.log(`📁 Checking Dropbox folder: ${folderPath}`);

                dropboxLink = await dropboxService.createSharedLink(folderPath);

                if (dropboxLink) {
                    console.log(`✅ Dropbox link generated successfully`);
                } else {
                    console.log(`⚠️  Dropbox link generation failed (will send email without link)`);
                }
            } else {
                console.log(`ℹ️  Dropbox disabled (will send email without link)`);
            }

            // Send email notification
            const emailResult = await emailService.sendCompletionNotification({
                to: structuredData.raw_payload.notificationEmail,
                name: structuredData.raw_payload.notificationName || 'User',
                streetAddress: streetAddress,
                caseId: caseId,
                dropboxLink: dropboxLink,
                documentCount: webhookSummary?.total_sets || 32
            });

            if (emailResult.success) {
                console.log(`✅ Email notification sent successfully to ${structuredData.raw_payload.notificationEmail}`);
            } else {
                console.error(`❌ Email notification failed: ${emailResult.error}`);
            }

        } catch (emailError) {
            // Log error but don't fail the pipeline
            console.error('❌ Email notification error (non-blocking):', emailError);
        }
    })();

} else {
    console.log(`ℹ️  Email notification skipped (user did not opt in)`);
}

// ============================================
// END EMAIL NOTIFICATION LOGIC
// ============================================
```

**Key Points:**
- Email sending is non-blocking (wrapped in async IIFE)
- Pipeline continues even if email fails
- Gracefully handles missing Dropbox link
- Extensive logging for debugging
- Extracts street address from multiple possible locations

**Verification:**
- Code inserted correctly
- No syntax errors: `node -c server.js`
- Server starts without errors: `npm start`

---

### 📋 Phase 4 Completion Checklist

- [ ] Dropbox integration investigated
- [ ] `createSharedLink()` function added to `dropbox-service.js`
- [ ] Email service imported in `server.js`
- [ ] Email logic added after pipeline success (line ~1338)
- [ ] Server starts without errors
- [ ] No syntax errors

**Phase 4 Complete! ✅**

---

## Phase 5: Testing (2-3 hours)

**Goal:** Test complete workflow end-to-end

### ✅ Checkpoint 5.1: Local Testing Setup

**Prerequisites:**
- [ ] Node.js server running (`npm start`)
- [ ] Python API running (Docmosis pipeline)
- [ ] PostgreSQL database running
- [ ] `.env` configured with SendGrid API key

**Start Services:**
```bash
# Terminal 1: Start Node.js server
npm start

# Terminal 2: Start Python API (if not already running)
cd api
uvicorn main:app --reload --port 8000

# Terminal 3: Check database
psql -U ryanhaines -d legal_forms_db -c "SELECT COUNT(*) FROM cases;"
```

**Verification:**
- Node.js server: http://localhost:3000
- Python API: http://localhost:8000
- Database accessible

---

### ✅ Checkpoint 5.2: Test Scenario 1 - Happy Path

**Goal:** Submit form with email, verify email sent

**Steps:**

1. **Open form in browser:**
   ```
   http://localhost:3000?token=YOUR_AUTH_TOKEN
   ```

2. **Fill out form completely:**
   - Add at least one plaintiff
   - Fill in property address (e.g., "123 Test Street")
   - Select some issues

3. **Submit form:**
   - Click "Submit Form"
   - Review screen appears
   - Click "Confirm & Submit"

4. **Email modal appears:**
   - Enter your test email address
   - Enter your name
   - Click "Email & Submit"

5. **Wait for pipeline:**
   - Form resets immediately
   - Watch terminal for logs
   - Pipeline should complete in 2-5 minutes

6. **Check logs for email:**
   ```
   Look for these log lines:
   📧 Preparing email notification for: your@email.com
   📍 Property address: 123 Test Street
   ✅ Email notification sent successfully
   ```

7. **Check email inbox:**
   - Check inbox (and spam folder!)
   - Verify email received
   - Verify subject: "123 Test Street - Discover Forms Generated"
   - Verify body includes street address
   - Click Dropbox link (if present)

**Expected Result:**
- ✅ Form submitted successfully
- ✅ Email sent
- ✅ Email received
- ✅ Subject line correct
- ✅ Street address matches form
- ✅ Dropbox link works (if Dropbox enabled)

**⚠️ If email not received:**
- Check spam folder
- Check server logs for errors
- Verify SendGrid API key
- Check SendGrid dashboard for delivery status

---

### ✅ Checkpoint 5.3: Test Scenario 2 - Email Opt-Out

**Goal:** Submit form without email, verify NO email sent

**Steps:**

1. Fill out form completely
2. Email modal appears
3. **Click "Skip & Submit"** (don't enter email)
4. Wait for pipeline completion

**Expected Result:**
- ✅ Form submitted successfully
- ✅ Log shows: `ℹ️  Email notification skipped (user did not opt in)`
- ✅ NO email received

---

### ✅ Checkpoint 5.4: Test Scenario 3 - Invalid Email

**Goal:** Verify email validation works

**Steps:**

1. Fill out form
2. Email modal appears
3. Enter invalid email: `notanemail`
4. Click "Email & Submit"

**Expected Result:**
- ✅ Validation error appears
- ✅ Form does NOT submit
- ✅ User can fix email and retry

---

### ✅ Checkpoint 5.5: Test Scenario 4 - No Dropbox Link

**Goal:** Test graceful fallback when Dropbox unavailable

**Steps:**

1. Disable Dropbox in `.env`:
   ```env
   DROPBOX_ENABLED=false
   ```

2. Restart server

3. Submit form with email

4. Wait for pipeline completion

5. Check email received

**Expected Result:**
- ✅ Email received
- ✅ No broken Dropbox link
- ✅ Professional fallback message:
  ```
  Your documents have been prepared and are ready for delivery.
  Please contact our office to arrange document pickup or delivery.
  ```

---

### ✅ Checkpoint 5.6: Test Email Rendering

**Goal:** Verify email looks good in different clients

**Test Clients:**
1. Gmail (desktop)
2. Gmail (mobile app)
3. Outlook (if available)
4. Apple Mail (if available)

**Checklist:**
- [ ] Professional appearance
- [ ] Lipton Legal branding visible
- [ ] Text readable
- [ ] Button clickable
- [ ] Dropbox link works
- [ ] No broken images
- [ ] Responsive on mobile

---

### ✅ Checkpoint 5.7: Performance Testing

**Goal:** Verify email doesn't slow down form submission

**Steps:**

1. Submit form with email
2. Measure time until form resets
3. Check if response is immediate (non-blocking)

**Expected Result:**
- ✅ Form resets immediately (~1-2 seconds)
- ✅ Email sending happens in background
- ✅ No delay waiting for email

---

### 📋 Phase 5 Completion Checklist

**Test Scenarios:**
- [ ] Happy path: Email sent successfully
- [ ] Opt-out: No email sent
- [ ] Invalid email: Validation error
- [ ] No Dropbox: Fallback message
- [ ] Email rendering: Looks good in all clients
- [ ] Performance: Non-blocking submission

**Email Verification:**
- [ ] Subject line correct format
- [ ] Street address matches form
- [ ] Dropbox link works (when enabled)
- [ ] Professional appearance
- [ ] Mobile-friendly

**Error Handling:**
- [ ] Invalid API key: Logs error, doesn't crash
- [ ] Network failure: Retries 3 times
- [ ] Dropbox failure: Sends without link

**Phase 5 Complete! ✅**

---

## Phase 6: GCP Deployment (1-2 hours)

**Goal:** Deploy to GCP Cloud Run with environment variables

### ✅ Checkpoint 6.1: Prepare for Deployment

**Task:** Verify all files ready for deployment

**Files to commit:**
- [ ] `email-service.js` (new)
- [ ] `email-templates.js` (new)
- [ ] `server.js` (modified - email logic added)
- [ ] `index.html` (modified - email input enabled, button text changed)
- [ ] `dropbox-service.js` (modified - createSharedLink added)
- [ ] `package.json` (modified - @sendgrid/mail added)
- [ ] `package-lock.json` (updated)
- [ ] `.env.example` (modified - email config added)

**Files NOT to commit:**
- [ ] `.env` (contains secrets!)
- [ ] `test-email-service.js` (temporary test file)

**Verification:**
```bash
# Check what will be committed
git status

# Review changes
git diff

# Ensure .env is not tracked
git ls-files | grep "\.env$"
# Should return nothing
```

---

### ✅ Checkpoint 6.2: Create GCP Secret for SendGrid API Key

**Task:** Store SendGrid API key in GCP Secret Manager

**Option 1: Via gcloud CLI (Recommended)**

```bash
# Create secret
echo -n "SG.your-actual-sendgrid-api-key" | \
  gcloud secrets create sendgrid-api-key \
    --project=docmosis-tornado \
    --data-file=-

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding sendgrid-api-key \
  --project=docmosis-tornado \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify secret created
gcloud secrets list --project=docmosis-tornado
```

**Option 2: Via GCP Console**

1. Go to [GCP Console → Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Click **"Create Secret"**
3. Settings:
   - Name: `sendgrid-api-key`
   - Secret value: Paste your SendGrid API key
   - Regions: Automatic
4. Click **"Create Secret"**
5. Grant access to Cloud Run service account

**Verification:**
```bash
# Test accessing secret
gcloud secrets versions access latest --secret=sendgrid-api-key --project=docmosis-tornado
# Should output: SG.xxxxx...
```

---

### ✅ Checkpoint 6.3: Update Cloud Run Service Configuration

**Task:** Add email environment variables to Cloud Run

**Option 1: Via GCP Console**

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click service: `node-server`
3. Click **"Edit & Deploy New Revision"**
4. Go to **"Variables & Secrets"** tab
5. Add environment variables:

   **Environment Variables:**
   - `EMAIL_PROVIDER` = `sendgrid`
   - `EMAIL_FROM_ADDRESS` = `notifications@liptonlegal.com`
   - `EMAIL_FROM_NAME` = `Lipton Legal`
   - `EMAIL_ENABLED` = `true`
   - `EMAIL_MAX_RETRIES` = `3`
   - `EMAIL_RETRY_DELAY_MS` = `1000`

   **Secrets (Reference):**
   - `SENDGRID_API_KEY` → Reference secret `sendgrid-api-key:latest`

6. Click **"Deploy"**

**Option 2: Via gcloud CLI**

```bash
gcloud run services update node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --set-env-vars="EMAIL_PROVIDER=sendgrid,EMAIL_ENABLED=true,EMAIL_FROM_ADDRESS=notifications@liptonlegal.com,EMAIL_FROM_NAME=Lipton Legal,EMAIL_MAX_RETRIES=3,EMAIL_RETRY_DELAY_MS=1000" \
  --update-secrets="SENDGRID_API_KEY=sendgrid-api-key:latest"
```

**Verification:**
```bash
# Check current environment variables
gcloud run services describe node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

---

### ✅ Checkpoint 6.4: Deploy Code to Cloud Run

**Task:** Deploy updated code with email feature

**Steps:**

1. **Commit changes:**
   ```bash
   git add email-service.js email-templates.js
   git add server.js index.html package.json package-lock.json
   git add dropbox-service.js .env.example

   git commit -m "feat: add email notification feature

   - Add SendGrid email service with retry logic
   - Add professional HTML email templates
   - Enable email input in frontend modal
   - Update button text to 'Email & Submit'
   - Integrate email sending after pipeline completion
   - Add Dropbox shared link generation
   - Configure email environment variables

   Closes #[ticket-number]"
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy node-server \
     --project=docmosis-tornado \
     --region=us-central1 \
     --source . \
     --allow-unauthenticated
   ```

3. **Wait for deployment:**
   ```
   Deploying... (this may take a few minutes)
   ✓ Deploying new service... Done.
   ✓ Creating Revision... Done.
   ✓ Routing traffic... Done.
   Service URL: https://node-server-zyiwmzwenq-uc.a.run.app
   ```

**Verification:**
```bash
# Check deployment status
gcloud run services describe node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --format="value(status.conditions[0].status)"
# Should output: True
```

---

### ✅ Checkpoint 6.5: Production Testing

**Task:** Test email feature in production

**Steps:**

1. **Open production form:**
   ```
   https://node-server-zyiwmzwenq-uc.a.run.app?token=YOUR_TOKEN
   ```

2. **Submit test form with email:**
   - Fill out completely
   - Enter your email
   - Click "Email & Submit"

3. **Monitor Cloud Run logs:**
   ```bash
   # Stream logs in real-time
   gcloud run services logs read node-server \
     --project=docmosis-tornado \
     --region=us-central1 \
     --limit=50 \
     --follow

   # Filter for email logs
   gcloud run services logs read node-server \
     --project=docmosis-tornado \
     --region=us-central1 \
     --limit=100 | grep "📧\|Email"
   ```

4. **Wait for email:**
   - Pipeline completes in 2-5 minutes
   - Check inbox (and spam)
   - Verify email received

5. **Verify email content:**
   - Subject line correct
   - Street address correct
   - Dropbox link works (if enabled)
   - Professional formatting

**Expected Production Logs:**
```
📧 Preparing email notification for: your@email.com
📍 Property address: 123 Main Street
📁 Checking Dropbox folder: /Apps/LegalFormApp/123 Main Street
✅ Dropbox link generated successfully
✅ Email notification sent successfully to your@email.com
```

**⚠️ If production test fails:**
- Check Cloud Run logs for errors
- Verify environment variables configured
- Check SendGrid dashboard for delivery status
- Verify secret mounted correctly

---

### 📋 Phase 6 Completion Checklist

**Pre-Deployment:**
- [ ] All files ready to commit
- [ ] `.env` not tracked by git
- [ ] Changes reviewed

**GCP Configuration:**
- [ ] SendGrid API key stored in Secret Manager
- [ ] Cloud Run environment variables configured
- [ ] Secret reference added to Cloud Run
- [ ] Service account has secret access

**Deployment:**
- [ ] Code committed to git
- [ ] Deployed to Cloud Run
- [ ] Deployment successful (green status)
- [ ] No errors in Cloud Run logs

**Production Testing:**
- [ ] Form accessible in production
- [ ] Email input enabled
- [ ] Button text correct
- [ ] Email sent successfully
- [ ] Email received in inbox
- [ ] Email content correct
- [ ] Dropbox link works

**Phase 6 Complete! 🎉**

---

## 🎉 Implementation Complete!

### Final Verification Checklist

**Frontend:**
- [x] Email input enabled
- [x] Button text: "Email & Submit"
- [x] Email validation working

**Backend:**
- [x] SendGrid service created
- [x] Email templates created
- [x] Email logic integrated
- [x] Dropbox shared links working

**Testing:**
- [x] Local testing passed
- [x] Production testing passed
- [x] Email delivery confirmed
- [x] Error handling verified

**Deployment:**
- [x] Deployed to GCP Cloud Run
- [x] Environment variables configured
- [x] Secrets secured
- [x] Logs clean

### Success Metrics

Monitor these metrics post-launch:

**Email Delivery:**
- [ ] 90%+ delivery rate
- [ ] < 5% bounce rate
- [ ] < 1% spam complaints

**Performance:**
- [ ] Form submission time < 2 seconds
- [ ] Email sent within 5 minutes of completion
- [ ] Zero pipeline failures due to email

**User Experience:**
- [ ] Users receiving emails
- [ ] Dropbox links working
- [ ] Positive feedback

---

## 📊 Monitoring & Maintenance

### How to Monitor Emails

**Check SendGrid Dashboard:**
1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Click **"Activity Feed"**
3. View recent emails sent
4. Check delivery status
5. Review bounce/spam reports

**Check Cloud Run Logs:**
```bash
# View email-related logs
gcloud run services logs read node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --limit=100 | grep "📧\|Email"

# Check for errors
gcloud run services logs read node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --limit=100 | grep "❌.*[Ee]mail"
```

**Check Prometheus Metrics:**
```bash
# Access metrics endpoint
curl https://node-server-zyiwmzwenq-uc.a.run.app/metrics | grep email
```

---

### Troubleshooting Commands

**Quick diagnostics:**
```bash
# 1. Check if email service is enabled
gcloud run services describe node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env[name=EMAIL_ENABLED].value)"

# 2. Check if secret is mounted
gcloud run services describe node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env[].valueFrom)"

# 3. Test secret access
gcloud secrets versions access latest \
  --secret=sendgrid-api-key \
  --project=docmosis-tornado

# 4. Check recent logs
gcloud run services logs read node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --limit=50
```

---

### Emergency Disable

If emails causing issues, quickly disable without code changes:

```bash
# Disable via environment variable
gcloud run services update node-server \
  --project=docmosis-tornado \
  --region=us-central1 \
  --set-env-vars="EMAIL_ENABLED=false"
```

This will:
- ✅ Keep email collection working
- ✅ Store emails in database
- ✅ Skip sending emails
- ✅ No code rollback needed

---

## 📝 Post-Implementation Tasks

### Documentation

- [ ] Update project README with email feature
- [ ] Document SendGrid setup for future maintainers
- [ ] Add troubleshooting guide to docs
- [ ] Document environment variables

### Future Enhancements

**Priority 1 (Next Sprint):**
- [ ] Add email delivery tracking table
- [ ] Implement failure email notifications
- [ ] Add email metrics dashboard

**Priority 2 (Later):**
- [ ] Multiple email templates
- [ ] Unsubscribe functionality
- [ ] Email scheduling/queuing
- [ ] Multi-language support

---

## 🎯 Success!

You've successfully implemented the email notification feature! 🎉

**Key Achievements:**
- ✅ Email notifications sent after document generation
- ✅ Professional HTML email templates
- ✅ Dropbox shared links included
- ✅ Graceful fallback when Dropbox unavailable
- ✅ Non-blocking email sending
- ✅ Deployed to GCP Cloud Run
- ✅ Comprehensive error handling

**Users can now:**
- Opt in to email notifications
- Receive emails when documents ready
- Click Dropbox link to access documents
- Get professional, branded communications

---

**END OF PHASED EXECUTION GUIDE**

For detailed specifications, refer to: `EMAIL_NOTIFICATION_IMPLEMENTATION_PLAN.md`
