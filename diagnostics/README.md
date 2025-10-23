# SSE Connection Issues - Diagnostic Test Suite

## 🎯 Quick Start

**Option 1: Use the Interactive Guide**
```bash
open diagnostics/quick-start.html
```
Then click buttons to copy test scripts.

**Option 2: Manual Testing**
1. Read [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) for detailed instructions
2. Copy test scripts into browser console
3. Run report functions to collect results

**Option 3: Read Analysis First**
Start with [DIAGNOSTIC_SUMMARY.md](./DIAGNOSTIC_SUMMARY.md) to understand the problems.

---

## 📂 Files

| File | Purpose |
|------|---------|
| `quick-start.html` | Interactive guide (recommended start point) |
| `RUN_ALL_TESTS.md` | Complete testing instructions with examples |
| `DIAGNOSTIC_SUMMARY.md` | Problem analysis and expected fixes |
| `test-sse-reconnect-race.js` | Diagnose reconnection loop issue |
| `test-503-handling.js` | Diagnose 503 error handling |
| `test-progress-state-undefined.js` | Diagnose undefined progress values |
| `test-submit-handler-timing.js` | Diagnose handler attachment timing |

---

## 🐛 Issues Being Diagnosed

### Issue 1: SSE Reconnection Loop
**Symptom:** Repeating "connection opened → job completed → connection closed" pattern

**Test:** `test-sse-reconnect-race.js`

**Report:** `getTestReport()`

---

### Issue 2: 503 Service Unavailable
**Symptom:** Transient 503 errors during reconnection attempts

**Test:** `test-503-handling.js`

**Report:** `get503Report()` + `getReconnectTimings()`

---

### Issue 3: Progress State undefined/undefined
**Symptom:** Logs show "Saved job state: undefined/undefined"

**Test:** `test-progress-state-undefined.js`

**Report:** `getProgressStateReport()` + `inspectJobStates()`

---

### Issue 4: Submit Handler Not Detected
**Symptom:** Debug shows `submitBtnHandlerAttached: false` but submission works

**Test:** `test-submit-handler-timing.js`

**Report:** `getSubmitHandlerReport()`

---

## 🚀 Usage Example

### Step 1: Open Application
Navigate to your deployed Cloud Run app in Chrome/Firefox.

### Step 2: Open Console
Press `F12` → Console tab

### Step 3: Load Test
```javascript
// Copy contents of test-sse-reconnect-race.js
// Paste into console
// Press Enter
```

### Step 4: Trigger Behavior
Submit a form to trigger SSE connection.

### Step 5: Collect Report
```javascript
getTestReport()
```

### Step 6: Share Results
Copy the console output and share for analysis.

---

## 📊 What to Report

For each test, provide:

1. **Console Output** - All log messages (with timestamps)
2. **Report Output** - Result from report function
3. **Screenshots** - Network tab + Console
4. **Timing** - How long behaviors occur, repeat counts

See [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) for detailed reporting format.

---

## 🔧 Expected Outcomes

After running diagnostics, you'll receive:

- ✅ Confirmation of which issues are present
- ✅ Root cause identification
- ✅ Targeted code fixes
- ✅ Recommended deployment strategy

---

## 💡 Tips

- **Run tests individually** - Don't load multiple tests at once
- **Reload between tests** - Ensure clean state
- **Use incognito mode** - Avoid cached JavaScript issues
- **Check file paths** - Tests load from `diagnostics/` directory

---

## ❓ Troubleshooting

**Scripts won't load?**
→ Open .js files manually and copy contents

**No output in console?**
→ Check console filter settings (show all messages)

**Tests interfere with each other?**
→ Reload page between tests

**Can't find report functions?**
→ Ensure test script loaded successfully (check for "✅ diagnostic test ready" message)

---

## 📞 Support

If you need help:
1. Check [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) for detailed instructions
2. Review [DIAGNOSTIC_SUMMARY.md](./DIAGNOSTIC_SUMMARY.md) for context
3. Share your console output for analysis

---

## 🎓 Understanding the Tests

Each test uses **method interception** to monitor behavior without modifying source code:

- **EventSource tracking** - Counts instances and lifecycle
- **Function wrapping** - Logs parameters and timing
- **Event monitoring** - Captures SSE events and errors
- **State inspection** - Examines localStorage and DOM

This non-invasive approach lets you diagnose production issues safely.

---

**Ready to diagnose? Start with [quick-start.html](./quick-start.html)! 🔬**
