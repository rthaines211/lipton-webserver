# Testing the Submission Progress Modal

## Quick Test Steps

### 1. Refresh the Browser Page

Open http://localhost:3000?token=a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4

**Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) to hard refresh and clear cache.**

### 2. Open Browser Console

Press `F12` or right-click → Inspect → Console tab

### 3. Fill Out Form

- **Property Address**: Test Property 123
- **City**: Los Angeles
- **State**: CA
- **ZIP**: 90001
- **Filing City**: Los Angeles
- **Filing County**: Los Angeles

**Plaintiff**:
- First Name: John
- Last Name: Doe
- Type: Individual

**Defendant**:
- First Name: Jane
- Last Name: Smith
- Role: Owner

### 4. Submit Form

1. Click **"Submit Form"** button
2. Confirmation modal appears → Click **"I Confirm"**
3. Email modal appears → Click **"Skip & Submit"** OR enter email and click **"Email & Submit"**

### 5. What Should Happen

**✅ EXPECTED**: Submission Progress Modal appears showing:
- Header: "Generating Documents" with spinner icon
- Case Number: "Test Property 123"
- Plaintiff Name: "John Doe"
- Progress bar at 0%
- Status message: "Initializing document generation..."
- Button: "Processing..." (disabled)

**Progress updates**:
- Progress bar animates to 100%
- Messages update: "Saving form data..." → "Starting pipeline..." → "Processing documents..." → "✅ Documents generated successfully!"

**On completion**:
- Header changes to "Generation Completed" with check icon
- Button becomes green "Close" (enabled)
- Success notification toast appears

### 6. Check Browser Console

Look for these log messages:

```
📦 Server response: {...}
📍 Case submitted: 1762214...
🔍 Progress modal check: {pipelineEnabled: true, caseId: "...", createJobStreamExists: true}
🚀 Starting document generation tracking for case: ...
📊 Showing progress modal with data: {caseNumber: "Test Property 123", plaintiffName: "John Doe"}
📊 Submission progress modal opened for case: ...
Progress update: {percentage: 0, message: "..."}
Progress update: {percentage: 66, message: "..."}
✅ Document generation completed: {...}
```

---

## Troubleshooting

### Modal Doesn't Appear

**Check console for**:
1. `Submission progress modal not found` → HTML not loaded properly, refresh page
2. `createJobStream is not defined` → SSE client not loaded, check network tab
3. `pipelineEnabled: false` → Pipeline disabled, check .env file

**Verify in console**:
```javascript
// Check if modal exists
document.getElementById('submissionProgressModal')

// Check if SSE functions exist
typeof createJobStream
typeof window.sseManager

// Check pipeline config
// (Should see in console logs: "Pipeline Configuration: {enabled: true, executeOnSubmit: true}")
```

### Modal Appears But No Progress Updates

**Check console for SSE connection**:
- Look for: `Progress update: {...}` messages
- Should see updates every 1-2 seconds

**Check network tab**:
- Filter by "stream"
- Should see `GET /api/jobs/[caseId]/stream` with status `200` and type `eventsource`
- Click on it → "EventStream" tab → Should see `progress` events

### Progress Stuck at 0%

**Check Python pipeline**:
```bash
# Check if Python server is running
curl http://localhost:5001/health

# Check Python logs
cd "normalization work"
tail -f logs/*.log
```

**Check Node.js logs** (in terminal where `npm start` is running):
- Should see: `🚀 Starting document progress polling for case ...`
- Should see: `📊 Document progress: X/Y - Generating...`

---

## Debug Commands

### Browser Console

```javascript
// Check modal state
const modal = document.getElementById('submissionProgressModal');
console.log('Modal exists:', !!modal);
console.log('Modal visible:', modal?.classList.contains('show'));

// Check current job stream
console.log('Current job stream:', window.currentJobStream);

// Check SSE manager
console.log('Active connections:', window.sseManager?.activeConnections);

// Manually show modal (for testing)
showSubmissionProgress('test-123', {
    caseNumber: 'Test Case',
    plaintiffName: 'Test Plaintiff'
});

// Manually update progress (for testing)
updateSubmissionProgressUI(50, 'Testing progress bar...');
```

### Terminal - Check Servers Running

```bash
# Check Node.js server
lsof -ti:3000

# Check Python server
lsof -ti:5001

# View Node.js logs in real-time
# (Just watch the terminal where you ran npm start)

# View Python logs
cd "normalization work"
tail -f logs/app_*.log
```

---

## Expected Console Output

When everything works correctly, you should see this sequence:

```
1. Form validation
2. Confirmation modal shown
3. Email modal shown
4. 📦 Server response: {id: "...", dbCaseId: "...", pipelineEnabled: true}
5. 📍 Case submitted: 1762214...
6. 🔍 Progress modal check: {pipelineEnabled: true, ...}
7. 🚀 Starting document generation tracking for case: ...
8. 🧹 Cleaning up existing job stream (if any)
9. 📊 Showing progress modal with data: {...}
10. 📊 Submission progress modal opened for case: ...
11. Progress update: {percentage: 0, message: "Saving form data..."}
12. Progress update: {percentage: 66, message: "Generating..."}
13. ✅ Document generation completed: {...}
14. Modal shows "Generation Completed" with green Close button
```

---

## Files Changed

If modal still doesn't work, verify these files were updated:

1. **index.html** (lines 3326-3380) - Modal HTML
2. **index.html** (lines 1912-1937) - Modal CSS
3. **js/form-submission.js** (lines 311-415) - Modified handleSubmissionSuccess()
4. **js/form-submission.js** (lines 605-760) - New modal functions

**Verify changes**:
```bash
# Check if modal HTML exists
grep -n "submissionProgressModal" index.html

# Check if functions exist
grep -n "showSubmissionProgress" js/form-submission.js
grep -n "updateSubmissionProgressUI" js/form-submission.js
```

---

## Success Criteria

✅ Modal appears automatically after form submission
✅ Progress bar updates in real-time (0% → 100%)
✅ Status messages update during generation
✅ Completion shows green "Close" button
✅ Clicking "Close" resets the form
✅ No console errors

If all checkboxes pass → **Feature working perfectly!** 🎉

