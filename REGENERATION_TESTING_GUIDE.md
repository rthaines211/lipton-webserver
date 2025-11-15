# Document Regeneration Testing Guide

## Test Environment
- **Staging URL**: https://node-server-staging-zyiwmzwenq-uc.a.run.app
- **Auth Token**: `a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4`
- **Revision**: `node-server-staging-00021-mgs`
- **Deployed**: November 3, 2025

---

## Prerequisites

1. **Browser Access**: Open staging URL with auth token
   ```
   https://node-server-staging-zyiwmzwenq-uc.a.run.app?token=a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4
   ```

2. **Existing Case**: Need at least one case in the database to test regeneration

---

## Test Plan

### Phase 1: UI Verification

#### Test 1.1: Submissions List View
**Objective**: Verify regenerate button appears in submissions list

**Steps**:
1. Navigate to staging URL with auth token
2. Click "View Submissions" or navigate to submissions list
3. Look for blue regenerate button (🔄 icon) in the Actions column

**Expected Result**:
- ✅ Blue gradient regenerate button visible for each entry
- ✅ Button has refresh icon (fas fa-redo-alt)
- ✅ Button positioned next to edit/delete buttons

**Screenshot Location**: `Actions` column on right side of table

---

#### Test 1.2: Submission Details View
**Objective**: Verify regenerate button appears in submission modal

**Steps**:
1. From submissions list, click any entry to open details
2. Scroll to modal footer
3. Look for "Regenerate Documents" button

**Expected Result**:
- ✅ "Regenerate Documents" button visible in modal footer
- ✅ Blue gradient background styling
- ✅ Positioned between "Edit Submission" and "Close" buttons
- ✅ Has refresh icon (fas fa-redo-alt)

---

### Phase 2: Regeneration Modal Testing

#### Test 2.1: Open Regeneration Modal from List
**Objective**: Verify clicking regenerate button opens modal

**Steps**:
1. From submissions list, click regenerate button on any entry
2. Observe modal opening

**Expected Result**:
- ✅ Regeneration modal opens
- ✅ Submission detail modal closes (if open)
- ✅ Case information populated correctly:
  - Case Number
  - Case Title
  - Plaintiff Name

**Browser Console Check**:
```javascript
// Should see no errors
// Check if modal is visible
document.getElementById('regenerationModal').style.display === 'flex'
```

---

#### Test 2.2: Open Regeneration Modal from Details
**Objective**: Verify opening modal from submission details view

**Steps**:
1. Open any submission details (click entry from list)
2. Click "Regenerate Documents" button in modal footer
3. Observe modal transition

**Expected Result**:
- ✅ Submission modal closes
- ✅ Regeneration modal opens
- ✅ Case information correctly transferred
- ✅ No JavaScript errors in console

---

#### Test 2.3: Document Checkboxes Pre-selection
**Objective**: Verify checkboxes reflect original document selection

**Steps**:
1. Open regeneration modal for a case
2. Check which document types are pre-checked
3. Compare with original submission

**Expected Result**:
- ✅ Previously generated documents are pre-checked
- ✅ Three checkboxes visible:
  - ☑️ SROGs (Special Interrogatories)
  - ☑️ PODs (Production of Documents)
  - ☑️ Admissions (Requests for Admission)
- ✅ Checkboxes are enabled (not disabled)

**Browser Console Check**:
```javascript
// Check pre-selected values
const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]:checked');
Array.from(checkboxes).map(cb => cb.value);
// Should return array like: ['srogs', 'pods', 'admissions']
```

---

### Phase 3: Validation Testing

#### Test 3.1: No Documents Selected Error
**Objective**: Verify validation when no documents selected

**Steps**:
1. Open regeneration modal
2. Uncheck ALL document checkboxes
3. Click "Regenerate Selected Documents" button

**Expected Result**:
- ✅ Error message appears: "Please select at least one document type to regenerate"
- ✅ Error message styled in red
- ✅ Regeneration does NOT start
- ✅ No API call made (check Network tab)

---

#### Test 3.2: Error Message Clears on Selection
**Objective**: Verify error message disappears when selection made

**Steps**:
1. Trigger "no selection" error (from Test 3.1)
2. Check any document checkbox

**Expected Result**:
- ✅ Error message immediately disappears
- ✅ Regenerate button becomes enabled

---

### Phase 4: API Integration Testing

#### Test 4.1: Successful Regeneration
**Objective**: Verify complete regeneration flow

**Steps**:
1. Open regeneration modal
2. Select 2 document types (e.g., SROGs and PODs)
3. Click "Regenerate Selected Documents"
4. Observe progress tracking

**Expected Result**:
- ✅ Progress section becomes visible
- ✅ Progress bar starts animating
- ✅ Percentage shows "0%", then increases
- ✅ Status message updates: "Starting document regeneration..."
- ✅ Button changes to "Regenerating..." (disabled)
- ✅ Checkboxes become disabled

**Browser Network Tab**:
```
POST /api/regenerate-documents/{caseId}
Authorization: Bearer a0ae8df2...
Content-Type: application/json

Request Body:
{
  "documentTypes": ["srogs", "pods"]
}

Response:
{
  "success": true,
  "message": "Document regeneration started successfully",
  "caseId": "uuid-here",
  "jobId": "uuid-here",
  "documentTypes": ["srogs", "pods"]
}
```

---

#### Test 4.2: SSE Progress Tracking
**Objective**: Verify real-time progress updates via SSE

**Steps**:
1. Start regeneration (from Test 4.1)
2. Open Browser DevTools → Network tab
3. Filter for EventSource/SSE connections
4. Observe progress messages

**Expected Result**:
- ✅ SSE connection established to `/api/job-progress/{jobId}/stream`
- ✅ Progress events received with increasing percentages
- ✅ Progress bar width updates smoothly
- ✅ Status messages update:
  - "Processing SROGS..."
  - "Processing PODs..."
  - "Finalizing documents..."

**Browser Console Output**:
```javascript
// Should see SSE messages
[SSE] Connected to job stream: {jobId}
[SSE] Progress: 25% - Processing SROGS...
[SSE] Progress: 50% - Processing PODs...
[SSE] Progress: 100% - Complete!
```

---

#### Test 4.3: Completion Handling
**Objective**: Verify successful completion state

**Steps**:
1. Wait for regeneration to complete (from Test 4.1)
2. Observe final state

**Expected Result**:
- ✅ Progress bar reaches 100%
- ✅ Status message: "Documents regenerated successfully!"
- ✅ Button changes to "✓ Success!" (green background)
- ✅ Toast notification appears: "Documents regenerated successfully!"
- ✅ SSE connection closes
- ✅ Modal can be closed

**Browser Console Check**:
```javascript
// Check final state
const progressBar = document.querySelector('.progress-bar-fill');
progressBar.style.width === '100%'

const button = document.getElementById('regenerate-btn');
button.textContent.includes('Success')
```

---

### Phase 5: Error Handling Testing

#### Test 5.1: Invalid Auth Token
**Objective**: Verify handling of authentication errors

**Steps**:
1. Open browser console
2. Override auth token temporarily:
   ```javascript
   localStorage.setItem('authToken', 'invalid-token-123');
   ```
3. Try to regenerate documents

**Expected Result**:
- ✅ Error message displayed: "Authentication failed"
- ✅ Progress bar shows error state (red)
- ✅ Button re-enabled for retry
- ✅ Alert shown with error details

---

#### Test 5.2: Network Error
**Objective**: Verify handling of network failures

**Steps**:
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to regenerate documents

**Expected Result**:
- ✅ Error caught gracefully
- ✅ User-friendly error message shown
- ✅ Retry option available
- ✅ No JavaScript console errors

---

#### Test 5.3: Non-existent Case ID
**Objective**: Verify 404 error handling

**Steps**:
1. Open browser console
2. Call regeneration with fake ID:
   ```javascript
   showCaseForRegeneration('non-existent-id-12345', {
     caseNumber: 'TEST-404',
     caseTitle: 'Test v. 404',
     plaintiffName: 'Test User',
     documentTypesToGenerate: ['srogs']
   });
   ```
3. Try to regenerate

**Expected Result**:
- ✅ API returns 404 error
- ✅ Error message: "Case not found or has been deleted"
- ✅ Modal shows error state
- ✅ User can close modal

---

### Phase 6: Mobile Responsiveness

#### Test 6.1: Modal on Mobile
**Objective**: Verify responsive design on mobile devices

**Steps**:
1. Open DevTools → Toggle device toolbar
2. Select mobile device (e.g., iPhone 12 Pro)
3. Open regeneration modal

**Expected Result**:
- ✅ Modal fits screen width
- ✅ Case info card readable
- ✅ Checkboxes stack vertically
- ✅ Buttons appropriately sized
- ✅ Progress bar visible
- ✅ No horizontal scrolling

**Breakpoint**: 767px (defined in CSS)

---

#### Test 6.2: Touch Interactions
**Objective**: Verify touch-friendly interactions

**Steps**:
1. Use mobile device or mobile emulator
2. Tap checkboxes
3. Tap "Regenerate" button

**Expected Result**:
- ✅ Checkboxes easy to tap (adequate touch target size)
- ✅ Button tappable without mis-clicks
- ✅ No double-tap issues

---

### Phase 7: Database Verification

#### Test 7.1: Document Selection Update
**Objective**: Verify database records updated selection

**Prerequisites**: Access to Cloud SQL database

**Steps**:
1. Note original `document_types_to_generate` for a case
2. Regenerate with different selection (e.g., only SROGs)
3. Query database after regeneration

**SQL Query**:
```sql
SELECT
    id,
    case_number,
    document_types_to_generate,
    last_regenerated_at,
    regeneration_count
FROM cases
WHERE id = 'your-case-id-here';
```

**Expected Result**:
- ✅ `document_types_to_generate` updated to new selection: `["srogs"]`
- ✅ `last_regenerated_at` timestamp updated
- ✅ `regeneration_count` incremented by 1

**Note**: If migration not run, last two columns will be NULL (feature still works)

---

#### Test 7.2: Regeneration History Tracking
**Objective**: Verify regeneration history logged (if migration run)

**SQL Query**:
```sql
SELECT
    case_number,
    regeneration_history
FROM cases
WHERE regeneration_count > 0
ORDER BY last_regenerated_at DESC
LIMIT 5;
```

**Expected Result** (if migration run):
- ✅ `regeneration_history` contains JSONB array
- ✅ Each entry has timestamp and document types
- ✅ Format: `[{"timestamp": "2025-11-03T...", "types": ["srogs", "pods"]}]`

---

### Phase 8: Integration Testing

#### Test 8.1: End-to-End Flow
**Objective**: Complete user journey from list to regeneration

**Steps**:
1. Navigate to staging URL
2. Click "View Submissions"
3. Find a test case in the list
4. Click blue regenerate button
5. Verify case info in modal
6. Change document selection (check/uncheck)
7. Click "Regenerate Selected Documents"
8. Watch progress bar complete
9. Wait for success notification
10. Close modal

**Expected Duration**: ~30-60 seconds

**Expected Result**:
- ✅ Smooth flow with no errors
- ✅ All UI elements respond correctly
- ✅ Progress tracking works
- ✅ Documents regenerated in storage
- ✅ Can immediately regenerate again if needed

---

#### Test 8.2: Multiple Sequential Regenerations
**Objective**: Verify can regenerate same case multiple times

**Steps**:
1. Complete one full regeneration (Test 8.1)
2. Immediately click regenerate button again
3. Select different documents
4. Regenerate again

**Expected Result**:
- ✅ Second regeneration starts successfully
- ✅ No SSE connection conflicts
- ✅ Previous SSE connection properly closed
- ✅ `regeneration_count` increases correctly
- ✅ Latest selection overwrites previous

---

### Phase 9: Console Testing

#### Test 9.1: Test Helper Function
**Objective**: Verify browser console test function works

**Steps**:
1. Open browser console
2. Run test function:
   ```javascript
   testRegenerationModal();
   ```

**Expected Result**:
- ✅ Modal opens with test data
- ✅ Case info shows:
  - Case Number: CASE-2025-TEST-001
  - Case Title: Test Plaintiff v. Test Defendant
  - Plaintiff Name: John Test Doe
- ✅ SROGs and PODs pre-checked
- ✅ Admissions NOT checked

---

#### Test 9.2: Manual Console Test
**Objective**: Verify programmatic modal opening

**Steps**:
1. Get a real case ID from submissions list
2. Open console and run:
   ```javascript
   showCaseForRegeneration('your-real-case-id', {
     caseNumber: 'CASE-2025-001',
     caseTitle: 'Real Plaintiff v. Real Defendant',
     plaintiffName: 'Real User Name',
     documentTypesToGenerate: ['srogs', 'pods', 'admissions']
   });
   ```

**Expected Result**:
- ✅ Modal opens
- ✅ Real case ID stored in `currentCaseId`
- ✅ All case info populated correctly
- ✅ Can proceed with regeneration

---

## Test Results Checklist

### UI Components
- [ ] Regenerate button in submissions list
- [ ] Regenerate button in submission modal
- [ ] Regeneration modal opens from both locations
- [ ] Case information displays correctly
- [ ] Document checkboxes render properly
- [ ] Progress section hidden initially
- [ ] Modal closes properly

### Validation
- [ ] "No selection" error appears
- [ ] Error clears on selection
- [ ] Cannot submit without selection
- [ ] Cannot submit during regeneration

### API Integration
- [ ] POST `/api/regenerate-documents/:caseId` succeeds
- [ ] Correct request body sent
- [ ] Response contains `success: true`
- [ ] Response contains `jobId`
- [ ] Auth token validated

### SSE Progress
- [ ] SSE connection established
- [ ] Progress events received
- [ ] Progress bar updates
- [ ] Percentage increases
- [ ] Status messages update
- [ ] Connection closes on completion

### Completion
- [ ] 100% progress reached
- [ ] Success state displayed
- [ ] Toast notification shown
- [ ] Button re-enabled
- [ ] Can regenerate again

### Error Handling
- [ ] Invalid auth handled
- [ ] Network errors handled
- [ ] 404 errors handled
- [ ] User-friendly error messages
- [ ] Retry option available

### Mobile
- [ ] Modal responsive on mobile
- [ ] Touch interactions work
- [ ] No horizontal scroll
- [ ] Readable on small screens

### Database (Optional)
- [ ] `document_types_to_generate` updated
- [ ] `last_regenerated_at` timestamp set
- [ ] `regeneration_count` incremented
- [ ] `regeneration_history` logged (if migration run)

---

## Known Issues

### Issue 1: Migration Not Run
**Status**: Optional - feature works without it
**Impact**: Tracking columns (`last_regenerated_at`, `regeneration_count`, `regeneration_history`) will be NULL
**Workaround**: Code uses COALESCE for backwards compatibility

### Issue 2: No Case Navigation UI
**Status**: Future enhancement
**Impact**: Users must access regeneration via submissions list or direct console calls
**Workaround**: Use submissions list or test helper function

---

## Quick Test Command

**For Developers**: Run this in browser console after loading staging:

```javascript
// 1. Test modal opening
testRegenerationModal();

// 2. Verify dependencies
console.log({
  showCaseForRegeneration: typeof showCaseForRegeneration,
  closeRegenerationModal: typeof closeRegenerationModal,
  handleRegenerateDocuments: typeof handleRegenerateDocuments,
  createJobStream: typeof createJobStream
});

// 3. Check modal exists
console.log('Modal element:', document.getElementById('regenerationModal'));

// 4. Check auth token
console.log('Has token:', !!localStorage.getItem('authToken') || !!new URLSearchParams(window.location.search).get('token'));
```

**Expected Output**:
```javascript
{
  showCaseForRegeneration: "function",
  closeRegenerationModal: "function",
  handleRegenerateDocuments: "function",
  createJobStream: "function"
}
Modal element: <div id="regenerationModal">...</div>
Has token: true
```

---

## Troubleshooting

### Modal doesn't open
1. Check browser console for errors
2. Verify `js/document-regeneration.js` loaded
3. Check script tag in index.html
4. Verify modal element exists in DOM

### Progress not updating
1. Check SSE connection in Network tab
2. Verify `js/sse-client.js` loaded before `document-regeneration.js`
3. Check browser supports EventSource
4. Look for CORS errors

### API returns 401/403
1. Check auth token in URL or localStorage
2. Verify token matches `process.env.ACCESS_TOKEN`
3. Check Authorization header format: `Bearer {token}`

### Regeneration does nothing
1. Check `currentCaseId` is set (console: `window.currentCaseId`)
2. Verify case exists in database
3. Check Network tab for failed requests
4. Look for validation errors in console

---

## Support Resources

- **Implementation Plan**: `DOCUMENT_REGENERATION_IMPLEMENTATION_PLAN.md`
- **Feature Summary**: `REGENERATION_FEATURE_SUMMARY.md`
- **Migration SQL**: `database/migrate_add_regeneration_tracking.sql`
- **JavaScript Module**: `js/document-regeneration.js`

---

## Test Sign-off

**Tester Name**: ___________________________

**Test Date**: ___________________________

**Environment**: Staging (revision: node-server-staging-00021-mgs)

**Tests Passed**: ______ / 25

**Critical Issues Found**: ______

**Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Status**: ☐ PASS  ☐ PASS WITH ISSUES  ☐ FAIL

---

**End of Testing Guide**
