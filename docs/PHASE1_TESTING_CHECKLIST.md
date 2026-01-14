# Phase 1 Testing Checklist

## 🚀 Server Started Successfully
✅ Server running at http://localhost:3000
✅ Database connected
✅ Form redirects to `/forms/docs/`

---

## Testing Steps

### 1. Visual/UI Testing

**Open in browser:** http://localhost:3000

**What to check:**
- [ ] Form loads without errors
- [ ] Logo displays correctly (at top of form)
- [ ] Form styling looks correct (no broken CSS)
- [ ] All tabs visible: "Document Generation Form", "View Submissions"
- [ ] No console errors in browser DevTools (F12)

### 2. Basic Form Functionality

**Test adding plaintiffs/defendants:**
- [ ] Click "Add Plaintiff" - new plaintiff section appears
- [ ] Click "Add Defendant" - new defendant section appears
- [ ] Remove plaintiff/defendant - sections removed correctly
- [ ] Form validation works (required fields highlighted)

### 3. JavaScript Resources Loading

**Open browser DevTools (F12) → Network tab**
- [ ] Reload page and check:
  - `/forms/docs/index.html` - Status 200
  - `/forms/docs/styles.css` - Status 200
  - `/forms/shared/images/logo.png` - Status 200
  - `/forms/shared/js/sse-client.js` - Status 200
  - `/forms/shared/js/sse-manager.js` - Status 200
  - `/forms/shared/js/progress-state.js` - Status 200
  - `/forms/docs/js/form-submission.js` - Status 200

**All should return Status 200 (not 404)**

### 4. Form Submission Test

**Fill out a minimal form:**
1. Property Address: "123 Test St, Los Angeles, CA 90001"
2. Plaintiff 1:
   - First Name: "John"
   - Last Name: "Test"
   - Type: Individual
   - Age: Adult
   - Head of Household: No
3. Defendant 1:
   - First Name: "Jane"
   - Last Name: "Landlord"
   - Entity: Individual

**Submit the form:**
- [ ] Click "Submit Form"
- [ ] Confirmation modal appears
- [ ] Select at least one document type (e.g., "SROGs")
- [ ] Click "Confirm & Submit"
- [ ] Email notification modal appears
- [ ] Click "Skip" or enter email and submit

**Expected Results:**
- [ ] Form submits without errors
- [ ] Success message or progress modal appears
- [ ] Form resets to blank state

### 5. Database Check

**Check data was saved:**

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"

# Connect to database
psql -d legal_forms_db_dev

# Check if case was saved
SELECT id, property_address, created_at FROM cases ORDER BY created_at DESC LIMIT 1;

# Check plaintiffs were saved
SELECT full_name, party_type FROM parties ORDER BY id DESC LIMIT 5;

# Exit psql
\q
```

**Expected:**
- [ ] New case record exists
- [ ] Plaintiff and defendant records exist

### 6. JSON File Check

**Check JSON file was created:**

```bash
ls -lt data/ | head -5
```

**Expected:**
- [ ] New JSON file with today's timestamp exists
- [ ] File contains form data

### 7. Document Generation (Optional - if pipeline is running)

**If you have the Python pipeline running:**
- [ ] Progress modal shows generation steps
- [ ] Documents generate successfully
- [ ] Download links appear when complete

**If pipeline is NOT running:**
- [ ] Form submits successfully anyway
- [ ] Error logged but form saves to database

---

## Common Issues & Solutions

### Issue: Form shows 404 error
**Solution:** Check server.js has correct path configuration
```javascript
app.use('/forms', express.static(path.join(__dirname, 'forms')));
```

### Issue: Logo doesn't load
**Solution:** Check path in index.html:
```html
<img src="../shared/images/logo.png" ...>
```

### Issue: JavaScript errors in console
**Solution:** Check script paths in index.html end of file:
```html
<script src="../shared/js/sse-client.js"></script>
```

### Issue: Form submission fails
**Solution:**
1. Check browser console for specific error
2. Check server logs: `tail -f /tmp/server-local-test.log`
3. Verify database is running: `psql -d legal_forms_db_dev -c "SELECT 1;"`

---

## Quick Test Commands

**Test form loads:**
```bash
curl -s http://localhost:3000/forms/docs/ | grep -i "title"
```
Expected: `<title>Lipton Legal - Legal Forms Portal</title>`

**Test shared resources load:**
```bash
curl -I http://localhost:3000/forms/shared/js/sse-client.js
```
Expected: `HTTP/1.1 200 OK`

**Test API is accessible:**
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok",...}`

---

## Manual Browser Testing Steps

### Quick 5-Minute Test

1. **Open:** http://localhost:3000
2. **Check:** Form loads, logo shows, no errors in console (F12)
3. **Fill minimal form:**
   - Property: "123 Test St"
   - 1 Plaintiff: John Test
   - 1 Defendant: Jane Landlord
4. **Submit:** Select SROGs, confirm, skip email
5. **Verify:** Success message or progress modal shows
6. **Check database:** See "Common database check" below

### Full Testing (15-20 minutes)

Complete all checklist items above for comprehensive verification.

---

## Stopping the Server

When done testing:
```bash
# Find and kill the server process
lsof -ti:3000 | xargs kill -9
```

---

## What to Look For

### ✅ Everything Working If:
- Form loads at http://localhost:3000
- No 404 errors in browser Network tab
- Form submission completes successfully
- Database record created
- JSON file saved in `data/` directory

### ⚠️ Something Wrong If:
- 404 errors in browser console/network tab
- Form doesn't load or shows blank page
- JavaScript errors in console
- Form submission fails with error
- No database record created

---

## Next Steps After Testing

### If Everything Works:
✅ Great! Safe to proceed to Phase 2 (Password Authentication)

### If Issues Found:
1. Note the specific error messages
2. Check which test failed
3. We can debug and fix before continuing

---

**Test Status:** Ready to test
**Last Updated:** 2026-01-13
