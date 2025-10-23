# Static Asset Authentication Fix

**Date:** 2025-10-22
**Status:** ✅ Fixed
**Deployment Script:** `deploy-static-asset-fix.sh`

---

## Problem Summary

### Symptoms
When accessing the deployed application at `https://node-server-zyiwmzwenq-uc.a.run.app/?token=...`, the following errors appeared in the browser console:

```
GET https://node-server-zyiwmzwenq-uc.a.run.app/logo.png 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/js/progress-state.js?v=2 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/js/toast-notifications.js?v=3 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/js/sse-client.js?v=3 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/js/sse-manager.js?v=1 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/js/form-submission.js?v=8 401 (Unauthorized)
GET https://node-server-zyiwmzwenq-uc.a.run.app/favicon.ico 401 (Unauthorized)
```

### Root Cause
The authentication middleware (`requireAuth()` function in `server.js`) was blocking **all requests** including static assets:

```javascript
// Before fix - Line 455-458
app.use(requireAuth);  // Applied to ALL routes
app.use(express.static(__dirname));  // Static files served AFTER auth
```

**Why this caused the issue:**
1. Initial page load with `?token=xxx` was authenticated ✅
2. Browser then requests JavaScript files, images, and CSS
3. These subsequent requests **don't include the token parameter** ❌
4. Authentication middleware blocks them with 401 Unauthorized ❌

---

## Solution

### Code Changes

Modified the `requireAuth()` middleware function in `server.js` (lines 89-156) to skip authentication for static file extensions:

```javascript
// Skip auth for static assets (JS, CSS, images, fonts, etc.)
// These files contain no sensitive data and are needed for the browser to render the page
const staticFileExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.map'
];
const isStaticFile = staticFileExtensions.some(ext => req.path.toLowerCase().endsWith(ext));

if (isStaticFile) {
    logger.debug('Static asset request bypassing auth', {
        path: req.path,
        ip: req.ip
    });
    return next();
}
```

### Security Considerations

**✅ Safe to bypass authentication for static assets because:**
1. **No sensitive data:** Static files (JS, CSS, images) contain application code, not user data
2. **Required for functionality:** Browser needs these files to render and run the application
3. **API routes still protected:** All `/api/*` routes still require authentication
4. **Standard practice:** This is the industry-standard approach for web applications

**🔒 Authentication still enforced on:**
- HTML pages (require `?token=xxx` in URL)
- All API endpoints (`/api/*`)
- Database operations
- Server-side actions

---

## Deployment

### Prerequisites
- `gcloud` CLI installed and authenticated
- Access to `docmosis-tornado` GCP project
- Existing `node-server` Cloud Run service

### Deploy the Fix

```bash
./deploy-static-asset-fix.sh
```

**What the script does:**
1. Shows summary of the issue and fix
2. Deploys updated code to Cloud Run
3. Verifies static assets now load without authentication
4. Confirms API routes still require authentication
5. Checks deployment logs

**Deployment time:** ~2-3 minutes

---

## Verification

### Test in Browser

1. **Open the application:**
   ```
   https://node-server-zyiwmzwenq-uc.a.run.app/?token=a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4
   ```

2. **Open Developer Tools (F12) → Console**
   - ✅ Should see NO 401 errors
   - ✅ JavaScript files should load successfully
   - ✅ Images should display
   - ✅ Form should be interactive

### Test via Command Line

```bash
SERVICE_URL="https://node-server-zyiwmzwenq-uc.a.run.app"
TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

# Test 1: Static JS file loads WITHOUT token (should return 200)
curl -I "${SERVICE_URL}/js/progress-state.js?v=2"

# Test 2: Static image loads WITHOUT token (should return 200)
curl -I "${SERVICE_URL}/logo.png"

# Test 3: API requires token (should return 401 without, 200 with token)
curl -I "${SERVICE_URL}/api/cases"
curl -I -H "Authorization: Bearer ${TOKEN}" "${SERVICE_URL}/api/cases"
```

**Expected results:**
- Static assets: `HTTP/2 200` ✅
- API without token: `HTTP/2 401` ✅
- API with token: `HTTP/2 200` ✅

---

## Technical Details

### Authentication Flow

**Before Fix:**
```
User Request → requireAuth() → 401 for everything without token
                    ↓
            express.static() (never reached)
```

**After Fix:**
```
User Request → requireAuth()
                    ↓
              ┌─────┴─────┐
              ↓           ↓
         Static file?   API/HTML?
              ↓           ↓
         Bypass auth  Check token
              ↓           ↓
         200 OK     401/200
```

### Protected vs Public Resources

| Resource Type | Authentication Required | Examples |
|--------------|------------------------|----------|
| HTML Pages | ✅ Yes | `/index.html`, `/form.html` |
| API Endpoints | ✅ Yes | `/api/cases`, `/api/form-entries` |
| JavaScript Files | ❌ No | `/js/*.js` |
| CSS Files | ❌ No | `/css/*.css` |
| Images | ❌ No | `/logo.png`, `*.jpg`, `*.svg` |
| Fonts | ❌ No | `*.woff`, `*.ttf` |
| Health Checks | ❌ No | `/health`, `/metrics` |

---

## Rollback Plan

If issues occur after deployment, rollback using:

```bash
# List recent revisions
gcloud run revisions list --service=node-server --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic node-server \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

Or restore from the backup:
```bash
cp server.js.backup server.js
./deploy-to-cloud-run.sh
```

---

## Related Files

- **Main server file:** `server.js` (lines 89-156)
- **Deployment script:** `deploy-static-asset-fix.sh`
- **General deployment:** `deploy-to-cloud-run.sh`
- **Documentation:** This file (`STATIC_ASSET_AUTH_FIX.md`)

---

## Lessons Learned

### Key Insights

1. **Middleware Order Matters:** The order of `app.use()` calls determines execution flow
2. **Token Propagation:** URL query parameters don't automatically pass to sub-resources
3. **Browser Behavior:** Each resource request (JS, CSS, images) is independent
4. **Static Asset Pattern:** Industry standard is to serve static assets without authentication

### Best Practices Applied

✅ **Path-based authentication:** Use file extensions to identify static assets
✅ **Explicit whitelisting:** Clear list of allowed extensions
✅ **Logging:** Debug logs for static asset requests
✅ **Documentation:** Inline comments explain the security decision
✅ **Testing:** Comprehensive verification of both static and protected routes

---

## Questions?

For issues or questions about this fix:
1. Check deployment logs: `gcloud run services logs read node-server --region=us-central1 --follow`
2. Review this documentation
3. Test locally before deploying: `NODE_ENV=development npm start`

---

**Fixed by:** Claude Code
**Last Updated:** 2025-10-22
