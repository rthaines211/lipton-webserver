# Phase 2 Password Authentication - Testing Guide

## ✅ Password Protection Implemented

Both forms are now password-protected with session-based authentication.

---

## Testing the Password Protection

### Test 1: Access Without Password

**Open browser:** http://localhost:3000/forms/docs/

**Expected Result:**
- ✅ Login page displays
- ✅ Shows "Document Generation Portal - Login"
- ✅ Has password input field
- ✅ Has "Access Form" button

### Test 2: Wrong Password

**Steps:**
1. Enter wrong password (e.g., "test123")
2. Click "Access Form"

**Expected Result:**
- ✅ Error message: "⚠️ Incorrect password. Please try again."
- ✅ Still shows login page

### Test 3: Correct Password

**Default Passwords (from .env):**
- **Docs Form**: `lipton-docs-2025`
- **Agreement Form**: `lipton-agreement-2025`

**Steps:**
1. Enter correct password: `lipton-docs-2025`
2. Click "Access Form"

**Expected Result:**
- ✅ Redirects to form
- ✅ Form loads successfully
- ✅ Logo and form elements visible

### Test 4: Session Persistence

**Steps:**
1. After logging in successfully
2. Refresh the page (F5 or Cmd+R)

**Expected Result:**
- ✅ Form still accessible (no login page)
- ✅ Session remembered for 24 hours

### Test 5: Logout

**Test logout functionality:**

Visit: http://localhost:3000/forms/docs/logout

**Expected Result:**
- ✅ Session cleared
- ✅ Redirected to login page
- ✅ Must enter password again to access form

### Test 6: Static Resources Load

**After logging in, check Developer Tools (F12) → Network tab:**

**Expected:**
- ✅ `/forms/shared/js/sse-client.js` - Status 200
- ✅ `/forms/shared/images/logo.png` - Status 200
- ✅ `/forms/docs/styles.css` - Status 200
- ✅ No 401 errors for static files

---

## Current Configuration

### Passwords (can be changed in .env)

```bash
# Document Generation Form
DOCS_FORM_PASSWORD=lipton-docs-2025

# Contingency Agreement Form
AGREEMENT_FORM_PASSWORD=lipton-agreement-2025

# Session Secret (auto-generated)
SESSION_SECRET=[random string]
```

### Session Settings

- **Duration**: 24 hours
- **Type**: HTTP-only cookie (secure)
- **Secure**: HTTPS only in production
- **SameSite**: Strict (CSRF protection)

---

## Command-Line Tests

### Test 1: Verify Login Page Shows
```bash
curl -s http://localhost:3000/forms/docs/ | grep -i "login"
```
**Expected:** Should contain "login" text

### Test 2: Test Wrong Password
```bash
curl -s -X POST -d "password=wrongpassword" http://localhost:3000/forms/docs/ | grep "Incorrect"
```
**Expected:** "⚠️ Incorrect password"

### Test 3: Test Static Files Are Accessible After Auth
```bash
# This should work (static files bypass auth)
curl -I http://localhost:3000/forms/shared/images/logo.png
```
**Expected:** HTTP 200

---

## Features Implemented

### ✅ Password Protection
- Separate passwords for each form
- Session-based authentication
- 24-hour session duration

### ✅ Security Features
- HTTP-only cookies (XSS protection)
- HTTPS-only in production
- Static files bypass auth (images, CSS, JS)
- Failed login attempts logged

### ✅ User Experience
- Professional login page design
- Lipton Legal branding
- Clear error messages
- Smooth redirects
- Session persistence (no re-login needed)

### ✅ Logout Functionality
- `/forms/docs/logout` - Logout from docs form
- `/forms/agreement/logout` - Logout from agreement form

---

## What's Protected

### ✅ Protected (Requires Password):
- `/forms/docs/` - Document generation form
- `/forms/docs/index.html` - Form HTML page
- `/forms/agreement/` - Contingency agreement form (future)

### ✅ Not Protected (Public Access):
- `/forms/shared/js/*` - Shared JavaScript files
- `/forms/shared/css/*` - Shared CSS files
- `/forms/shared/images/*` - Logos and images
- `/health` - Health check endpoint
- `/metrics` - Metrics endpoint

---

## Production Deployment Notes

### Before Deploying:

1. **Change Passwords** in production .env:
   ```bash
   DOCS_FORM_PASSWORD=<strong-random-password>
   AGREEMENT_FORM_PASSWORD=<different-strong-password>
   SESSION_SECRET=<random-32-character-string>
   ```

2. **Generate Strong Session Secret**:
   ```bash
   openssl rand -base64 32
   ```

3. **Update Cloud Secrets** (Google Secret Manager):
   ```bash
   echo -n "your-strong-password" | gcloud secrets create DOCS_FORM_PASSWORD --data-file=-
   echo -n "your-strong-password" | gcloud secrets create AGREEMENT_FORM_PASSWORD --data-file=-
   echo -n "$(openssl rand -base64 32)" | gcloud secrets create SESSION_SECRET --data-file=-
   ```

---

## Troubleshooting

### Issue: Can't access form after entering password
**Solution:** Check server logs for errors
```bash
tail -f /tmp/server-phase2-test.log
```

### Issue: Session not persisting
**Solution:**
- Check `SESSION_SECRET` is set in .env
- Verify cookies are enabled in browser

### Issue: Static files showing login page
**Solution:** This shouldn't happen - static files (.js, .css, .png) should bypass auth. Check middleware order in server.js.

### Issue: Forgot password
**Solution:** Passwords are in `.env` file:
```bash
grep "FORM_PASSWORD" .env
```

---

## Manual Browser Test Checklist

- [ ] Open http://localhost:3000/forms/docs/
- [ ] Login page displays
- [ ] Try wrong password → see error
- [ ] Try correct password → access form
- [ ] Refresh page → still logged in
- [ ] Logo displays correctly
- [ ] Form works (add plaintiff, defendant)
- [ ] Visit `/logout` → redirected to login
- [ ] Must login again to access

---

**Status:** ✅ Ready for testing
**Last Updated:** 2026-01-13
**Phase:** 2 of 9
